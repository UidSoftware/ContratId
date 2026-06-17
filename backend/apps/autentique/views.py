"""Autentique webhook receiver.

POST /api/webhook/autentique/

Receives real-time events from Autentique and updates contract/signer status.
Must be csrf_exempt.
"""
import logging
from datetime import datetime, timezone

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.contratos.models import Contrato
from apps.signatarios.models import Signatario

logger = logging.getLogger(__name__)

# Autentique event type constants
EVENT_DOCUMENT_SIGNED = 'document_signed'
EVENT_DOCUMENT_VIEWED = 'document_viewed'
EVENT_DOCUMENT_REJECTED = 'document_rejected'
EVENT_SIGNER_SIGNED = 'signer_signed'
EVENT_SIGNER_VIEWED = 'signer_viewed'
EVENT_SIGNER_REJECTED = 'signer_rejected'


@method_decorator(csrf_exempt, name='dispatch')
class AutentiqueWebhookView(APIView):
    """
    Receives webhook events from Autentique and updates local state.

    No authentication required (webhook is called by Autentique).
    The endpoint must be registered in the Autentique dashboard.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data

        event_type = payload.get('event')
        document_id = payload.get('document', {}).get('id') if payload.get('document') else None

        if not event_type or not document_id:
            return Response({'detail': 'Payload inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        logger.info('Autentique webhook received event=%s doc_id=%s', event_type, document_id)

        try:
            contrato = Contrato.objects.get(autentique_id=document_id)
        except Contrato.DoesNotExist:
            # Unknown document — acknowledge to avoid retries
            logger.warning('Webhook: contrato not found for autentique_id=%s', document_id)
            return Response({'detail': 'Contrato não encontrado.'}, status=status.HTTP_200_OK)

        now = datetime.now(tz=timezone.utc)

        # ------------------------------------------------------------------ #
        # Route events
        # ------------------------------------------------------------------ #
        if event_type in (EVENT_DOCUMENT_VIEWED, EVENT_SIGNER_VIEWED):
            _handle_viewed(contrato, payload, now)

        elif event_type in (EVENT_SIGNER_SIGNED,):
            _handle_signer_signed(contrato, payload, now)

        elif event_type in (EVENT_DOCUMENT_SIGNED,):
            # All signers have signed
            _handle_all_signed(contrato, payload, now)

        elif event_type in (EVENT_DOCUMENT_REJECTED, EVENT_SIGNER_REJECTED):
            _handle_rejected(contrato, payload, now)

        else:
            logger.info('Autentique webhook: unhandled event_type=%s', event_type)

        return Response({'detail': 'OK'}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Event handlers
# ---------------------------------------------------------------------------

def _handle_viewed(contrato: Contrato, payload: dict, now: datetime) -> None:
    """Mark the contract as viewed and update the corresponding signer."""
    signer_data = payload.get('signatory') or {}
    public_id = signer_data.get('public_id')

    if public_id:
        Signatario.objects.filter(
            contrato=contrato,
            autentique_public_id=public_id,
            visualizado_em__isnull=True,
        ).update(visualizado_em=now)

    # Update contract status only if it's still 'enviado'
    if contrato.status == 'enviado':
        contrato.status = 'visualizado'
        contrato.save(update_fields=['status', 'atualizado_em'])


def _handle_signer_signed(contrato: Contrato, payload: dict, now: datetime) -> None:
    """Mark an individual signer as signed."""
    signer_data = payload.get('signatory') or {}
    public_id = signer_data.get('public_id')

    if public_id:
        Signatario.objects.filter(
            contrato=contrato,
            autentique_public_id=public_id,
            assinado_em__isnull=True,
        ).update(assinado_em=now)

    # Check if ALL signatários have now signed
    all_signed = not Signatario.objects.filter(
        contrato=contrato,
        assinado_em__isnull=True,
    ).exists()

    if all_signed and contrato.status not in ('assinado', 'cancelado'):
        contrato.status = 'assinado'
        contrato.save(update_fields=['status', 'atualizado_em'])


def _handle_all_signed(contrato: Contrato, payload: dict, now: datetime) -> None:
    """Handle document_signed event — all signatures collected."""
    # Mark any remaining signatários as signed
    Signatario.objects.filter(
        contrato=contrato,
        assinado_em__isnull=True,
    ).update(assinado_em=now)

    if contrato.status != 'cancelado':
        contrato.status = 'assinado'

    # Save signed file URL if provided
    doc_data = payload.get('document', {})
    files = doc_data.get('files', {})
    signed_url = files.get('signed')

    if signed_url:
        # Store the signed file URL (could be downloaded and saved to FileField)
        # For Fase 1, we store the URL as autentique_link and download later
        contrato.autentique_link = signed_url

    contrato.save(update_fields=['status', 'autentique_link', 'atualizado_em'])


def _handle_rejected(contrato: Contrato, payload: dict, now: datetime) -> None:
    """Handle signer rejection."""
    signer_data = payload.get('signatory') or {}
    public_id = signer_data.get('public_id')

    if public_id:
        Signatario.objects.filter(
            contrato=contrato,
            autentique_public_id=public_id,
            recusado_em__isnull=True,
        ).update(recusado_em=now)

    if contrato.status not in ('cancelado', 'assinado'):
        contrato.status = 'recusado'
        contrato.save(update_fields=['status', 'atualizado_em'])
