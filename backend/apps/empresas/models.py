"""Empresa model — represents a ContratId client company."""
from django.db import models


class Empresa(models.Model):
    """A company that uses ContratId to manage their contracts."""

    nome = models.CharField(max_length=200, verbose_name='Nome')
    cnpj = models.CharField(max_length=18, unique=True, verbose_name='CNPJ')
    segmento = models.CharField(
        max_length=100,
        verbose_name='Segmento',
        help_text='Ex: pilates, salão, loja, academia',
    )
    email_contato = models.EmailField(verbose_name='Email de contato')
    ativo = models.BooleanField(default=True, verbose_name='Ativo')
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')

    class Meta:
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'
        ordering = ['nome']

    def __str__(self):
        return f'{self.nome} ({self.cnpj})'
