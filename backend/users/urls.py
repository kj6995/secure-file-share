from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('enable-mfa/', views.enable_mfa, name='enable_mfa'),
    path('verify-mfa/', views.verify_mfa, name='verify_mfa'),
    path('profile/', views.get_user_profile, name='user_profile'),
    path('guest-users/', views.GuestUsersListView.as_view(), name='guest_users_list'),
]
