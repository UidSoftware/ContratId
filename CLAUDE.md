# CLAUDE.md — ContratId

> Âncora do projeto. Leia este arquivo antes de qualquer coisa.

---

## O que é o ContratId

**ContratId** é um SaaS interno da **Uid Software e Tecnologia LTDA** para gestão e assinatura eletrônica de contratos.

- Produto próprio da Uid, usado internamente e licenciado para clientes Uid
- Foco: MEI, Micro e Pequeno Empresário
- Propósito ESG: eliminar papel, reduzir impressão, digitalizar contratos
- Modelo de receita: mensalidade do cliente Uid + cobrança por contrato emitido

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Django REST Framework + JWT |
| Frontend | React 18 + Vite (sem PWA — desabilitado, causa cache agressivo) |
| Banco | PostgreSQL |
| Infra | Docker + Nginx + SSL + VPS |
| Assinatura | Autentique API v2 (GraphQL) |
| Auth | Email + JWT (padrão Uid) |

---

## Integração Autentique

- **Endpoint:** `https://api.autentique.com.br/v2/graphql`
- **Auth:** `Authorization: Bearer TOKEN`
- **Protocolo:** GraphQL (mutations + queries)
- **Sandbox:** parâmetro `sandbox: true` nos documentos de teste
- **Webhook:** recebe eventos de assinatura em tempo real

### Custos por operação (produção)
| Ação | Custo |
|---|---|
| Criar documento | R$ 0,06 |
| Signatário por email | R$ 0,013 |
| Signatário Google/Microsoft/Facebook | R$ 0,00 |
| Signatário por WhatsApp | R$ 0,12 |
| Webhook | R$ 0,0002 |

---

## Modelo de negócio

```
Uid Software (conta master Autentique)
    ↓
Clientes Uid (estúdio, salão, loja, etc.)
    ↓
Clientes finais deles (alunos, clientes)
    ↓
Assina via email / Google / WhatsApp
```

- Uid paga plano Autentique (R$ 99/mês profissional)
- Uid cobra ~R$ 1,00 por contrato do cliente
- Margem bruta por contrato: ~93%

---

## Decisões técnicas consolidadas

- Autenticação por **email** (padrão Uid)
- Soft delete obrigatório em todos os modelos
- DECIMAL para valores monetários
- Paginação sempre via `response.data.results`
- `base: '/contratid/'` no vite.config.js — **imutável**
- Contratos armazenados com versionamento (S3 ou volume Docker)
- Assinatura simples (CPF / email / Google) — sem exigência de ICP-Brasil para MEI

---


## SSO com SystemD

O ContratID aceita tokens JWT gerados pelo SystemD via endpoint `/api/auth/sso/`.

```
# Fluxo SSO (usado pelo SystemD para sync automático de orçamentos)
SystemD gera JWT assinado com SECRET_KEY do SystemD
POST /api/auth/sso/  →  { token: "<jwt>" }
ContratID valida com SYSTEMD_JWT_KEY (= SECRET_KEY do SystemD)
Resposta: { access: "<contratid_jwt>", refresh: "..." }

# Também usado pelo ContratosPage do SystemD (iframe com hash URL)
# <iframe src="https://contratid.../contratid/#sso=TOKEN" />
# PrivateRoute lê window.location.hash e autentica silenciosamente
```

Variável obrigatória no `.env` do ContratID:
```
SYSTEMD_JWT_KEY=<igual ao SECRET_KEY do SystemD>
```

---

## Módulo Orçamentos (`apps/orcamentos/`)

Orçamentos recebidos via sync automático do SystemD.

### Model principal
```python
class Orcamento(models.Model):
    empresa         = ForeignKey('empresas.Empresa')
    valido_ate      = DateField()
    status          = CharField(choices=[rascunho, enviado, aprovado, recusado, expirado, cancelado])
    cliente_nome, cliente_email, cliente_telefone, cliente_cpf_cnpj, cliente_cidade, cliente_estado
    desconto        = DecimalField()
    forma_pagamento, observacoes = TextField
    ativo           = BooleanField(default=True)

class ItemOrcamento(models.Model):
    orcamento      = ForeignKey(Orcamento, related_name='itens')
    ordem, descricao, quantidade (Decimal,3), valor_unitario (Decimal,2)
```

### Endpoints
```
GET/POST /api/orcamentos/        — lista e criação (requer auth ContratID)
PATCH    /api/orcamentos/{id}/   — atualização (chamado pelo SystemD no sync)
```

Dados de cliente/prospecto são copiados do SystemD no momento do sync —
ContratID não tem FK para entidades do SystemD.

---

## ModeloContrato — Fluir (ID=1)

Modelo criado com o contrato Fluir revisado por advogado. 22 variáveis `{{token}}`:

```
{{titulo_servico}}  {{contratante_1_nome}}  {{contratante_1_cpf}}
{{contratante_1_endereco}}  {{contratante_2_bloco}}
{{descricao_sistema}}  {{descricao_site}}
{{prazo_garantia_dias}}
{{valor_site}}  {{valor_sistema}}  {{valor_hospedagem}}  {{valor_dominio}}
{{valor_total}}  {{desconto_percentual}}  {{desconto_valor}}  {{valor_final}}
{{num_parcelas}}  {{valor_parcela}}  {{dia_vencimento}}
{{prazo_execucao_dias}}  {{local_data}}  {{bloco_assinatura_contratante_2}}
```

---

## Service Worker / PWA

`vite-plugin-pwa` foi REMOVIDO — causava cache agressivo impossível de limpar.

Nginx retorna 404 para `sw.js`, `workbox-*.js`, `registerSW.js`.
Rota `/contratid/clear-sw` deregistra qualquer SW residual via JS.
index.html tem `Cache-Control: no-cache, no-store, must-revalidate`.

---

## Estrutura do repositório

```
ContratId/
├── CLAUDE.md                  ← você está aqui
├── instrucoes/
│   └── fase1.md               ← MVP: base do sistema
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── contratid/
│       ├── settings.py
│       ├── urls.py
│       └── apps/
│           ├── contratos/
│           ├── signatarios/
│           ├── autentique/    ← serviço de integração
│           ├── orcamentos/    ← sync automático do SystemD
│           ├── empresas/
│           └── usuarios/
├── frontend/
│   ├── Dockerfile
│   ├── vite.config.js
│   └── src/
│       ├── pages/
│       ├── components/
│       └── services/
│           └── autentiqueService.js
├── nginx/
│   └── nginx.conf
└── docker-compose.yml
```

---

## Variáveis de ambiente obrigatórias

```env
# Django
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=

# Banco
DATABASE_URL=

# Autentique
AUTENTIQUE_TOKEN=
AUTENTIQUE_SANDBOX=False   # False = produção real

# SSO com SystemD (mesmo valor do SECRET_KEY do SystemD)
SYSTEMD_JWT_KEY=

# VPS
DOMAIN=contratid.uidsoftware.com.br
```

---

## Regras do projeto

1. **Direto em produção** — sem ambiente staging separado na Fase 1
2. Todo contrato criado via API Autentique tem `sandbox: false` em produção
3. Webhook Autentique deve atualizar status do contrato no banco imediatamente
4. Nenhum dado sensível (CPF, token) em log
5. Contratos nunca são deletados — apenas `status: cancelado` (soft delete)
6. Modelos de contrato por segmento revisados pela advogada parceira da Uid

---

## Contatos Uid Software

- WhatsApp: (34) 99134-9194
- Email: contato@uidsoftware.com.br
- Site: www.uidsoftware.com.br
