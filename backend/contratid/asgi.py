"""ASGI config for ContratId project."""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contratid.settings')
application = get_asgi_application()
