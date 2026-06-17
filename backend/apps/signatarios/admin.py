"""Admin configuration for signatarios app."""
from django.contrib import admin

from .models import Signatario


@admin.register(Signatario)
class SignatarioAdmin(admin.ModelAdmin):
    list_display = ('nome', 'email', 'contrato', 'metodo_envio', 'assinado_em')
    list_filter = ('metodo_envio',)
    search_fields = ('nome', 'email')
    readonly_fields = ('autentique_public_id', 'link_assinatura', 'visualizado_em', 'assinado_em', 'recusado_em')
