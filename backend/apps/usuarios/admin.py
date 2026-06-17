"""Admin configuration for usuarios app."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    list_display = ('email', 'nome', 'empresa', 'is_active', 'is_admin', 'criado_em')
    list_filter = ('is_active', 'is_admin', 'is_staff')
    search_fields = ('email', 'nome')
    ordering = ('-criado_em',)
    readonly_fields = ('criado_em',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informações pessoais', {'fields': ('nome', 'empresa')}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_admin', 'is_superuser', 'groups', 'user_permissions')}),
        ('Datas', {'fields': ('last_login', 'criado_em')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nome', 'password1', 'password2', 'is_active', 'is_staff', 'is_admin'),
        }),
    )

    filter_horizontal = ('groups', 'user_permissions')
