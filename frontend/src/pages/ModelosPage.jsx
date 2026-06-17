import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, BookTemplate, AlertCircle } from 'lucide-react';
import api from '../services/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ModelosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['modelos'],
    queryFn: async () => {
      const res = await api.get('/modelos/');
      return res.data;
    },
  });
  const modelos = data?.results || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/modelos/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos'] });
      setDeletingId(null);
    },
    onError: () => {
      setDeletingId(null);
      alert('Erro ao excluir modelo.');
    },
  });

  const handleDelete = (id, nome) => {
    if (window.confirm(`Excluir o modelo "${nome}"? Esta ação não pode ser desfeita.`)) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {modelos.length > 0 ? `${modelos.length} modelo${modelos.length !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/contratid/modelos/novo')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Modelo</span>
        </button>
      </div>

      {isError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Erro ao carregar modelos.</span>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : modelos.length === 0 ? (
          <div className="py-16 text-center">
            <BookTemplate className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhum modelo cadastrado ainda.</p>
            <button
              onClick={() => navigate('/contratid/modelos/novo')}
              className="mt-4 btn-primary"
            >
              Criar primeiro modelo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Nome</th>
                  <th className="table-header hidden sm:table-cell">Segmento</th>
                  <th className="table-header hidden md:table-cell">Variáveis</th>
                  <th className="table-header hidden sm:table-cell">Criado em</th>
                  <th className="table-header text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {modelos.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-medium text-gray-900">
                      {m.nome}
                    </td>
                    <td className="table-cell hidden sm:table-cell text-gray-500">
                      {m.segmento || '—'}
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      {m.variaveis?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {m.variaveis.slice(0, 3).map((v) => (
                            <span
                              key={v}
                              className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-mono"
                            >
                              {`{{${v}}}`}
                            </span>
                          ))}
                          {m.variaveis.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{m.variaveis.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="table-cell hidden sm:table-cell text-gray-500">
                      {formatDate(m.criado_em)}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/contratid/modelos/${m.id}/editar`)}
                          className="p-1.5 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, m.nome)}
                          disabled={deletingId === m.id}
                          className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          {deletingId === m.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
