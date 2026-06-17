"""Contract models: ModeloContrato and Contrato."""
from django.db import models


class ModeloContrato(models.Model):
    """Template for a contract. Contains HTML body with substitution variables."""

    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='modelos',
        verbose_name='Empresa',
    )
    nome = models.CharField(
        max_length=200,
        verbose_name='Nome',
        help_text='Ex: Contrato Aluno Pilates',
    )
    segmento = models.CharField(max_length=100, verbose_name='Segmento')
    corpo_html = models.TextField(
        verbose_name='Corpo HTML',
        help_text='HTML com variáveis no formato {{nome}}, {{cpf}}, etc.',
    )
    variaveis = models.JSONField(
        default=list,
        verbose_name='Variáveis',
        help_text='Lista de variáveis substituíveis no corpo do contrato.',
    )
    ativo = models.BooleanField(default=True, verbose_name='Ativo')
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Modelo de Contrato'
        verbose_name_plural = 'Modelos de Contrato'
        ordering = ['nome']

    def __str__(self):
        return f'{self.nome} — {self.empresa.nome}'


class Contrato(models.Model):
    """A contract instance, possibly linked to Autentique for e-signature."""

    STATUS = [
        ('rascunho', 'Rascunho'),
        ('enviado', 'Enviado'),
        ('visualizado', 'Visualizado'),
        ('assinado', 'Assinado'),
        ('recusado', 'Recusado'),
        ('cancelado', 'Cancelado'),  # soft delete
    ]

    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='contratos',
        verbose_name='Empresa',
    )
    modelo = models.ForeignKey(
        ModeloContrato,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contratos',
        verbose_name='Modelo',
    )
    titulo = models.CharField(max_length=200, verbose_name='Título')
    corpo_final = models.TextField(
        verbose_name='Corpo final',
        help_text='HTML com variáveis já substituídas.',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS,
        default='rascunho',
        verbose_name='Status',
        db_index=True,
    )

    # Autentique integration
    autentique_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name='ID Autentique',
    )
    autentique_link = models.URLField(
        null=True,
        blank=True,
        verbose_name='Link Autentique',
    )
    arquivo_original = models.FileField(
        upload_to='contratos/originais/',
        null=True,
        blank=True,
        verbose_name='Arquivo original',
    )
    arquivo_assinado = models.FileField(
        upload_to='contratos/assinados/',
        null=True,
        blank=True,
        verbose_name='Arquivo assinado',
    )

    criado_por = models.ForeignKey(
        'usuarios.Usuario',
        on_delete=models.CASCADE,
        related_name='contratos_criados',
        verbose_name='Criado por',
    )
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.titulo} [{self.status}]'

    @property
    def is_cancelado(self):
        return self.status == 'cancelado'
