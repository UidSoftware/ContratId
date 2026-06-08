# Fase 1 — MVP ContratId

> Objetivo: sistema funcional em produção com o fluxo completo de criação, envio e monitoramento de contratos via Autentique.

---

## Escopo da Fase 1

### O que entra
- [ ] Autenticação (login/logout com JWT)
- [ ] Cadastro de clientes (empresas que usam o ContratId)
- [ ] Cadastro de modelos de contrato por segmento
- [ ] Criação de contrato a partir de modelo
- [ ] Envio para assinatura via Autentique API
- [ ] Monitoramento de status (pendente / visualizado / assinado / recusado)
- [ ] Recebimento de webhook Autentique
- [ ] Download do contrato assinado (PDF)
- [ ] Painel simples (lista de contratos + filtros básicos)
- [ ] PWA funcional no mobile

### O que NÃO entra na Fase 1
- Cobrança automática por contrato (manual por enquanto)
- Multi-tenant completo (um cliente por vez na Fase 1)
- Relatórios avançados
- Integração com outros sistemas Uid (Vitastudio, etc.)
- Biometria facial

---

## Modelos de dados

### Usuario
```python
class Usuario(AbstractBaseUser):
    email = EmailField(unique=True)           # login por email
    nome = CharField(max_length=150)
    empresa = ForeignKey('Empresa', ...)
    is_active = BooleanField(default=True)
    is_admin = BooleanField(default=False)
    criado_em = DateTimeField(auto_now_add=True)
```

### Empresa (cliente da Uid)
```python
class Empresa(Model):
    nome = CharField(max_length=200)
    cnpj = CharField(max_length=18, unique=True)
    segmento = CharField(max_length=100)      # pilates, salão, loja...
    email_contato = EmailField()
    ativo = BooleanField(default=True)
    criado_em = DateTimeField(auto_now_add=True)
```

### ModeloContrato
```python
class ModeloContrato(Model):
    empresa = ForeignKey('Empresa', ...)
    nome = CharField(max_length=200)          # ex: "Contrato Aluno Pilates"
    segmento = CharField(max_length=100)
    corpo_html = TextField()                  # HTML com variáveis {{nome}}, {{cpf}}
    variaveis = JSONField(default=list)       # lista de variáveis substituíveis
    ativo = BooleanField(default=True)
    criado_em = DateTimeField(auto_now_add=True)
    atualizado_em = DateTimeField(auto_now=True)
```

### Contrato
```python
class Contrato(Model):
    STATUS = [
        ('rascunho', 'Rascunho'),
        ('enviado', 'Enviado'),
        ('visualizado', 'Visualizado'),
        ('assinado', 'Assinado'),
        ('recusado', 'Recusado'),
        ('cancelado', 'Cancelado'),       # soft delete
    ]
    empresa = ForeignKey('Empresa', ...)
    modelo = ForeignKey('ModeloContrato', null=True, ...)
    titulo = CharField(max_length=200)
    corpo_final = TextField()             # HTML já com variáveis substituídas
    status = CharField(choices=STATUS, default='rascunho')

    # Autentique
    autentique_id = CharField(max_length=100, null=True, blank=True)
    autentique_link = URLField(null=True, blank=True)
    arquivo_original = FileField(null=True, blank=True)
    arquivo_assinado = FileField(null=True, blank=True)

    criado_por = ForeignKey('Usuario', ...)
    criado_em = DateTimeField(auto_now_add=True)
    atualizado_em = DateTimeField(auto_now=True)
```

### Signatario
```python
class Signatario(Model):
    METODO = [
        ('email', 'Email'),
        ('whatsapp', 'WhatsApp'),
        ('link', 'Link de assinatura'),
    ]
    contrato = ForeignKey('Contrato', related_name='signatarios', ...)
    nome = CharField(max_length=150)
    email = EmailField()
    telefone = CharField(max_length=20, null=True, blank=True)
    metodo_envio = CharField(choices=METODO, default='email')
    autentique_public_id = CharField(max_length=100, null=True, blank=True)
    link_assinatura = URLField(null=True, blank=True)

    # Eventos (preenchidos via webhook)
    visualizado_em = DateTimeField(null=True, blank=True)
    assinado_em = DateTimeField(null=True, blank=True)
    recusado_em = DateTimeField(null=True, blank=True)
```

---

## Endpoints da API Django

### Autenticação
```
POST /api/auth/login/          → retorna access + refresh JWT
POST /api/auth/refresh/
POST /api/auth/logout/
```

### Empresas
```
GET    /api/empresas/
POST   /api/empresas/
GET    /api/empresas/{id}/
PUT    /api/empresas/{id}/
```

### Modelos de Contrato
```
GET    /api/modelos/
POST   /api/modelos/
GET    /api/modelos/{id}/
PUT    /api/modelos/{id}/
DELETE /api/modelos/{id}/      → soft delete (ativo=False)
```

### Contratos
```
GET    /api/contratos/                     → lista com filtros
POST   /api/contratos/                     → cria rascunho
GET    /api/contratos/{id}/
PUT    /api/contratos/{id}/
POST   /api/contratos/{id}/enviar/         → envia para Autentique
POST   /api/contratos/{id}/cancelar/       → soft delete
GET    /api/contratos/{id}/download/       → retorna PDF assinado
```

### Webhook
```
POST   /api/webhook/autentique/            → recebe eventos da Autentique
```

---

## Serviço Autentique (backend/contratid/apps/autentique/service.py)

