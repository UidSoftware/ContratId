"""ContratId URL Configuration."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.usuarios.urls')),
    path('api/empresas/', include('apps.empresas.urls')),
    path('api/', include('apps.contratos.urls')),
    path('api/', include('apps.signatarios.urls')),
    path('api/webhook/', include('apps.autentique.urls')),
    path('api/', include('apps.orcamentos.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
