import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'visualizado', label: 'Visualizado' },
  { value: 'assinado', label: 'Assinado' },
  { value: 'recusado', label: 'Recusado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const PAGE_SIZE = 20;

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ContratosPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contratos', { search, statusFilter, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('page_size', PAGE_SIZE);
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/contratos/?${params.toString()}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const contratos = data?.results || [];
  const totalPages = data?.count ? Math.ceil(data.count / PAGE_SIZE) : 1;

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.count != null ? `${data.count} contrato${data.count !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/contratid/contratos/novo')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Contrato</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={search}
            onChange={handleSearchChange}
            className="input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={handleStatusChange}
          className="input sm:w-48"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isError ? (
          <div className="p-6 text-sm text-red-600">Erro ao carregar contratos.</div>
        ) : isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : contratos.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {search || statusFilter ? 'Nenhum resultado encontrado.' : 'Nenhum contrato cadastrado ainda.'}
            </p>
            {!search && !statusFilter && (
              <button
                onClick={() => navigate('/contratid/contratos/novo')}
                className="mt-4 btn-primary"
              >
                Criar primeiro contrato
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header rounded-tl-xl">Título</th>
                    <th className="table-header hidden md:table-cell">Empresa</th>
                    <th className="table-header">Status</th>
                    <th className="table-header hidden sm:table-cell">Criado em</th>
                    <th className="table-header rounded-tr-xl text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contratos.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/contratid/contratos/${c.id}`)}
                    >
                      <td className="table-cell font-medium text-gray-900 max-w-xs">
                        <span className="truncate block">{c.titulo}</span>
                      </td>
                      <td className="table-cell hidden md:table-cell text-gray-500">
                        {c.empresa || '—'}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="table-cell hidden sm:table-cell text-gray-500">
                        {formatDate(c.criado_em)}
                      </td>
                      <td className="table-cell text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/contratid/contratos/${c.id}`);
                          }}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary flex items-center gap-1 py-1.5 px-2.5 text-xs"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary flex items-center gap-1 py-1.5 px-2.5 text-xs"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
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
