"""WSGI config for ContratId project."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contratid.settings')
application = get_wsgi_application()
