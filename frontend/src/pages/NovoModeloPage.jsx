import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import api from '../services/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const SEGMENTO_OPTIONS = [
  { value: '', label: 'Selecione o segmento' },
  { value: 'servicos', label: 'Prestação de Serviços' },
  { value: 'comercio', label: 'Comércio' },
  { value: 'educacao', label: 'Educação' },
  { value: 'saude', label: 'Saúde' },
  { value: 'beleza', label: 'Beleza e Estética' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'construcao', label: 'Construção Civil' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'outros', label: 'Outros' },
];

const VARIAVEIS_SUGERIDAS = [
  'nome', 'cpf', 'cnpj', 'endereco', 'cidade', 'estado',
  'email', 'telefone', 'data_inicio', 'data_fim', 'valor', 'descricao_servico',
];

export default function NovoModeloPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [nome, setNome] = useState('');
  const [segmento, setSegmento] = useState('');
  const [corpoHtml, setCorpoHtml] = useState('');
  const [variaveis, setVariaveis] = useState([]);
  const [novaVariavel, setNovaVariavel] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: modeloExistente, isLoading: loadingModelo } = useQuery({
    queryKey: ['modelo', id],
    queryFn: async () => {
      const res = await api.get(`/modelos/${id}/`);
      return res.data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (modeloExistente) {
      setNome(modeloExistente.nome || '');
      setSegmento(modeloExistente.segmento || '');
      setCorpoHtml(modeloExistente.corpo_html || '');
      setVariaveis(modeloExistente.variaveis || []);
    }
  }, [modeloExistente]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome,
        segmento: segmento || null,
        corpo_html: corpoHtml,
        variaveis,
      };
      if (isEditing) {
        const res = await api.put(`/modelos/${id}/`, payload);
        return res.data;
      } else {
        const res = await api.post('/modelos/', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos'] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: ['modelo', id] });
      }
      setSuccess(true);
      setTimeout(() => navigate('/contratid/modelos'), 1500);
    },
    onError: (err) => {
      const detail =
        err.response?.data?.nome?.[0] ||
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data || 'Erro ao salvar modelo.');
      setError(detail);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!nome.trim()) {
      setError('O nome do modelo é obrigatório.');
      return;
    }
    saveMutation.mutate();
  };

  const addVariavel = () => {
    const v = novaVariavel.trim().replace(/\s+/g, '_').toLowerCase();
    if (!v) return;
    if (variaveis.includes(v)) {
      setNovaVariavel('');
      return;
    }
    setVariaveis((prev) => [...prev, v]);
    setNovaVariavel('');
  };

  const removeVariavel = (v) => {
    setVariaveis((prev) => prev.filter((x) => x !== v));
  };

  const insertVariable = (v) => {
    setCorpoHtml((prev) => prev + `{{${v}}}`);
  };

  const addSugerida = (v) => {
    if (!variaveis.includes(v)) {
      setVariaveis((prev) => [...prev, v]);
    }
  };

  if (isEditing && loadingModelo) {
    return <LoadingSpinner className="py-24" size="lg" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/contratid/modelos')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Modelo' : 'Novo Modelo'}
        </h1>
      </div>

      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>Modelo salvo com sucesso! Redirecionando...</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Informações básicas</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="nome">Nome do modelo *</label>
              <input
                id="nome"
                type="text"
                className="input"
                placeholder="Ex: Contrato de Prestação de Serviços"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="segmento">Segmento</label>
              <select
                id="segmento"
                className="input"
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
              >
                {SEGMENTO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Variables */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Variáveis</h2>
          <p className="text-sm text-gray-500">
            Defina as variáveis que serão substituídas no contrato. Use{' '}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">{'{{variavel}}'}</code>{' '}
            no HTML abaixo.
          </p>

          {/* Current variables */}
          {variaveis.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {variaveis.map((v) => (
                <div
                  key={v}
                  className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full text-xs font-mono"
                >
                  <button
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="hover:underline"
                    title="Inserir no HTML"
                  >
                    {`{{${v}}}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeVariavel(v)}
                    className="text-blue-400 hover:text-red-500 ml-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add variable */}
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="nome_variavel"
              value={novaVariavel}
              onChange={(e) => setNovaVariavel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addVariavel();
                }
              }}
            />
            <button
              type="button"
              onClick={addVariavel}
              className="btn-secondary flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          </div>

          {/* Suggestions */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Sugestões:</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIAVEIS_SUGERIDAS.filter((v) => !variaveis.includes(v)).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => addSugerida(v)}
                  className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 px-2 py-0.5 rounded font-mono transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* HTML editor */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Corpo do contrato (HTML)</h2>
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className="btn-secondary flex items-center gap-1.5 py-1.5 text-xs"
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Editor
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Pré-visualizar
                </>
              )}
            </button>
          </div>

          {showPreview ? (
            <div
              className="prose prose-sm max-w-none p-4 border border-gray-200 rounded-lg bg-white min-h-64 overflow-auto"
              dangerouslySetInnerHTML={{ __html: corpoHtml || '<p class="text-gray-400">Nada para pré-visualizar.</p>' }}
            />
          ) : (
            <textarea
              className="input font-mono text-xs leading-relaxed resize-none"
              style={{ minHeight: '320px' }}
              placeholder={`<p>Este contrato é celebrado entre <strong>{{contratante}}</strong> e <strong>{{contratado}}</strong>...</p>`}
              value={corpoHtml}
              onChange={(e) => setCorpoHtml(e.target.value)}
            />
          )}

          <p className="text-xs text-gray-400">
            Use HTML para formatar o contrato. Clique em uma variável acima para inseri-la no cursor.
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saveMutation.isPending || success}
            className="btn-primary flex items-center gap-2"
          >
            {saveMutation.isPending ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
            {isEditing ? 'Salvar alterações' : 'Criar modelo'}
          </button>
        </div>
      </form>
    </div>
  );
}
