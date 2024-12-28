from rest_framework import permissions

class IsFileOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Only allow the owner of the file to access it
        return obj.owner == request.user
