from django.db import migrations, models
from django.conf import settings
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('files', '0002_shareablelink'),
    ]

    operations = [
        # Add guest user field
        migrations.AddField(
            model_name='shareablelink',
            name='guest_user',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='shared_links',
                to=settings.AUTH_USER_MODEL,
                help_text='Guest user this link is specifically shared with',
                limit_choices_to={'role': 'guest'}
            ),
        ),
        migrations.AddConstraint(
            model_name='shareablelink',
            constraint=models.CheckConstraint(
                check=models.Q(
                    models.Q(('token__isnull', False), ('guest_user__isnull', True)) |
                    models.Q(('token__isnull', True), ('guest_user__isnull', False))
                ),
                name='exclusive_sharing_method'
            ),
        ),
    ]
