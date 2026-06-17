"""
Autentique API v2 (GraphQL) service layer.

All communication with Autentique happens here.
No sensitive data (tokens, CPFs) is logged.
"""
import logging
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

ENDPOINT = 'https://api.autentique.com.br/v2/graphql'

# ---------------------------------------------------------------------------
# GraphQL definitions
# ---------------------------------------------------------------------------

CREATE_DOCUMENT_MUTATION = """
mutation CreateDocumentMutation(
    $document: DocumentInput!,
    $signatories: [SignatoryInput!]!,
    $sandbox: Boolean
) {
    createDocument(
        document: $document,
        signatories: $signatories,
        sandbox: $sandbox
    ) {
        id
        name
        status
        created_at
        files {
            original
            signed
        }
        signatures {
            public_id
            name
            email
            signed {
                created_at
            }
            viewed {
                created_at
            }
            link
            action {
                name
            }
        }
    }
}
"""

QUERY_DOCUMENT = """
query DocumentQuery($id: UUID!) {
    document(id: $id) {
        id
        name
        status
        created_at
        files {
            original
            signed
        }
        signatures {
            public_id
            name
            email
            signed {
                created_at
            }
            viewed {
                created_at
            }
            refused {
                created_at
            }
            link
            action {
                name
            }
        }
    }
}
"""


def _get_headers() -> dict[str, str]:
    return {
        'Authorization': f'Bearer {settings.AUTENTIQUE_TOKEN}',
    }


def criar_documento(titulo: str, pdf_path: str, signatarios: list[dict]) -> dict[str, Any]:
    """
    Create a document in Autentique for e-signature.

    Args:
        titulo: Document title
        pdf_path: Absolute path to the PDF file on disk
        signatarios: List of dicts with keys: nome, email, telefone, metodo_envio

    Returns:
        dict with keys:
            id (str): Autentique document UUID
            link (str): Document link
            signatarios (list): List of dicts with public_id and link per signer
            erro (str | None): Error message if something went wrong
    """
    sandbox = settings.AUTENTIQUE_SANDBOX

    signataries_input = []
    for sig in signatarios:
        entry: dict[str, Any] = {
            'email': sig['email'],
            'action': 'SIGN',
        }
        if sig.get('metodo_envio') == 'whatsapp' and sig.get('telefone'):
            entry['positions'] = []
            # Phone number for WhatsApp delivery
            entry['phone'] = sig['telefone']
        signataries_input.append(entry)

    variables = {
        'document': {
            'name': titulo,
        },
        'signatories': signataries_input,
        'sandbox': sandbox,
    }

    try:
        with open(pdf_path, 'rb') as pdf_file:
            # Autentique requires multipart/form-data for file upload with GraphQL
            # The file is sent as the variable "0" and referenced via map
            operations = {
                'query': CREATE_DOCUMENT_MUTATION,
                'variables': variables,
            }
            # Map file variable
            file_map = {'0': ['variables.document.content']}

            import json
            response = requests.post(
                ENDPOINT,
                headers=_get_headers(),
                files={
                    'operations': (None, json.dumps(operations), 'application/json'),
                    'map': (None, json.dumps(file_map), 'application/json'),
                    '0': (f'{titulo}.pdf', pdf_file, 'application/pdf'),
                },
                timeout=60,
            )

        response.raise_for_status()
        data = response.json()

        if 'errors' in data:
            error_msgs = '; '.join(e.get('message', 'Erro desconhecido') for e in data['errors'])
            logger.error('Autentique GraphQL errors on createDocument: %s', error_msgs)
            return {'erro': error_msgs}

        doc = data.get('data', {}).get('createDocument', {})

        result_signatarios = []
        for sig in doc.get('signatures', []):
            result_signatarios.append({
                'public_id': sig.get('public_id'),
                'link': sig.get('link'),
                'email': sig.get('email'),
                'nome': sig.get('name'),
            })

        return {
            'id': doc.get('id'),
            'link': _extract_link(doc),
            'signatarios': result_signatarios,
            'erro': None,
        }

    except requests.RequestException as exc:
        logger.error('HTTP error communicating with Autentique createDocument')
        return {'erro': 'Falha de comunicação com Autentique.'}
    except OSError:
        logger.error('Could not open PDF file for Autentique upload')
        return {'erro': 'Falha ao ler arquivo PDF para envio.'}


def consultar_documento(autentique_id: str) -> dict[str, Any]:
    """
    Query document status from Autentique.

    Args:
        autentique_id: Autentique document UUID

    Returns:
        dict with keys:
            id, status, files (original, signed), signatures list
            erro (str | None)
    """
    payload = {
        'query': QUERY_DOCUMENT,
        'variables': {'id': autentique_id},
    }

    try:
        response = requests.post(
            ENDPOINT,
            headers={**_get_headers(), 'Content-Type': 'application/json'},
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        if 'errors' in data:
            error_msgs = '; '.join(e.get('message', 'Erro desconhecido') for e in data['errors'])
            logger.error('Autentique GraphQL errors on document query: %s', error_msgs)
            return {'erro': error_msgs}

        doc = data.get('data', {}).get('document', {})
        files = doc.get('files', {})

        signatures = []
        for sig in doc.get('signatures', []):
            signatures.append({
                'public_id': sig.get('public_id'),
                'email': sig.get('email'),
                'nome': sig.get('name'),
                'link': sig.get('link'),
                'assinado_em': _extract_ts(sig.get('signed')),
                'visualizado_em': _extract_ts(sig.get('viewed')),
                'recusado_em': _extract_ts(sig.get('refused')),
            })

        return {
            'id': doc.get('id'),
            'status': doc.get('status'),
            'arquivo_original': files.get('original'),
            'arquivo_assinado': files.get('signed'),
            'signatures': signatures,
            'erro': None,
        }

    except requests.RequestException:
        logger.error('HTTP error communicating with Autentique consultar_documento')
        return {'erro': 'Falha de comunicação com Autentique.'}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_link(doc: dict) -> str | None:
    """Extract the first signer link as the document link (fallback)."""
    sigs = doc.get('signatures', [])
    if sigs:
        return sigs[0].get('link')
    return None


def _extract_ts(obj: dict | None) -> str | None:
    """Extract created_at from a nested timestamp object."""
    if obj and isinstance(obj, dict):
        return obj.get('created_at')
    return None
