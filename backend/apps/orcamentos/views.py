"""Views para orçamentos."""
import logging
from decimal import Decimal

from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.contratos.models import Contrato, ModeloContrato
from .models import Orcamento
from .serializers import OrcamentoSerializer, OrcamentoListSerializer

logger = logging.getLogger(__name__)

# ----- helpers -----

def _formatar_brl(valor):
    """Formata Decimal como 'R$ 1.200,00'."""
    if valor is None:
        return 'R$ 0,00'
    return f"R$ {valor:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')


def _gerar_corpo_contrato(orcamento, modelo):
    """Substitui variáveis do modelo com dados do orçamento."""
    subtotal = orcamento.subtotal
    desconto = orcamento.desconto or Decimal('0')
    total = subtotal - desconto
    perc_desc = (desconto / subtotal * 100) if subtotal else Decimal('0')

    # Monta itens como lista para descrições individuais
    itens = list(orcamento.itens.all())
    item_descricoes = {f'item_{i+1}_descricao': it.descricao for i, it in enumerate(itens)}
    item_valores = {f'item_{i+1}_valor': _formatar_brl(it.subtotal) for i, it in enumerate(itens)}

    vars_map = {
        'titulo_servico': orcamento.observacoes or 'DESENVOLVIMENTO DE SISTEMA E WEBSITE',
        'contratante_1_nome': orcamento.cliente_nome,
        'contratante_1_cpf': orcamento.cliente_cpf_cnpj,
        'contratante_1_endereco': f"{orcamento.cliente_endereco}, {orcamento.cliente_bairro}, {orcamento.cliente_cidade}/{orcamento.cliente_estado}".strip(', '),
        'contratante_2_bloco': '',
        'bloco_assinatura_contratante_2': '',
        'descricao_sistema': itens[0].descricao if len(itens) > 0 else '',
        'descricao_site': itens[1].descricao if len(itens) > 1 else '',
        'prazo_garantia_dias': '30 (trinta)',
        'valor_site': _formatar_brl(itens[1].subtotal) if len(itens) > 1 else '',
        'valor_sistema': _formatar_brl(itens[0].subtotal) if len(itens) > 0 else '',
        'valor_hospedagem': _formatar_brl(itens[2].subtotal) if len(itens) > 2 else '',
        'valor_dominio': _formatar_brl(itens[3].subtotal) if len(itens) > 3 else '',
        'valor_total': _formatar_brl(subtotal),
        'desconto_percentual': f"{perc_desc:.2f}%".replace('.', ','),
        'desconto_valor': _formatar_brl(desconto),
        'valor_final': _formatar_brl(total),
        'num_parcelas': '1 (uma)',
        'valor_parcela': _formatar_brl(total),
        'dia_vencimento': '10',
        'prazo_execucao_dias': '45 (quarenta e cinco)',
        'local_data': f"Uberlândia/MG, {orcamento.emitido_em.strftime('%d de %B de %Y') if orcamento.emitido_em else ''}",
        **item_descricoes,
        **item_valores,
    }

    corpo = modelo.corpo_html
    for chave, valor in vars_map.items():
        corpo = corpo.replace('{{' + chave + '}}', str(valor or ''))
    return corpo


class OrcamentoViewSet(viewsets.ModelViewSet):
    """
    CRUD de Orçamentos.

    GET    /api/orcamentos/              → list
    POST   /api/orcamentos/              → create
    GET    /api/orcamentos/{id}/         → retrieve
    PUT    /api/orcamentos/{id}/         → update
    DELETE /api/orcamentos/{id}/         → soft delete (cancelado)
    POST   /api/orcamentos/{id}/aprovar/ → aprova e gera contrato
    """

    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'list':
            return OrcamentoListSerializer
        return OrcamentoSerializer

    def get_queryset(self):
        qs = Orcamento.objects.select_related(
            'empresa', 'criado_por', 'contrato'
        ).prefetch_related('itens')

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        else:
            qs = qs.exclude(status='cancelado')

        return qs

    def destroy(self, request, *args, **kwargs):
        orcamento = self.get_object()
        orcamento.status = 'cancelado'
        orcamento.save(update_fields=['status', 'atualizado_em'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='aprovar')
    def aprovar(self, request, pk=None):
        orcamento = self.get_object()

        if orcamento.status == 'aprovado':
            return Response(
                {'detail': 'Orçamento já aprovado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if orcamento.status == 'cancelado':
            return Response(
                {'detail': 'Não é possível aprovar um orçamento cancelado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            orcamento.status = 'aprovado'

            # Busca modelo mais recente da empresa (ou primeiro disponível)
            modelo = (
                ModeloContrato.objects
                .filter(empresa=orcamento.empresa, ativo=True)
                .order_by('-criado_em')
                .first()
            )

            if modelo:
                corpo_final = _gerar_corpo_contrato(orcamento, modelo)
            else:
                corpo_final = f'<p>Contrato gerado a partir do Orçamento #{orcamento.numero} — {orcamento.cliente_nome}</p>'

            contrato = Contrato.objects.create(
                empresa=orcamento.empresa,
                modelo=modelo,
                titulo=f'Contrato — {orcamento.cliente_nome}',
                corpo_final=corpo_final,
                status='rascunho',
                criado_por=request.user,
            )

            orcamento.contrato = contrato
            orcamento.save(update_fields=['status', 'contrato', 'atualizado_em'])

        return Response(
            {
                'detail': 'Orçamento aprovado e contrato gerado.',
                'contrato_id': contrato.id,
                'contrato_titulo': contrato.titulo,
            },
            status=status.HTTP_200_OK,
        )
