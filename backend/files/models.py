import os
import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

def validate_file_size(value):
    filesize = value.size
    if filesize > settings.MAX_UPLOAD_SIZE:
        raise ValidationError(f"Maximum file size that can be uploaded is {settings.MAX_UPLOAD_SIZE/(1024*1024)}MB")

def get_file_path(instance, filename):
    # Generate a UUID for the file
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    # Return the file path
    return os.path.join('encrypted_files', str(instance.owner.id), filename)

class File(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filename = models.CharField(max_length=255, help_text="Original name of the uploaded file")
    file = models.FileField(upload_to=get_file_path, validators=[validate_file_size])
    encryption_key = models.TextField(help_text="Stores the server-side encrypted key")  # Added help_text
    size = models.BigIntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=255, help_text="MIME type of the file")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='files')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    description = models.TextField(blank=True, null=True, help_text="Optional description of the file")  # New field

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'File'
        verbose_name_plural = 'Files'

    def __str__(self):
        return self.filename

    def delete(self, *args, **kwargs):
        # Delete the actual file when the model is deleted
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)

class ShareableLink(models.Model):
    PERMISSION_CHOICES = [
        ('view', 'View Only'),
        ('download', 'Download'),
    ]

    token = models.CharField(
        max_length=64,
        primary_key=True,
        unique=True,
        editable=False,
        help_text="Unique, secure token for the shareable link"
    )
    file = models.ForeignKey(
        File,
        on_delete=models.CASCADE,
        related_name='shareable_links',
        help_text="The file being shared"
    )
    permissions = models.CharField(
        max_length=10,
        choices=PERMISSION_CHOICES,
        default='view',
        help_text="Access permissions (view-only or download)"
    )
    expires_at = models.DateTimeField(
        help_text="Expiration time of the token"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the link was created"
    )
    last_accessed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the link was last accessed"
    )
    access_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times this link has been accessed"
    )
    accessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accessed_links',
        help_text="User who last accessed the link (if any)"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_links',
        help_text="User who created the link"
    )
    guest_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shared_links',
        help_text='Guest user this link is specifically shared with',
        limit_choices_to={'role': 'guest'}
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Shareable Link'
        verbose_name_plural = 'Shareable Links'
        constraints = [
            models.CheckConstraint(
                check=models.Q(
                    models.Q(guest_user__isnull=True) |
                    models.Q(guest_user__isnull=False)
                ),
                name='exclusive_sharing_method'
            )
        ]

    def __str__(self):
        return f"Share link for {self.file.filename} ({self.permissions})"

    def is_expired(self):
        """Check if the link has expired"""
        return timezone.now() > self.expires_at

    def is_valid(self):
        """Check if the link is still valid"""
        return not self.is_expired()

    def record_access(self, user=None):
        """Record an access to this link"""
        self.access_count += 1
        self.last_accessed_at = timezone.now()
        if user:
            self.accessed_by = user
        self.save()

    def save(self, *args, **kwargs):
        """Generate a secure token if not set"""
        if not self.token:
            self.token = uuid.uuid4().hex
        super().save(*args, **kwargs)
