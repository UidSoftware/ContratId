import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, CheckCircle, CalendarDays, Plus, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore.js';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

function KPICard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">
          {value ?? <LoadingSpinner size="sm" className="justify-start mt-1" />}
        </p>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contratos', 'dashboard'],
    queryFn: async () => {
      const res = await api.get('/contratos/?page_size=100');
      return res.data;
    },
  });

  const contratos = data?.results || [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = {
    total: data?.count ?? null,
    pendentes: contratos.filter((c) => ['enviado', 'visualizado'].includes(c.status)).length,
    assinados: contratos.filter((c) => c.status === 'assinado').length,
    esteMs: contratos.filter((c) => new Date(c.criado_em) >= startOfMonth).length,
  };

  const recentes = [...contratos]
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
    .slice(0, 5);

  const firstName = user?.first_name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Olá, {firstName}!</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
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

      {/* KPIs */}
      {isError ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
          Erro ao carregar dados. Tente recarregar a página.
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={FileText} label="Total de contratos" value={isLoading ? null : (data?.count ?? 0)} color="bg-primary" />
          <KPICard icon={Clock} label="Pendentes" value={isLoading ? null : stats.pendentes} color="bg-yellow-500" />
          <KPICard icon={CheckCircle} label="Assinados" value={isLoading ? null : stats.assinados} color="bg-green-600" />
          <KPICard icon={CalendarDays} label="Este mês" value={isLoading ? null : stats.esteMs} color="bg-dark" />
        </div>
      )}

      {/* Recent contracts */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Contratos recentes</h2>
          <button
            onClick={() => navigate('/contratid/contratos')}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Ver todos <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <LoadingSpinner className="py-10" />
        ) : recentes.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhum contrato ainda.</p>
            <button
              onClick={() => navigate('/contratid/contratos/novo')}
              className="mt-4 btn-primary"
            >
              Criar primeiro contrato
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentes.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/contratid/contratos/${c.id}`)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.titulo}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(c.criado_em)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <StatusBadge status={c.status} />
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
