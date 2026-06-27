import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import api from '../services/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const EMPTY_ITEM = { descricao: '', quantidade: '1', valor_unitario: '' };

function formatBRL(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return '';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcSubtotal(itens) {
  return itens.reduce((acc, it) => {
    const q = parseFloat(it.quantidade) || 0;
    const v = parseFloat(it.valor_unitario) || 0;
    return acc + q * v;
  }, 0);
}

const inputStyle = {
  display: 'block', width: '100%', padding: '8px 12px',
  border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 14, color: '#111827', background: '#fff',
  outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 };
const sectionStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 20 };
const sectionTitle = { fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 };

export default function OrcamentoFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const qc = useQueryClient();

  const [form, setForm] = useState({
    empresa: 1,
    valido_ate: '',
    cliente_nome: '', cliente_email: '', cliente_telefone: '',
    cliente_cpf_cnpj: '', cliente_rg: '',
    cliente_endereco: '', cliente_bairro: '',
    cliente_cidade: '', cliente_estado: '', cliente_cep: '',
    desconto: '0',
    forma_pagamento: '', observacoes: '',
  });
  const [itens, setItens] = useState([{ ...EMPTY_ITEM }]);
  const [error, setError] = useState('');

  const { data: existente, isLoading: loadingEdit } = useQuery({
    queryKey: ['orcamento', id],
    queryFn: async () => { const r = await api.get(`/orcamentos/${id}/`); return r.data; },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existente) {
      setForm({
        empresa: existente.empresa,
        valido_ate: existente.valido_ate || '',
        cliente_nome: existente.cliente_nome || '',
        cliente_email: existente.cliente_email || '',
        cliente_telefone: existente.cliente_telefone || '',
        cliente_cpf_cnpj: existente.cliente_cpf_cnpj || '',
        cliente_rg: existente.cliente_rg || '',
        cliente_endereco: existente.cliente_endereco || '',
        cliente_bairro: existente.cliente_bairro || '',
        cliente_cidade: existente.cliente_cidade || '',
        cliente_estado: existente.cliente_estado || '',
        cliente_cep: existente.cliente_cep || '',
        desconto: String(existente.desconto || '0'),
        forma_pagamento: existente.forma_pagamento || '',
        observacoes: existente.observacoes || '',
      });
      setItens(
        existente.itens?.length
          ? existente.itens.map(i => ({
              descricao: i.descricao,
              quantidade: String(i.quantidade),
              valor_unitario: String(i.valor_unitario),
            }))
          : [{ ...EMPTY_ITEM }]
      );
    }
  }, [existente]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) return api.put(`/orcamentos/${id}/`, payload);
      return api.post('/orcamentos/', payload);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] });
      navigate(`/contratid/orcamentos/${res.data.id}`);
    },
    onError: (err) => {
      const d = err.response?.data;
      setError(d?.detail || JSON.stringify(d) || 'Erro ao salvar.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const itensValidos = itens.filter(i => i.descricao && i.valor_unitario);
    if (!form.cliente_nome) { setError('Nome do cliente é obrigatório.'); return; }
    if (!form.valido_ate) { setError('Data de validade é obrigatória.'); return; }
    if (itensValidos.length === 0) { setError('Adicione ao menos um item.'); return; }
    mutation.mutate({
      ...form,
      itens: itensValidos.map(i => ({
        descricao: i.descricao,
        quantidade: parseFloat(i.quantidade) || 1,
        valor_unitario: parseFloat(i.valor_unitario) || 0,
      })),
    });
  };

  const setF = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setItem = (idx, key) => (e) => setItens(arr => arr.map((it, i) => i === idx ? { ...it, [key]: e.target.value } : it));
  const addItem = () => setItens(arr => [...arr, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setItens(arr => arr.filter((_, i) => i !== idx));

  const subtotal = calcSubtotal(itens);
  const desconto = parseFloat(form.desconto) || 0;
  const total = subtotal - desconto;

  if (isEdit && loadingEdit) return <LoadingSpinner className="py-16" />;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={18} /> Voltar
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
          {isEdit ? 'Editar Orçamento' : 'Novo Orçamento'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Validade */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Validade</div>
          <div style={{ maxWidth: 220 }}>
            <label style={labelStyle}>Válido até *</label>
            <input type="date" value={form.valido_ate} onChange={setF('valido_ate')} style={inputStyle} required />
          </div>
        </div>

        {/* Dados do Cliente */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Dados do Cliente</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Nome *</label>
              <input value={form.cliente_nome} onChange={setF('cliente_nome')} style={inputStyle} placeholder="Nome completo ou razão social" />
            </div>
            <div>
              <label style={labelStyle}>E-mail</label>
              <input type="email" value={form.cliente_email} onChange={setF('cliente_email')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Telefone</label>
              <input value={form.cliente_telefone} onChange={setF('cliente_telefone')} style={inputStyle} placeholder="(34) 9 9999-9999" />
            </div>
            <div>
              <label style={labelStyle}>CPF/CNPJ</label>
              <input value={form.cliente_cpf_cnpj} onChange={setF('cliente_cpf_cnpj')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>RG</label>
              <input value={form.cliente_rg} onChange={setF('cliente_rg')} style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Endereço</label>
              <input value={form.cliente_endereco} onChange={setF('cliente_endereco')} style={inputStyle} placeholder="Rua, nº, complemento" />
            </div>
            <div>
              <label style={labelStyle}>Bairro</label>
              <input value={form.cliente_bairro} onChange={setF('cliente_bairro')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>CEP</label>
              <input value={form.cliente_cep} onChange={setF('cliente_cep')} style={inputStyle} placeholder="38400-000" />
            </div>
            <div>
              <label style={labelStyle}>Cidade</label>
              <input value={form.cliente_cidade} onChange={setF('cliente_cidade')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <input value={form.cliente_estado} onChange={setF('cliente_estado')} style={inputStyle} maxLength={2} placeholder="MG" />
            </div>
          </div>
        </div>

        {/* Itens */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={sectionTitle}>Itens do Orçamento</div>
            <button type="button" onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              <Plus size={15} /> Adicionar item
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '0 8px 10px 0', color: '#6b7280', fontWeight: 600 }}>Descrição</th>
                <th style={{ textAlign: 'center', padding: '0 8px 10px', color: '#6b7280', fontWeight: 600, width: 80 }}>Qtd.</th>
                <th style={{ textAlign: 'right', padding: '0 8px 10px', color: '#6b7280', fontWeight: 600, width: 130 }}>Valor unit.</th>
                <th style={{ textAlign: 'right', padding: '0 0 10px 8px', color: '#6b7280', fontWeight: 600, width: 120 }}>Subtotal</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((it, idx) => {
                const sub = (parseFloat(it.quantidade) || 0) * (parseFloat(it.valor_unitario) || 0);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 8px 8px 0' }}>
                      <input value={it.descricao} onChange={setItem(idx, 'descricao')} style={{ ...inputStyle, padding: '6px 10px' }} placeholder="Ex: Desenvolvimento de Sistema" />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" min="0.001" step="0.001" value={it.quantidade} onChange={setItem(idx, 'quantidade')} style={{ ...inputStyle, padding: '6px 10px', textAlign: 'center' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" min="0" step="0.01" value={it.valor_unitario} onChange={setItem(idx, 'valor_unitario')} style={{ ...inputStyle, padding: '6px 10px', textAlign: 'right' }} placeholder="0,00" />
                    </td>
                    <td style={{ padding: '8px 0 8px 8px', textAlign: 'right', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                      {sub > 0 ? formatBRL(sub) : '—'}
                    </td>
                    <td style={{ padding: '8px 0 8px 4px', textAlign: 'center' }}>
                      {itens.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totais */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Totais</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, maxWidth: 320, marginLeft: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ color: '#6b7280', fontSize: 14 }}>Subtotal</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{formatBRL(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
              <span style={{ color: '#6b7280', fontSize: 14, flexShrink: 0 }}>Desconto (R$)</span>
              <input
                type="number" min="0" step="0.01"
                value={form.desconto} onChange={setF('desconto')}
                style={{ ...inputStyle, width: 130, padding: '6px 10px', textAlign: 'right' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', paddingTop: 10, borderTop: '2px solid #e5e7eb' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Total Geral</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#1d4ed8' }}>{formatBRL(total)}</span>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Observações</div>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={labelStyle}>Forma de pagamento</label>
              <input value={form.forma_pagamento} onChange={setF('forma_pagamento')} style={inputStyle} placeholder="Ex: PIX, 12x sem juros, à vista..." />
            </div>
            <div>
              <label style={labelStyle}>Outras observações</label>
              <textarea value={form.observacoes} onChange={setF('observacoes')} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Condições especiais, prazos, etc." />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', color: '#b91c1c', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {mutation.isPending ? 'Salvando...' : 'Salvar Orçamento'}
          </button>
        </div>
      </form>
    </div>
  );
}