### Mutation: Criar documento
```python
import requests
from django.conf import settings

AUTENTIQUE_URL = "https://api.autentique.com.br/v2/graphql"

def criar_documento(titulo: str, pdf_path: str, signatarios: list) -> dict:
    """
    signatarios: [{"nome": "...", "email": "...", "metodo": "email|whatsapp"}]
    Retorna: {"id": "...", "signatarios": [{"public_id": "...", "link": "..."}]}
    """
    signers_input = []
    for s in signatarios:
        signer = {"email": s["email"], "action": "SIGN"}
        if s.get("metodo") == "whatsapp" and s.get("telefone"):
            signer["phone"] = s["telefone"]
            signer["delivery_method"] = "DELIVERY_METHOD_WHATSAPP"
        signers_input.append(signer)

    query = """
    mutation CreateDocumentMutation(
        $document: DocumentInput!,
        $signers: [SignerInput!]!,
        $file: Upload!
    ) {
        createDocument(document: $document, signers: $signers, file: $file) {
            id
            name
            created_at
            signatures {
                public_id
                name
                email
                link { short_link }
            }
        }
    }
    """

    variables = {
        "document": {
            "name": titulo,
            "sandbox": settings.AUTENTIQUE_SANDBOX,
        },
        "signers": signers_input,
        "file": None
    }

    import json
    from form_data import FormData  # requests + multipart

    with open(pdf_path, 'rb') as f:
        response = requests.post(
            AUTENTIQUE_URL,
            headers={"Authorization": f"Bearer {settings.AUTENTIQUE_TOKEN}"},
            files={"file": f},
            data={
                "operations": json.dumps({"query": query, "variables": variables}),
                "map": '{"file": ["variables.file"]}'
            }
        )

    return response.json()["data"]["createDocument"]
```

### Query: Status do documento
```python
def consultar_documento(autentique_id: str) -> dict:
    query = """
    query {
        document(id: "%s") {
            id name
            files { original signed }
            signatures {
                public_id name email
                viewed { created_at }
                signed { created_at }
                rejected { created_at }
            }
        }
    }
    """ % autentique_id

    response = requests.post(
        AUTENTIQUE_URL,
        headers={
            "Authorization": f"Bearer {settings.AUTENTIQUE_TOKEN}",
            "Content-Type": "application/json"
        },
        json={"query": query}
    )
    return response.json()["data"]["document"]
```

---

## Webhook Autentique

### View Django
```python
# apps/autentique/views.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

@csrf_exempt
def webhook_autentique(request):
    if request.method != "POST":
        return JsonResponse({"erro": "método não permitido"}, status=405)

    payload = json.loads(request.body)
    evento = payload.get("event")          # "document_signed", "document_viewed", etc.
    doc_id = payload.get("document", {}).get("id")

    if not doc_id:
        return JsonResponse({"ok": False})

    try:
        contrato = Contrato.objects.get(autentique_id=doc_id)
        processar_evento_webhook(contrato, evento, payload)
    except Contrato.DoesNotExist:
        pass  # documento não pertence a este sistema

    return JsonResponse({"ok": True})


def processar_evento_webhook(contrato, evento, payload):
    from django.utils import timezone
    agora = timezone.now()

    if evento == "document_signed":
        contrato.status = "assinado"
        contrato.save()
    elif evento == "document_viewed":
        contrato.status = "visualizado"
        contrato.save()
    elif evento == "document_rejected":
        contrato.status = "recusado"
        contrato.save()
```

---

## Frontend — Páginas Fase 1

| Rota | Componente | Descrição |
|---|---|---|
| `/contratid/login` | `LoginPage` | Autenticação JWT |
| `/contratid/` | `DashboardPage` | Resumo + KPIs |
| `/contratid/contratos` | `ContratosPage` | Lista com filtros |
| `/contratid/contratos/novo` | `NovoContratoPage` | Seleção de modelo + signatários |
| `/contratid/contratos/:id` | `ContratoDetalhe` | Status + timeline + download |
| `/contratid/modelos` | `ModelosPage` | Gestão de templates |
| `/contratid/modelos/novo` | `NovoModeloPage` | Editor HTML com variáveis |

---

## Docker Compose (Fase 1)

```yaml
version: '3.9'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: contratid
      POSTGRES_USER: uid
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    env_file: .env
    volumes:
      - media:/app/media
    depends_on:
      - db
    expose:
      - "8000"

  frontend:
    build: ./frontend
    expose:
      - "80"

volumes:
  pgdata:
  media:
```

> Nginx-proxy global da Uid roteia `contratid.uidsoftware.com.br` para a porta correta (padrão Uid: porta 8003+)

---

## Checklist de entrega Fase 1

### Backend
- [ ] Models criados e migrations aplicadas
- [ ] Autenticação JWT funcionando
- [ ] CRUD de Empresas, Modelos, Contratos
- [ ] Serviço Autentique integrado (criar + consultar)
- [ ] Endpoint de webhook funcionando
- [ ] Download de PDF assinado via URL Autentique

### Frontend
- [ ] Login com JWT
- [ ] Lista de contratos com status visual
- [ ] Fluxo: novo contrato → preenche dados → envia → acompanha
- [ ] PWA configurado (manifest + service worker)
- [ ] Responsivo mobile

### Infra
- [ ] Docker Compose funcionando local
- [ ] Deploy no VPS (porta 8003+)
- [ ] Nginx-proxy configurado
- [ ] SSL via Certbot
- [ ] Variáveis de ambiente configuradas
- [ ] AUTENTIQUE_SANDBOX=False em produção

---

## Próximas fases (planejamento)

| Fase | Foco |
|---|---|
| Fase 2 | Multi-tenant: cada cliente Uid com sua conta isolada |
| Fase 3 | Cobrança automática por contrato (integração financeira) |
| Fase 4 | Integração com demais sistemas Uid (Vitastudio, etc.) |
| Fase 5 | Modelos por segmento revisados juridicamente (parceria advogada) |
| Fase 6 | Biometria facial via Autentique |
