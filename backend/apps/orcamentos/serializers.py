"""Serializers para orçamentos."""
from decimal import Decimal
from rest_framework import serializers
from .models import Orcamento, ItemOrcamento


class ItemOrcamentoSerializer(serializers.ModelSerializer):
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = ItemOrcamento
        fields = ['id', 'ordem', 'descricao', 'quantidade', 'valor_unitario', 'subtotal']

    def get_subtotal(self, obj):
        return obj.quantidade * obj.valor_unitario


class OrcamentoSerializer(serializers.ModelSerializer):
    itens = ItemOrcamentoSerializer(many=True)
    subtotal = serializers.SerializerMethodField()
    total_geral = serializers.SerializerMethodField()
    criado_por_nome = serializers.CharField(source='criado_por.nome', read_only=True)

    class Meta:
        model = Orcamento
        fields = [
            'id', 'empresa', 'numero', 'emitido_em', 'valido_ate', 'status',
            'cliente_nome', 'cliente_email', 'cliente_telefone',
            'cliente_cpf_cnpj', 'cliente_rg', 'cliente_endereco',
            'cliente_bairro', 'cliente_cidade', 'cliente_estado', 'cliente_cep',
            'desconto', 'forma_pagamento', 'observacoes',
            'contrato', 'itens', 'subtotal', 'total_geral',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em',
        ]
        read_only_fields = [
            'id', 'numero', 'emitido_em', 'status', 'contrato',
            'criado_por', 'criado_em', 'atualizado_em',
        ]

    def get_subtotal(self, obj):
        return sum(i.quantidade * i.valor_unitario for i in obj.itens.all())

    def get_total_geral(self, obj):
        sub = sum(i.quantidade * i.valor_unitario for i in obj.itens.all())
        return sub - (obj.desconto or Decimal('0'))

    def create(self, validated_data):
        itens_data = validated_data.pop('itens', [])
        validated_data['criado_por'] = self.context['request'].user
        # Auto-incremento de número por empresa
        empresa = validated_data['empresa']
        ultimo = Orcamento.objects.filter(empresa=empresa).order_by('-numero').first()
        validated_data['numero'] = (ultimo.numero + 1) if ultimo else 1
        orcamento = Orcamento.objects.create(**validated_data)
        for idx, item_data in enumerate(itens_data, start=1):
            item_data['ordem'] = idx
            ItemOrcamento.objects.create(orcamento=orcamento, **item_data)
        return orcamento

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if itens_data is not None:
            instance.itens.all().delete()
            for idx, item_data in enumerate(itens_data, start=1):
                item_data['ordem'] = idx
                ItemOrcamento.objects.create(orcamento=instance, **item_data)
        return instance


class OrcamentoListSerializer(serializers.ModelSerializer):
    subtotal = serializers.SerializerMethodField()
    total_geral = serializers.SerializerMethodField()

    class Meta:
        model = Orcamento
        fields = [
            'id', 'numero', 'empresa', 'emitido_em', 'valido_ate', 'status',
            'cliente_nome', 'desconto', 'subtotal', 'total_geral',
            'contrato', 'criado_em',
        ]

    def get_subtotal(self, obj):
        return sum(i.quantidade * i.valor_unitario for i in obj.itens.all())

    def get_total_geral(self, obj):
        sub = sum(i.quantidade * i.valor_unitario for i in obj.itens.all())
        return sub - (obj.desconto or Decimal('0'))
