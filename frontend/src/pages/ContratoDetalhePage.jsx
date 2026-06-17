import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Send,
  XCircle,
  Download,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  AlertCircle,
  User,
} from 'lucide-react';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SIGNATARIO_STATUS_LABELS = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  visualizado: 'Visualizado',
  assinado: 'Assinado',
  recusado: 'Recusado',
};

function TimelineStep({ label, date, done, active }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : active ? (
          <Clock className="h-5 w-5 text-primary" />
        ) : (
          <Circle className="h-5 w-5 text-gray-300" />
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${done || active ? 'text-gray-900' : 'text-gray-400'}`}>
          {label}
        </p>
        {date && <p className="text-xs text-gray-500 mt-0.5">{formatDate(date)}</p>}
      </div>
    </div>
  );
}

export default function ContratoDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: contrato,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['contrato', id],
    queryFn: async () => {
      const res = await api.get(`/contratos/${id}/`);
      return res.data;
    },
    refetchInterval: 30000, // auto-refresh every 30 seconds
  });

  const enviarMutation = useMutation({
    mutationFn: () => api.post(`/contratos/${id}/enviar/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato', id] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: () => api.post(`/contratos/${id}/cancelar/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato', id] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
  });

  const handleDownload = async () => {
    try {
      const res = await api.get(`/contratos/${id}/download/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contrato-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Erro ao baixar o PDF. Tente novamente.');
    }
  };

  if (isLoading) {
    return <LoadingSpinner className="py-24" size="lg" />;
  }

  if (isError || !contrato) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700">Contrato não encontrado ou erro ao carregar.</p>
          <button onClick={() => navigate('/contratid/contratos')} className="mt-4 btn-secondary">
            Voltar aos contratos
          </button>
        </div>
      </div>
    );
  }

  const { status } = contrato;
  const isRascunho = status === 'rascunho';
  const isAssinado = status === 'assinado';
  const isCancelado = status === 'cancelado';
  const canCancel = !['cancelado', 'assinado', 'recusado'].includes(status);

  const timelineSteps = [
    { label: 'Criado', date: contrato.criado_em, key: 'criado' },
    { label: 'Enviado', date: contrato.enviado_em, key: 'enviado' },
    { label: 'Visualizado', date: contrato.visualizado_em, key: 'visualizado' },
    {
      label: status === 'recusado' ? 'Recusado' : 'Assinado',
      date: contrato.assinado_em || contrato.recusado_em,
      key: 'concluido',
    },
  ];

  const stepsDone = {
    criado: true,
    enviado: ['enviado', 'visualizado', 'assinado', 'recusado'].includes(status),
    visualizado: ['visualizado', 'assinado', 'recusado'].includes(status),
    concluido: ['assinado', 'recusado'].includes(status),
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate('/contratid/contratos')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos contratos
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 break-words">{contrato.titulo}</h1>
            {contrato.empresa && (
              <p className="text-sm text-gray-500 mt-1">{contrato.empresa}</p>
            )}
          </div>
          <StatusBadge status={status} size="lg" />
        </div>
      </div>

      {/* Mutation error messages */}
      {(enviarMutation.isError || cancelarMutation.isError) && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Ocorreu um erro. Tente novamente.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {isRascunho && (
          <button
            onClick={() => enviarMutation.mutate()}
            disabled={enviarMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {enviarMutation.isPending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
            Enviar para assinatura
          </button>
        )}
        {isAssinado && (
          <button onClick={handleDownload} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => {
              if (window.confirm('Tem certeza que deseja cancelar este contrato?')) {
                cancelarMutation.mutate();
              }
            }}
            disabled={cancelarMutation.isPending}
            className="btn-danger flex items-center gap-2"
          >
            {cancelarMutation.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Cancelar contrato
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Info card */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Informações</h2>
          <dl className="space-y-2.5">
            {contrato.criado_por && (
              <div>
                <dt className="text-xs text-gray-500">Criado por</dt>
                <dd className="text-sm text-gray-900">
                  {contrato.criado_por.first_name
                    ? `${contrato.criado_por.first_name} ${contrato.criado_por.last_name || ''}`.trim()
                    : contrato.criado_por.email}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500">Criado em</dt>
              <dd className="text-sm text-gray-900">{formatDate(contrato.criado_em)}</dd>
            </div>
            {contrato.modelo && (
              <div>
                <dt className="text-xs text-gray-500">Modelo</dt>
                <dd className="text-sm text-gray-900">{contrato.modelo_nome || contrato.modelo}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Timeline card */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Linha do tempo</h2>
          <div className="space-y-4">
            {timelineSteps.map((step, index) => (
              <TimelineStep
                key={step.key}
                label={step.label}
                date={step.date}
                done={stepsDone[step.key]}
                active={
                  !stepsDone[step.key] &&
                  (index === 0 || stepsDone[timelineSteps[index - 1]?.key])
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Signatários */}
      {contrato.signatarios && contrato.signatarios.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            Signatários ({contrato.signatarios.length})
          </h2>
          <div className="space-y-3">
            {contrato.signatarios.map((sig) => (
              <div
                key={sig.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sig.nome}</p>
                    <p className="text-xs text-gray-500">{sig.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sig.visualizado_em && !sig.assinado_em && (
                    <Eye className="h-4 w-4 text-yellow-500" title="Visualizado" />
                  )}
                  {sig.assinado_em && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" title="Assinado" />
                  )}
                  <span className="text-xs text-gray-500">
                    {SIGNATARIO_STATUS_LABELS[sig.status] || sig.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-refresh notice */}
      {!isCancelado && !isAssinado && (
        <p className="text-xs text-center text-gray-400">
          Status atualizado automaticamente a cada 30 segundos.
        </p>
      )}
    </div>
  );
}
