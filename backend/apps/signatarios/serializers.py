"""Serializers for signatarios app."""
from rest_framework import serializers

from .models import Signatario


class SignatarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Signatario
        fields = [
            'id', 'contrato', 'nome', 'email', 'telefone', 'metodo_envio',
            'autentique_public_id', 'link_assinatura',
            'visualizado_em', 'assinado_em', 'recusado_em',
        ]
        read_only_fields = [
            'id', 'autentique_public_id', 'link_assinatura',
            'visualizado_em', 'assinado_em', 'recusado_em',
        ]

    def validate_contrato(self, value):
        """Prevent adding signatários to non-draft or cancelled contracts."""
        if value.status == 'cancelado':
            raise serializers.ValidationError(
                'Não é possível adicionar signatários a um contrato cancelado.'
            )
        if value.status not in ('rascunho',):
            raise serializers.ValidationError(
                'Signatários só podem ser adicionados a contratos em rascunho.'
            )
        return value
