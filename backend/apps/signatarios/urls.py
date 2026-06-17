"""URL patterns for signatarios app."""
from rest_framework.routers import DefaultRouter

from .views import SignatarioViewSet

router = DefaultRouter()
router.register(r'signatarios', SignatarioViewSet, basename='signatario')

urlpatterns = router.urls
