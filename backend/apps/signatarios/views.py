"""Views for signatarios app."""
from rest_framework import viewsets, permissions

from .models import Signatario
from .serializers import SignatarioSerializer


class SignatarioViewSet(viewsets.ModelViewSet):
    """
    CRUD for Signatario.

    GET    /api/signatarios/              → list (filter by contrato)
    POST   /api/signatarios/              → create
    GET    /api/signatarios/{id}/         → retrieve
    PUT    /api/signatarios/{id}/         → update
    DELETE /api/signatarios/{id}/         → destroy (allowed only on drafts)
    """

    serializer_class = SignatarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Signatario.objects.select_related('contrato')

        contrato_id = self.request.query_params.get('contrato')
        if contrato_id:
            qs = qs.filter(contrato_id=contrato_id)

        return qs
