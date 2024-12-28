from django.shortcuts import render
from rest_framework import status, generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from .serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    MFATokenSerializer,
    LoginSerializer,
    GuestUserSerializer,
)

User = get_user_model()

# Create your views here.

class RegisterView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(generics.GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = authenticate(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password']
        )
        
        if not user:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if user.is_mfa_enabled:
            mfa_token = serializer.validated_data.get('mfa_token')
            if not mfa_token:
                return Response(
                    {'mfa_required': True},
                    status=status.HTTP_200_OK
                )
            
            if not user.verify_mfa_token(mfa_token):
                return Response(
                    {'error': 'Invalid MFA token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        })

class GuestUsersListView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = GuestUserSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['email', 'first_name', 'last_name']
    ordering = ['email']

    def get_queryset(self):
        # Ensure requesting user is not a guest
        if self.request.user.role == 'guest':
            return User.objects.none()
        return User.objects.filter(role='guest')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enable_mfa(request):
    user = request.user
    secret = user.enable_mfa()
    uri = user.get_mfa_uri()
    return Response({
        'secret': secret,
        'uri': uri
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_mfa(request):
    serializer = MFATokenSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    if request.user.verify_mfa_token(serializer.validated_data['token']):
        return Response({'status': 'MFA verified'})
    return Response(
        {'error': 'Invalid token'},
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
