"""Views for empresas app."""
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response

from .models import Empresa
from .serializers import EmpresaSerializer


class EmpresaViewSet(viewsets.ModelViewSet):
    """CRUD for Empresa. Only authenticated users.

    GET    /api/empresas/        → list
    POST   /api/empresas/        → create
    GET    /api/empresas/{id}/   → retrieve
    PUT    /api/empresas/{id}/   → update
    PATCH  /api/empresas/{id}/   → partial update
    DELETE /api/empresas/{id}/   → soft delete (ativo=False)
    """

    serializer_class = EmpresaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Empresa.objects.all()
        if not self.request.user.is_admin:
            qs = qs.filter(ativo=True)
        return qs

    def destroy(self, request, *args, **kwargs):
        empresa = self.get_object()
        empresa.ativo = False
        empresa.save(update_fields=['ativo'])
        return Response(status=status.HTTP_204_NO_CONTENT)
