"""Admin configuration for empresas app."""
from django.contrib import admin

from .models import Empresa


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'cnpj', 'segmento', 'email_contato', 'ativo', 'criado_em')
    list_filter = ('ativo', 'segmento')
    search_fields = ('nome', 'cnpj', 'email_contato')
    readonly_fields = ('criado_em',)
