import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, CheckCircle, Printer, FileText } from 'lucide-react';
import api from '../services/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const STATUS_BADGE = {
  rascunho:  { bg: '#f3f4f6', color: '#374151' },
  enviado:   { bg: '#dbeafe', color: '#1d4ed8' },
  aprovado:  { bg: '#d1fae5', color: '#065f46' },
  recusado:  { bg: '#fee2e2', color: '#b91c1c' },
  expirado:  { bg: '#fef9c3', color: '#92400e' },
  cancelado: { bg: '#f3f4f6', color: '#9ca3af' },
};
const STATUS_LABELS = {
  rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado',
  recusado: 'Recusado', expirado: 'Expirado', cancelado: 'Cancelado',
};

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
function formatBRL(v) {
  const n = Number(v);
  if (isNaN(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function OrcamentoDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [aprovarError, setAprovarError] = useState('');

  const { data: orc, isLoading } = useQuery({
    queryKey: ['orcamento', id],
    queryFn: async () => { const r = await api.get(`/orcamentos/${id}/`); return r.data; },
  });

  const aprovarMutation = useMutation({
    mutationFn: () => api.post(`/orcamentos/${id}/aprovar/`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] });
      qc.invalidateQueries({ queryKey: ['orcamento', id] });
      setShowModal(false);
      navigate(`/contratid/contratos/${res.data.contrato_id}`);
    },
    onError: (err) => {
      setAprovarError(err.response?.data?.detail || 'Erro ao aprovar.');
    },
  });

  if (isLoading) return <LoadingSpinner className="py-16" />;
  if (!orc) return <div className="p-8 text-gray-500">Orçamento não encontrado.</div>;

  const subtotal = orc.subtotal ?? orc.itens?.reduce((acc, i) => acc + Number(i.subtotal || 0), 0) ?? 0;
  const desconto = Number(orc.desconto) || 0;
  const total = orc.total_geral ?? (subtotal - desconto);
  const badge = STATUS_BADGE[orc.status] || STATUS_BADGE.rascunho;
  const podeAprovar = ['rascunho', 'enviado'].includes(orc.status);
  const podeEditar = ['rascunho'].includes(orc.status);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Cabeçalho ações */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }} className="no-print">
        <button onClick={() => navigate('/contratid/orcamentos')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
          <ArrowLeft size={17} /> Orçamentos
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          {podeEditar && (
            <button onClick={() => navigate(`/contratid/orcamentos/${id}/editar`)} className="btn-secondary flex items-center gap-2">
              <Pencil size={15} /> Editar
            </button>
          )}
          {podeAprovar && (
            <button onClick={() => { setAprovarError(''); setShowModal(true); }} className="btn-primary flex items-center gap-2">
              <CheckCircle size={15} /> Aprovar e Gerar Contrato
            </button>
          )}
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
            <Printer size={15} /> Imprimir
          </button>
        </div>
      </div>

      {/* Documento */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '40px 48px', fontFamily: 'DM Sans, Arial, sans-serif', fontSize: 13, color: '#111827' }} id="print-area">
        {/* Topo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 20, borderBottom: '2px solid #111827' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 }}>UID SOFTWARE E TECNOLOGIA</div>
            <div style={{ color: '#6b7280', lineHeight: 1.6 }}>
              CNPJ: 60.939.393/0001-25<br />
              Rua Bahia, nº 1220, Bairro Brasil, Uberlândia/MG, CEP 38400-662<br />
              contato@uidsoftware.com.br
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#1d4ed8', letterSpacing: -1 }}>Orçamento</div>
            <div style={{ color: '#6b7280', marginTop: 4 }}>Nº <strong>#{orc.numero}</strong></div>
          </div>
        </div>

        {/* Metadados */}
        <div style={{ display: 'flex', gap: 32, marginBottom: 24, background: '#f9fafb', borderRadius: 8, padding: '12px 16px' }}>
          <div><div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Emitido em</div><div style={{ fontWeight: 600 }}>{formatDate(orc.emitido_em)}</div></div>
          <div><div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Válido até</div><div style={{ fontWeight: 600 }}>{formatDate(orc.valido_ate)}</div></div>
          <div><div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Status</div>
            <span style={{ background: badge.bg, color: badge.color, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{STATUS_LABELS[orc.status]}</span>
          </div>
        </div>

        {/* Dados do cliente */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #e5e7eb' }}>Dados do Cliente</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 32px' }}>
            <Row label="Cliente" value={orc.cliente_nome} />
            <Row label="E-mail" value={orc.cliente_email} />
            <Row label="Telefone" value={orc.cliente_telefone} />
            <Row label="CPF/CNPJ" value={orc.cliente_cpf_cnpj} />
            {orc.cliente_rg && <Row label="RG" value={orc.cliente_rg} />}
            {orc.cliente_endereco && <Row label="Endereço" value={orc.cliente_endereco} span />}
            {orc.cliente_cidade && <Row label="Cidade" value={`${orc.cliente_cidade}${orc.cliente_estado ? '/' + orc.cliente_estado : ''}`} />}
            {orc.cliente_cep && <Row label="CEP" value={orc.cliente_cep} />}
          </div>
        </div>

        {/* Tabela de itens */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #e5e7eb' }}>Orçamento</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1d4ed8', color: '#fff' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderRadius: '6px 0 0 6px' }}>Item</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Produto/Serviço</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, width: 70 }}>Qtd.</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, width: 110 }}>Valor</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, width: 120, borderRadius: '0 6px 6px 0' }}>Sub-Total</th>
              </tr>
            </thead>
            <tbody>
              {(orc.itens || []).map((it, idx) => (
                <tr key={it.id || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={{ padding: '9px 12px', color: '#6b7280', fontWeight: 600 }}>{String(idx + 1).padStart(2, '0')}</td>
                  <td style={{ padding: '9px 12px' }}>{it.descricao}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>{Number(it.quantidade)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>{formatBRL(it.valor_unitario)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{formatBRL(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totais */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
          <div style={{ minWidth: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f9fafb', borderRadius: '6px 6px 0 0', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ color: '#6b7280' }}>Subtotal Geral</span>
              <span style={{ fontWeight: 600 }}>{formatBRL(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ color: '#6b7280' }}>Desconto</span>
              <span style={{ fontWeight: 600, color: '#dc2626' }}>{desconto > 0 ? `- ${formatBRL(desconto)}` : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#1d4ed8', borderRadius: '0 0 6px 6px' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Total Geral</span>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{formatBRL(total)}</span>
            </div>
          </div>
        </div>

        {/* Observações */}
        {(orc.forma_pagamento || orc.observacoes) && (
          <div style={{ marginBottom: 28, background: '#f9fafb', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 8 }}>Observações</div>
            {orc.forma_pagamento && <div style={{ marginBottom: 4 }}><strong>Forma de pagamento:</strong> {orc.forma_pagamento}</div>}
            {orc.observacoes && <div style={{ whiteSpace: 'pre-wrap' }}>{orc.observacoes}</div>}
          </div>
        )}

        {/* Assinaturas */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 220, borderTop: '1px solid #374151', paddingTop: 6, color: '#6b7280', fontSize: 12 }}>Uid Software Tecnologia</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 220, borderTop: '1px solid #374151', paddingTop: 6, color: '#6b7280', fontSize: 12 }}>{orc.cliente_nome}</div>
          </div>
        </div>

        {orc.contrato && (
          <div style={{ marginTop: 20, background: '#d1fae5', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }} className="no-print">
            <FileText size={16} style={{ color: '#065f46' }} />
            <span style={{ color: '#065f46', fontSize: 13 }}>Contrato gerado:</span>
            <button onClick={() => navigate(`/contratid/contratos/${orc.contrato}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', textDecoration: 'underline', fontSize: 13 }}>
              Ver contrato
            </button>
          </div>
        )}
      </div>

      {/* Modal Aprovar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 420, width: '90%' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Aprovar Orçamento</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
              Confirma a aprovação do orçamento <strong>#{orc.numero}</strong> para <strong>{orc.cliente_nome}</strong>?<br /><br />
              Um contrato em rascunho será gerado automaticamente com os dados e valores deste orçamento.
            </p>
            {aprovarError && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '8px 14px', fontSize: 13, marginBottom: 14 }}>{aprovarError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={() => aprovarMutation.mutate()} disabled={aprovarMutation.isPending} className="btn-primary flex items-center gap-2">
                <CheckCircle size={15} />
                {aprovarMutation.isPending ? 'Aprovando...' : 'Confirmar Aprovação'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@media print { .no-print { display: none !important; } #print-area { border: none !important; box-shadow: none !important; } }`}</style>
    </div>
  );
}

function Row({ label, value, span }) {
  if (!value) return null;
  return (
    <div style={span ? { gridColumn: '1 / -1' } : {}}>
      <span style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}: </span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
