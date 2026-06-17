"""Serializers for contratos app."""
from rest_framework import serializers

from apps.signatarios.models import Signatario
from .models import ModeloContrato, Contrato


class ModeloContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModeloContrato
        fields = [
            'id', 'empresa', 'nome', 'segmento', 'corpo_html',
            'variaveis', 'ativo', 'criado_em', 'atualizado_em',
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em']


class SignatarioInlineSerializer(serializers.ModelSerializer):
    """Inline read-only representation of a signatário inside a Contrato."""

    class Meta:
        model = Signatario
        fields = [
            'id', 'nome', 'email', 'telefone', 'metodo_envio',
            'autentique_public_id', 'link_assinatura',
            'visualizado_em', 'assinado_em', 'recusado_em',
        ]


class ContratoSerializer(serializers.ModelSerializer):
    signatarios = SignatarioInlineSerializer(many=True, read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.nome', read_only=True)

    class Meta:
        model = Contrato
        fields = [
            'id', 'empresa', 'modelo', 'titulo', 'corpo_final', 'status',
            'autentique_id', 'autentique_link', 'arquivo_original', 'arquivo_assinado',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em',
            'signatarios',
        ]
        read_only_fields = [
            'id', 'status', 'autentique_id', 'autentique_link',
            'arquivo_assinado', 'criado_por', 'criado_em', 'atualizado_em',
        ]

    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        validated_data['status'] = 'rascunho'
        return super().create(validated_data)


class ContratoListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view (no signatários inline)."""

    class Meta:
        model = Contrato
        fields = [
            'id', 'empresa', 'modelo', 'titulo', 'status',
            'autentique_id', 'autentique_link',
            'criado_por', 'criado_em', 'atualizado_em',
        ]
