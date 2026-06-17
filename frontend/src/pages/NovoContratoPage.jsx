import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Send,
  Save,
} from 'lucide-react';
import api from '../services/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const STEPS = ['Modelo', 'Variáveis', 'Signatários', 'Revisão'];
const DELIVERY_OPTIONS = [
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'link', label: 'Link' },
];

function substituirVariaveis(html, vars) {
  if (!html) return '';
  let result = html;
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replaceAll(`{{${key}}}`, `<strong>${value || `{{${key}}}`}</strong>`);
  });
  return result;
}

export default function NovoContratoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [modeloId, setModeloId] = useState('');
  const [variaveis, setVariaveis] = useState({});
  const [signatarios, setSignatarios] = useState([
    { nome: '', email: '', telefone: '', via: 'email' },
  ]);
  const [titulo, setTitulo] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [error, setError] = useState('');
  const [successId, setSuccessId] = useState(null);

  const { data: modelosData, isLoading: loadingModelos } = useQuery({
    queryKey: ['modelos'],
    queryFn: async () => {
      const res = await api.get('/modelos/');
      return res.data;
    },
  });
  const modelos = modelosData?.results || [];
  const modeloSelecionado = modelos.find((m) => String(m.id) === String(modeloId));

  const criarMutation = useMutation({
    mutationFn: async ({ enviar }) => {
      const payload = {
        titulo,
        empresa,
        modelo: modeloId ? Number(modeloId) : undefined,
        variaveis_preenchidas: variaveis,
        signatarios: signatarios.filter((s) => s.nome && s.email),
      };
      const res = await api.post('/contratos/', payload);
      const contratoId = res.data.id;
      if (enviar) {
        await api.post(`/contratos/${contratoId}/enviar/`);
      }
      return contratoId;
    },
    onSuccess: (contratoId) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      setSuccessId(contratoId);
    },
    onError: (err) => {
      const detail =
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data || 'Erro desconhecido.');
      setError(detail);
    },
  });

  const nextStep = () => {
    setError('');
    if (step === 0 && !modeloId) {
      setError('Selecione um modelo para continuar.');
      return;
    }
    if (step === 2) {
      const valid = signatarios.every((s) => s.nome && s.email);
      if (!valid) {
        setError('Preencha nome e e-mail de todos os signatários.');
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const addSignatario = () => {
    setSignatarios((prev) => [...prev, { nome: '', email: '', telefone: '', via: 'email' }]);
  };

  const removeSignatario = (index) => {
    setSignatarios((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSignatario = (index, field, value) => {
    setSignatarios((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  if (successId) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="card p-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Contrato criado!</h2>
          <p className="text-sm text-gray-500 mb-6">
            O contrato foi criado com sucesso.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(`/contratid/contratos/${successId}`)}
              className="btn-primary"
            >
              Ver contrato
            </button>
            <button
              onClick={() => navigate('/contratid/contratos')}
              className="btn-secondary"
            >
              Ir para contratos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/contratid/contratos')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Novo Contrato</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                i < step
                  ? 'bg-green-500 text-white'
                  : i === step
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                i === step ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 0: Select template */}
      {step === 0 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Selecionar modelo</h2>

          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="titulo">Título do contrato *</label>
              <input
                id="titulo"
                type="text"
                className="input"
                placeholder="Ex: Contrato de Prestação de Serviços"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="empresa">Empresa</label>
              <input
                id="empresa"
                type="text"
                className="input"
                placeholder="Nome da empresa (opcional)"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Modelo de contrato *</label>
            {loadingModelos ? (
              <LoadingSpinner size="sm" className="justify-start" />
            ) : modelos.length === 0 ? (
              <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                Nenhum modelo cadastrado.{' '}
                <button
                  onClick={() => navigate('/contratid/modelos/novo')}
                  className="text-primary hover:underline"
                >
                  Criar modelo
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {modelos.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      String(modeloId) === String(m.id)
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modelo"
                      value={m.id}
                      checked={String(modeloId) === String(m.id)}
                      onChange={() => {
                        setModeloId(m.id);
                        setVariaveis({});
                        if (!titulo) setTitulo(m.nome);
                      }}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.nome}</p>
                      {m.segmento && (
                        <p className="text-xs text-gray-500">{m.segmento}</p>
                      )}
                      {m.variaveis?.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {m.variaveis.length} variável(is)
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Fill variables */}
      {step === 1 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Preencher variáveis</h2>
          {!modeloSelecionado?.variaveis?.length ? (
            <p className="text-sm text-gray-500">Este modelo não possui variáveis.</p>
          ) : (
            <div className="space-y-3">
              {modeloSelecionado.variaveis.map((variavel) => (
                <div key={variavel}>
                  <label className="label">
                    {variavel.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder={`Valor para {{${variavel}}}`}
                    value={variaveis[variavel] || ''}
                    onChange={(e) =>
                      setVariaveis((prev) => ({ ...prev, [variavel]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Add signatários */}
      {step === 2 && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Signatários</h2>
            <button onClick={addSignatario} className="btn-secondary flex items-center gap-1.5 py-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </button>
          </div>
          <div className="space-y-5">
            {signatarios.map((sig, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Signatário {index + 1}</p>
                  {signatarios.length > 1 && (
                    <button
                      onClick={() => removeSignatario(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nome *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Nome completo"
                      value={sig.nome}
                      onChange={(e) => updateSignatario(index, 'nome', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">E-mail *</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="email@exemplo.com"
                      value={sig.email}
                      onChange={(e) => updateSignatario(index, 'email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Telefone</label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="(00) 00000-0000"
                      value={sig.telefone}
                      onChange={(e) => updateSignatario(index, 'telefone', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Envio via</label>
                    <select
                      className="input"
                      value={sig.via}
                      onChange={(e) => updateSignatario(index, 'via', e.target.value)}
                    >
                      {DELIVERY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Preview & Submit */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="card p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Resumo</h2>
            <dl className="text-sm space-y-2">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-28 flex-shrink-0">Título:</dt>
                <dd className="text-gray-900 font-medium">{titulo}</dd>
              </div>
              {empresa && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Empresa:</dt>
                  <dd className="text-gray-900">{empresa}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="text-gray-500 w-28 flex-shrink-0">Modelo:</dt>
                <dd className="text-gray-900">{modeloSelecionado?.nome}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-28 flex-shrink-0">Signatários:</dt>
                <dd className="text-gray-900">{signatarios.filter((s) => s.email).length}</dd>
              </div>
            </dl>
          </div>

          {modeloSelecionado?.corpo_html && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Pré-visualização</h2>
              <div
                className="prose prose-sm max-w-none text-gray-700 border border-gray-200 rounded-lg p-4 bg-gray-50 overflow-auto max-h-80"
                dangerouslySetInnerHTML={{
                  __html: substituirVariaveis(modeloSelecionado.corpo_html, variaveis),
                }}
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => criarMutation.mutate({ enviar: false })}
              disabled={criarMutation.isPending}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              {criarMutation.isPending ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
              Salvar rascunho
            </button>
            <button
              onClick={() => criarMutation.mutate({ enviar: true })}
              disabled={criarMutation.isPending}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {criarMutation.isPending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
              Criar e enviar para assinatura
            </button>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {step < 3 && (
        <div className="flex justify-between">
          <button
            onClick={() => {
              setError('');
              setStep((s) => Math.max(0, s - 1));
            }}
            disabled={step === 0}
            className="btn-secondary flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </button>
          <button onClick={nextStep} className="btn-primary flex items-center gap-1.5">
            Próximo
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
      {step === 3 && (
        <button
          onClick={() => {
            setError('');
            setStep(2);
          }}
          className="btn-secondary flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </button>
      )}
    </div>
  );
}
