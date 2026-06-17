"""User model for ContratId — authentication by email."""
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UsuarioManager


class Usuario(AbstractBaseUser, PermissionsMixin):
    """Custom user model with email as login identifier."""

    email = models.EmailField(unique=True, verbose_name='Email')
    nome = models.CharField(max_length=150, verbose_name='Nome completo')
    empresa = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='usuarios',
        verbose_name='Empresa',
    )
    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    is_staff = models.BooleanField(default=False, verbose_name='Staff')
    is_admin = models.BooleanField(default=False, verbose_name='Admin')
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome']

    objects = UsuarioManager()

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        ordering = ['-criado_em']

    def __str__(self):
        return self.email

    def get_full_name(self):
        return self.nome

    def get_short_name(self):
        return self.nome.split()[0] if self.nome else self.email
