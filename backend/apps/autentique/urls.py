"""URL patterns for autentique webhook."""
from django.urls import path

from .views import AutentiqueWebhookView

urlpatterns = [
    path('autentique/', AutentiqueWebhookView.as_view(), name='webhook-autentique'),
]
