from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
import pyotp

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email field must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('user', 'Regular User'),
        ('guest', 'Guest'),
    ]

    username = None
    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    mfa_secret = models.CharField(max_length=32, blank=True)
    is_mfa_enabled = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def enable_mfa(self):
        if not self.mfa_secret:
            self.mfa_secret = pyotp.random_base32()
            self.is_mfa_enabled = True
            self.save()
        return self.mfa_secret

    def verify_mfa_token(self, token):
        if not self.is_mfa_enabled:
            return True
        totp = pyotp.TOTP(self.mfa_secret)
        return totp.verify(token)

    def get_mfa_uri(self):
        if self.mfa_secret:
            totp = pyotp.TOTP(self.mfa_secret)
            return totp.provisioning_uri(self.email, issuer_name="SecureFileShare")
