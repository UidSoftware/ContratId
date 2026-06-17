"""Serializers for empresas app."""
from rest_framework import serializers

from .models import Empresa


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = ['id', 'nome', 'cnpj', 'segmento', 'email_contato', 'ativo', 'criado_em']
        read_only_fields = ['id', 'criado_em']
