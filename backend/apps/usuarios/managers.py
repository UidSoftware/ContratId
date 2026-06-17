"""Custom managers for the Usuario model."""
from django.contrib.auth.models import BaseUserManager


class UsuarioManager(BaseUserManager):
    """Manager that uses email as the primary identifier instead of username."""

    def create_user(self, email, nome, password=None, **extra_fields):
        if not email:
            raise ValueError('O endereço de email é obrigatório.')
        email = self.normalize_email(email)
        user = self.model(email=email, nome=nome, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nome, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser precisa ter is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser precisa ter is_superuser=True.')

        return self.create_user(email, nome, password, **extra_fields)
