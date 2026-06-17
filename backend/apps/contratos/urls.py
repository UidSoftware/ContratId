"""URL patterns for contratos app."""
from rest_framework.routers import DefaultRouter

from .views import ModeloContratoViewSet, ContratoViewSet

router = DefaultRouter()
router.register(r'modelos', ModeloContratoViewSet, basename='modelo')
router.register(r'contratos', ContratoViewSet, basename='contrato')

urlpatterns = router.urls
