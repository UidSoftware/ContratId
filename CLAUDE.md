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
| Frontend | React 18 + Vite + PWA |
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
AUTENTIQUE_SANDBOX=False

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
