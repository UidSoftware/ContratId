"""Views for contratos app."""
import io
import logging
import os
import tempfile

from django.http import FileResponse, Http404
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.autentique.service import criar_documento, consultar_documento
from apps.signatarios.models import Signatario
from .models import ModeloContrato, Contrato
from .serializers import (
    ModeloContratoSerializer,
    ContratoSerializer,
    ContratoListSerializer,
)

logger = logging.getLogger(__name__)


class ModeloContratoViewSet(viewsets.ModelViewSet):
    """
    CRUD for ModeloContrato.

    GET    /api/modelos/         → list
    POST   /api/modelos/         → create
    GET    /api/modelos/{id}/    → retrieve
    PUT    /api/modelos/{id}/    → update
    DELETE /api/modelos/{id}/   → soft delete (ativo=False)
    """

    serializer_class = ModeloContratoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ModeloContrato.objects.select_related('empresa')
        user = self.request.user
        if user.empresa_id:
            qs = qs.filter(empresa=user.empresa_id)
        if not user.is_admin:
            qs = qs.filter(ativo=True)
        return qs

    def destroy(self, request, *args, **kwargs):
        """Soft delete: set ativo=False instead of actually deleting."""
        modelo = self.get_object()
        modelo.ativo = False
        modelo.save(update_fields=['ativo'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ContratoViewSet(viewsets.ModelViewSet):
    """
    CRUD for Contrato with extra actions.

    GET    /api/contratos/                   → list (filters: status, empresa)
    POST   /api/contratos/                   → create draft
    GET    /api/contratos/{id}/              → retrieve with signatários
    PUT    /api/contratos/{id}/              → update
    POST   /api/contratos/{id}/enviar/       → send to Autentique
    POST   /api/contratos/{id}/cancelar/     → soft delete (status=cancelado)
    GET    /api/contratos/{id}/download/     → download signed PDF
    """

    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'list':
            return ContratoListSerializer
        return ContratoSerializer

    def get_queryset(self):
        qs = Contrato.objects.select_related(
            'empresa', 'modelo', 'criado_por'
        ).prefetch_related('signatarios')

        user = self.request.user

        # Scope to user's company if not admin
        if not user.is_admin and user.empresa_id:
            qs = qs.filter(empresa=user.empresa_id)

        # Exclude cancelled by default unless explicitly requested
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        else:
            qs = qs.exclude(status='cancelado')

        empresa_filter = self.request.query_params.get('empresa')
        if empresa_filter:
            qs = qs.filter(empresa_id=empresa_filter)

        return qs

    @action(detail=True, methods=['post'], url_path='enviar')
    def enviar(self, request, pk=None):
        """
        Send contract to Autentique for e-signature.

        1. Generate PDF from corpo_final via xhtml2pdf
        2. Call Autentique API to create the document
        3. Update Contrato and Signatario records
        """
        contrato = self.get_object()

        if contrato.status != 'rascunho':
            return Response(
                {'detail': f'Contrato não pode ser enviado no status "{contrato.status}".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        signatarios_qs = Signatario.objects.filter(contrato=contrato)
        if not signatarios_qs.exists():
            return Response(
                {'detail': 'Adicione ao menos um signatário antes de enviar.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate PDF
        pdf_path = _gerar_pdf(contrato)
        if not pdf_path:
            return Response(
                {'detail': 'Falha ao gerar PDF do contrato.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            signatarios_data = [
                {
                    'nome': s.nome,
                    'email': s.email,
                    'telefone': s.telefone,
                    'metodo_envio': s.metodo_envio,
                }
                for s in signatarios_qs
            ]

            resultado = criar_documento(
                titulo=contrato.titulo,
                pdf_path=pdf_path,
                signatarios=signatarios_data,
            )

            if resultado.get('erro'):
                return Response(
                    {'detail': resultado['erro']},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            # Update contrato
            contrato.autentique_id = resultado.get('id')
            contrato.autentique_link = resultado.get('link')
            contrato.status = 'enviado'

            # Save original PDF to FileField
            with open(pdf_path, 'rb') as f:
                from django.core.files.base import ContentFile
                filename = f'contrato_{contrato.id}.pdf'
                contrato.arquivo_original.save(filename, ContentFile(f.read()), save=False)

            contrato.save()

            # Update each signatário with Autentique info
            signatarios_autentique = resultado.get('signatarios', [])
            for i, sig in enumerate(signatarios_qs):
                if i < len(signatarios_autentique):
                    sig_data = signatarios_autentique[i]
                    sig.autentique_public_id = sig_data.get('public_id')
                    sig.link_assinatura = sig_data.get('link')
                    sig.save(update_fields=['autentique_public_id', 'link_assinatura'])

            serializer = ContratoSerializer(contrato, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as exc:
            logger.error('Erro ao enviar contrato %s para Autentique', contrato.id)
            return Response(
                {'detail': 'Erro interno ao comunicar com Autentique.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            # Clean up temp file
            if pdf_path and os.path.exists(pdf_path):
                try:
                    os.remove(pdf_path)
                except OSError:
                    pass

    @action(detail=True, methods=['post'], url_path='cancelar')
    def cancelar(self, request, pk=None):
        """Soft delete: set status=cancelado. Contracts are never actually deleted."""
        contrato = self.get_object()

        if contrato.status == 'cancelado':
            return Response(
                {'detail': 'Contrato já está cancelado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contrato.status = 'cancelado'
        contrato.save(update_fields=['status', 'atualizado_em'])
        return Response({'detail': 'Contrato cancelado com sucesso.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        """Return the signed PDF file as a download."""
        contrato = self.get_object()

        if not contrato.arquivo_assinado:
            raise Http404('Arquivo assinado não disponível para este contrato.')

        try:
            return FileResponse(
                contrato.arquivo_assinado.open('rb'),
                as_attachment=True,
                filename=f'contrato_{contrato.id}_assinado.pdf',
            )
        except FileNotFoundError:
            raise Http404('Arquivo assinado não encontrado no servidor.')


def _gerar_pdf(contrato: Contrato) -> str | None:
    """
    Generate a PDF from the contract's HTML body using xhtml2pdf.
    Returns the path to a temporary PDF file, or None on failure.
    """
    try:
        from xhtml2pdf import pisa

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; font-size: 12pt; margin: 2cm; }}
                h1 {{ font-size: 16pt; text-align: center; }}
            </style>
        </head>
        <body>
            <h1>{contrato.titulo}</h1>
            {contrato.corpo_final}
        </body>
        </html>
        """

        with tempfile.NamedTemporaryFile(
            suffix='.pdf', delete=False, prefix=f'contrato_{contrato.id}_'
        ) as tmp:
            pdf_path = tmp.name

        with open(pdf_path, 'wb') as output_file:
            result = pisa.CreatePDF(
                io.StringIO(html_content),
                dest=output_file,
                encoding='utf-8',
            )

        if result.err:
            logger.error('xhtml2pdf error generating PDF for contrato %s', contrato.id)
            os.remove(pdf_path)
            return None

        return pdf_path

    except Exception:
        logger.error('Failed to generate PDF for contrato %s', contrato.id)
        return None
