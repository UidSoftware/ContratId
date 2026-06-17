"""URL patterns for empresas app."""
from rest_framework.routers import DefaultRouter

from .views import EmpresaViewSet

router = DefaultRouter()
router.register(r'', EmpresaViewSet, basename='empresa')

urlpatterns = router.urls
