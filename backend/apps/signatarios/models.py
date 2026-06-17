"""Signatario model — a person who must sign a contract."""
from django.db import models


class Signatario(models.Model):
    """Represents a signatory linked to a Contrato."""

    METODO = [
        ('email', 'Email'),
        ('whatsapp', 'WhatsApp'),
        ('link', 'Link de assinatura'),
    ]

    contrato = models.ForeignKey(
        'contratos.Contrato',
        on_delete=models.CASCADE,
        related_name='signatarios',
        verbose_name='Contrato',
    )
    nome = models.CharField(max_length=150, verbose_name='Nome')
    email = models.EmailField(verbose_name='Email')
    telefone = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name='Telefone',
    )
    metodo_envio = models.CharField(
        max_length=20,
        choices=METODO,
        default='email',
        verbose_name='Método de envio',
    )

    # Set by Autentique after document creation
    autentique_public_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name='Public ID Autentique',
    )
    link_assinatura = models.URLField(
        null=True,
        blank=True,
        verbose_name='Link de assinatura',
    )

    # Timestamps updated via webhook
    visualizado_em = models.DateTimeField(null=True, blank=True, verbose_name='Visualizado em')
    assinado_em = models.DateTimeField(null=True, blank=True, verbose_name='Assinado em')
    recusado_em = models.DateTimeField(null=True, blank=True, verbose_name='Recusado em')

    class Meta:
        verbose_name = 'Signatário'
        verbose_name_plural = 'Signatários'
        ordering = ['nome']

    def __str__(self):
        return f'{self.nome} <{self.email}> — {self.contrato.titulo}'
