import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import api from '../services/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'recusado', label: 'Recusado' },
  { value: 'expirado', label: 'Expirado' },
  { value: 'cancelado', label: 'Cancelado' },
];

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

function StatusBadgeOrc({ status }) {
  const s = STATUS_BADGE[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 500, display: 'inline-block',
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function formatBRL(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const PAGE_SIZE = 20;

export default function OrcamentosPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orcamentos', { statusFilter, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/orcamentos/?${params}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const orcamentos = data?.results || [];
  const totalPages = data?.count ? Math.ceil(data.count / PAGE_SIZE) : 1;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.count != null ? `${data.count} orçamento${data.count !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <button onClick={() => navigate('/contratid/orcamentos/novo')} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Orçamento</span>
        </button>
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input sm:w-52">
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isError ? (
          <div className="p-6 text-sm text-red-600">Erro ao carregar orçamentos.</div>
        ) : isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : orcamentos.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhum orçamento encontrado.</p>
            {!statusFilter && (
              <button onClick={() => navigate('/contratid/orcamentos/novo')} className="mt-4 btn-primary">
                Criar primeiro orçamento
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Nº</th>
                    <th className="table-header">Cliente</th>
                    <th className="table-header hidden sm:table-cell">Emitido em</th>
                    <th className="table-header hidden md:table-cell">Válido até</th>
                    <th className="table-header hidden md:table-cell text-right">Total</th>
                    <th className="table-header">Status</th>
                    <th className="table-header text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orcamentos.map(o => (
                    <tr
                      key={o.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/contratid/orcamentos/${o.id}`)}
                    >
                      <td className="table-cell font-mono text-gray-500 text-sm">#{o.numero}</td>
                      <td className="table-cell font-medium text-gray-900">{o.cliente_nome}</td>
                      <td className="table-cell hidden sm:table-cell text-gray-500 text-sm">{formatDate(o.emitido_em)}</td>
                      <td className="table-cell hidden md:table-cell text-gray-500 text-sm">{formatDate(o.valido_ate)}</td>
                      <td className="table-cell hidden md:table-cell text-right font-medium text-gray-900 text-sm">{formatBRL(o.total_geral)}</td>
                      <td className="table-cell"><StatusBadgeOrc status={o.status} /></td>
                      <td className="table-cell text-right">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/contratid/orcamentos/${o.id}`); }}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">Página {page} de {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary flex items-center gap-1 py-1.5 px-2.5 text-xs">
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary flex items-center gap-1 py-1.5 px-2.5 text-xs">
                    Próximo <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
