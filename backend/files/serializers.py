from rest_framework import serializers
from .models import File, ShareableLink
from django.core.files.uploadedfile import UploadedFile
from django.utils import timezone
from datetime import timedelta

# Supported file types
SUPPORTED_MIME_TYPES = {
    # Text Files
    'text/plain',
    'text/csv',
    'application/json',
    # Image Files
    'image/png',
    'image/jpeg',
    'image/gif',
    # PDF Files
    'application/pdf',
    # Video Files
    'video/mp4',
    'video/x-msvideo',  # AVI
    # Audio Files
    'audio/mpeg',  # MP3
    'audio/wav',
}

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ['id', 'filename', 'size', 'mime_type', 'uploaded_at', 'updated_at']
        read_only_fields = ['id', 'uploaded_at', 'updated_at']

class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    encryption_key = serializers.CharField()

    def validate_file(self, value):
        if not isinstance(value, UploadedFile):
            raise serializers.ValidationError("Invalid file")
        
        # Validate file type
        if value.content_type not in SUPPORTED_MIME_TYPES:
            raise serializers.ValidationError(
                "Unsupported file type. Please upload only: "
                "Text Files (TXT, CSV, JSON), "
                "Image Files (PNG, JPEG, GIF), "
                "PDF Files, "
                "Video Files (MP4, AVI), "
                "or Audio Files (MP3, WAV)"
            )
        
        # Validate file size (5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("File size cannot exceed 5MB")
            
        return value

    def create(self, validated_data):
        file = validated_data['file']
        encryption_key = validated_data['encryption_key']
        user = self.context['request'].user

        return File.objects.create(
            filename=file.name,
            file=file,
            encryption_key=encryption_key,
            size=file.size,
            mime_type=file.content_type,
            owner=user
        )

class ShareableLinkSerializer(serializers.ModelSerializer):
    expires_in = serializers.IntegerField(write_only=True, required=True)
    url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file_type = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = ShareableLink
        fields = [
            'token', 'permissions', 'expires_in', 'expires_at', 'created_at',
            'last_accessed_at', 'access_count', 'url', 'file_name',
            'file_type', 'file_size'
        ]
        read_only_fields = [
            'token', 'expires_at', 'created_at', 'last_accessed_at',
            'access_count', 'url', 'file_name', 'file_type', 'file_size'
        ]

    def get_url(self, obj):
        request = self.context.get('request')
        if request is None:
            return None
        return f"{request.scheme}://{request.get_host()}/share/{obj.token}"

    def get_file_name(self, obj):
        return obj.file.filename

    def get_file_type(self, obj):
        return obj.file.mime_type

    def get_file_size(self, obj):
        return obj.file.size

    def create(self, validated_data):
        expires_in = validated_data.pop('expires_in')
        expires_at = timezone.now() + timedelta(minutes=expires_in)
        return ShareableLink.objects.create(
            **validated_data,
            expires_at=expires_at
        )
