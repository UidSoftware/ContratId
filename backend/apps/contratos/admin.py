"""Admin configuration for contratos app."""
from django.contrib import admin

from .models import ModeloContrato, Contrato


@admin.register(ModeloContrato)
class ModeloContratoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'empresa', 'segmento', 'ativo', 'criado_em')
    list_filter = ('ativo', 'segmento', 'empresa')
    search_fields = ('nome', 'segmento')
    readonly_fields = ('criado_em', 'atualizado_em')

    def delete_model(self, request, obj):
        """Override to soft delete."""
        obj.ativo = False
        obj.save()

    def delete_queryset(self, request, queryset):
        """Override bulk delete to soft delete."""
        queryset.update(ativo=False)


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'empresa', 'status', 'criado_por', 'criado_em')
    list_filter = ('status', 'empresa')
    search_fields = ('titulo', 'autentique_id')
    readonly_fields = ('autentique_id', 'autentique_link', 'criado_em', 'atualizado_em')

    def delete_model(self, request, obj):
        """Override to soft delete (status=cancelado)."""
        obj.status = 'cancelado'
        obj.save()

    def delete_queryset(self, request, queryset):
        """Override bulk delete to soft delete."""
        queryset.update(status='cancelado')
