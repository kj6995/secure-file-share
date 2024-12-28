from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse, Http404
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import mimetypes
import os
import base64
import secrets

from .models import File, ShareableLink
from .serializers import FileSerializer, FileUploadSerializer
from .permissions import IsFileOwner

class FileViewSet(viewsets.ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated, IsFileOwner]
    http_method_names = ['get', 'post', 'patch', 'delete']
    
    def get_queryset(self):
        return File.objects.filter(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = FileUploadSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        file = serializer.save()
        
        response_serializer = FileSerializer(file)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        try:
            file = self.get_object()
            
            # Open the file in binary mode
            file_path = file.file.path
            if not os.path.exists(file_path):
                raise Http404("File not found")
            
            # Get the MIME type
            content_type, _ = mimetypes.guess_type(file.filename)
            if content_type is None:
                content_type = 'application/octet-stream'
            
            # Create the response with the file
            response = FileResponse(
                open(file_path, 'rb'),
                content_type=content_type,
                as_attachment=True,
                filename=file.filename
            )
            
            # Add the encryption key to the response headers
            try:
                # Try to decode the key to check if it's valid base64
                base64.b64decode(file.encryption_key)
                # If it's valid base64, use it as is
                key = file.encryption_key
            except:
                # If it's not valid base64, encode it
                key = base64.b64encode(file.encryption_key.encode()).decode()
            
            # Set the encryption key header
            response['x-encryption-key'] = key
            
            # Ensure CORS headers are set
            response['Access-Control-Expose-Headers'] = 'x-encryption-key'
            
            return response
            
        except File.DoesNotExist:
            raise Http404("File not found")
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='share')
    def generate_shareable_link(self, request, pk=None):
        """Generate a shareable link for a file"""
        file = self.get_object()
        
        # Validate request data
        if not all(k in request.data for k in ['permissions', 'expiresIn']):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        permissions = request.data['permissions']
        expires_in = int(request.data['expiresIn'])  # In hours
        guest_user_id = request.data.get('guestUserId')
        
        # Calculate expiration time
        expiration_time = timezone.now() + timedelta(hours=expires_in)
        
        # Generate a secure token
        token = secrets.token_urlsafe(32)
        
        try:
            # Create shareable link
            share_link = ShareableLink.objects.create(
                token=token,
                file=file,
                permissions=permissions,
                expires_at=expiration_time,
                created_by=request.user,
                guest_user_id=guest_user_id  # Django will handle the foreign key relationship
            )
            
            return Response({
                'token': token,
                'permissions': permissions,
                'expires_at': expiration_time.isoformat(),
                'created_at': share_link.created_at.isoformat(),
                'guest_user_id': guest_user_id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to create shareable link: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='shared-file')
    def shared_file(self, request):
        """Get shared file details with access validation"""
        token = request.query_params.get('token')
        if not token:
            return Response(
                {
                    'error': 'Access Denied',
                    'message': 'No token provided'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get share link with related file and owner data in a single query
            share_link = ShareableLink.objects.select_related(
                'file', 
                'file__owner',
                'guest_user'
            ).get(token=token)

            # Check if token is expired
            if share_link.expires_at < timezone.now():
                return Response(
                    {
                        'error': 'Access Denied',
                        'message': 'This link has expired'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check guest user access if specified
            if share_link.guest_user_id is not None:
                if not request.user.is_authenticated:
                    return Response(
                        {
                            'error': 'Access Denied',
                            'message': 'Authentication required for this link'
                        },
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                if request.user.id != share_link.guest_user_id:
                    return Response(
                        {
                            'error': 'Access Denied',
                            'message': 'This link is not shared with you'
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )

            # Return file metadata
            return Response({
                'filename': share_link.file.filename,
                'fileId': str(share_link.file.id),
                'mime_type': share_link.file.mime_type,
                'size': share_link.file.size,
                'shared_by': share_link.file.owner.email,
                'uploaded_at': share_link.file.uploaded_at.isoformat(),
                'permissions': share_link.permissions
            })

        except ShareableLink.DoesNotExist:
            return Response(
                {
                    'error': 'Access Denied',
                    'message': 'This link is invalid'
                },
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], url_path='shared-file/download')
    def download_shared_file(self, request):
        """Download a shared file with token validation"""
        token = request.query_params.get('token')
        if not token:
            return Response(
                {
                    'error': 'Access Denied',
                    'message': 'No token provided'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get share link with related file data in a single query
            share_link = ShareableLink.objects.select_related(
                'file', 
                'file__owner',
                'guest_user'
            ).get(token=token)

            # Check if token is expired
            if share_link.expires_at < timezone.now():
                return Response(
                    {
                        'error': 'Access Denied',
                        'message': 'This link has expired'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check guest user access if specified
            if share_link.guest_user_id is not None:
                if not request.user.is_authenticated:
                    return Response(
                        {
                            'error': 'Access Denied',
                            'message': 'Authentication required for this link'
                        },
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                if request.user.id != share_link.guest_user_id:
                    return Response(
                        {
                            'error': 'Access Denied',
                            'message': 'This link is not shared with you'
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )

            # Get the file
            file = share_link.file
            file_path = file.file.path
            
            if not os.path.exists(file_path):
                return Response(
                    {
                        'error': 'File Not Found',
                        'message': 'The file no longer exists'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get the MIME type
            content_type, _ = mimetypes.guess_type(file.filename)
            if content_type is None:
                content_type = 'application/octet-stream'
            
            # Create the response with the file
            response = FileResponse(
                open(file_path, 'rb'),
                content_type=content_type,
                as_attachment=True,
                filename=file.filename
            )
            
            # Add the encryption key to the response headers
            try:
                # Try to decode the key to check if it's valid base64
                base64.b64decode(file.encryption_key)
                key = file.encryption_key
            except:
                # If it's not valid base64, encode it
                key = base64.b64encode(file.encryption_key.encode()).decode()
            
            # Set the encryption key header
            response['x-encryption-key'] = key
            
            # Ensure CORS headers are set
            response['Access-Control-Expose-Headers'] = 'x-encryption-key'
            
            return response

        except ShareableLink.DoesNotExist:
            return Response(
                {
                    'error': 'Access Denied',
                    'message': 'This link is invalid'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {
                    'error': 'Server Error',
                    'message': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
