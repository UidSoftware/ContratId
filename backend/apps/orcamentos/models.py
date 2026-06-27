"""Models para orçamentos."""
from decimal import Decimal
from django.db import models


class Orcamento(models.Model):
    STATUS = [
        ('rascunho', 'Rascunho'),
        ('enviado', 'Enviado'),
        ('aprovado', 'Aprovado'),
        ('recusado', 'Recusado'),
        ('expirado', 'Expirado'),
        ('cancelado', 'Cancelado'),
    ]

    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='orcamentos',
        verbose_name='Empresa',
    )
    numero = models.PositiveIntegerField(verbose_name='Número')
    emitido_em = models.DateField(auto_now_add=True, verbose_name='Emitido em')
    valido_ate = models.DateField(verbose_name='Válido até')
    status = models.CharField(
        max_length=20, choices=STATUS, default='rascunho',
        verbose_name='Status', db_index=True,
    )

    cliente_nome = models.CharField(max_length=200, verbose_name='Nome do cliente')
    cliente_email = models.EmailField(blank=True, verbose_name='E-mail')
    cliente_telefone = models.CharField(max_length=20, blank=True, verbose_name='Telefone')
    cliente_cpf_cnpj = models.CharField(max_length=20, blank=True, verbose_name='CPF/CNPJ')
    cliente_rg = models.CharField(max_length=20, blank=True, verbose_name='RG')
    cliente_endereco = models.CharField(max_length=300, blank=True, verbose_name='Endereço')
    cliente_bairro = models.CharField(max_length=100, blank=True, verbose_name='Bairro')
    cliente_cidade = models.CharField(max_length=100, blank=True, verbose_name='Cidade')
    cliente_estado = models.CharField(max_length=2, blank=True, verbose_name='Estado')
    cliente_cep = models.CharField(max_length=9, blank=True, verbose_name='CEP')

    desconto = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Desconto (R$)',
    )
    forma_pagamento = models.CharField(max_length=200, blank=True, verbose_name='Forma de pagamento')
    observacoes = models.TextField(blank=True, verbose_name='Observações')

    contrato = models.OneToOneField(
        'contratos.Contrato',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='orcamento',
        verbose_name='Contrato gerado',
    )

    criado_por = models.ForeignKey(
        'usuarios.Usuario',
        on_delete=models.CASCADE,
        related_name='orcamentos_criados',
        verbose_name='Criado por',
    )
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Orçamento'
        verbose_name_plural = 'Orçamentos'
        ordering = ['-criado_em']
        unique_together = [('empresa', 'numero')]

    def __str__(self):
        return f'Orçamento #{self.numero} — {self.cliente_nome}'

    @property
    def subtotal(self):
        return sum(item.subtotal for item in self.itens.all())

    @property
    def total_geral(self):
        return self.subtotal - self.desconto

    @property
    def is_cancelado(self):
        return self.status == 'cancelado'


class ItemOrcamento(models.Model):
    orcamento = models.ForeignKey(
        Orcamento, on_delete=models.CASCADE,
        related_name='itens', verbose_name='Orçamento',
    )
    ordem = models.PositiveSmallIntegerField(default=1, verbose_name='Ordem')
    descricao = models.CharField(max_length=300, verbose_name='Descrição')
    quantidade = models.DecimalField(
        max_digits=10, decimal_places=3, default=1,
        verbose_name='Quantidade',
    )
    valor_unitario = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name='Valor unitário',
    )

    class Meta:
        verbose_name = 'Item de Orçamento'
        verbose_name_plural = 'Itens de Orçamento'
        ordering = ['ordem']

    def __str__(self):
        return f'{self.descricao} (x{self.quantidade})'

    @property
    def subtotal(self):
        return self.quantidade * self.valor_unitario
