# Envio de Termos de Responsabilidade

Sistema interno da **Monte Bravo Investimentos** para automatizar o envio de Termos de Responsabilidade de equipamentos corporativos para assinatura digital via DocuSign.

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React 18, Vite, TypeScript, MUI v6, TanStack Query, React Router v7 |
| Backend | Node.js 22+, Express, TypeScript, Zod, SQLite (`node:sqlite` nativo) |
| Integrações | GLPI REST API, Monday.com GraphQL API, DocuSign eSignature (JWT Grant) |
| Conversão PDF | LibreOffice Headless (DOCX → PDF) |
| Infra | Docker Compose, Nginx (proxy reverso), Ubuntu 22.04 |

## Fluxo Principal

1. Usuário faz login no sistema
2. Pesquisa colaborador por email corporativo
3. Backend busca dados pessoais (Monday.com ou planilha Excel) + equipamentos atribuídos (GLPI)
4. Usuário seleciona equipamentos e escolhe destino do termo (email pessoal ou corporativo)
5. Backend gera DOCX preenchido → converte para PDF via LibreOffice → envia ao DocuSign
6. Colaborador recebe o documento pronto para assinatura
7. Registro é salvo no histórico (SQLite)

## Estrutura do Projeto

```
envio-termo/
├── backend/
│   ├── src/
│   │   ├── config/          # Validação env (Zod) + SQLite setup
│   │   ├── controllers/     # Handlers Express
│   │   ├── middleware/       # Auth JWT, validação Zod, rate limit, error handler
│   │   ├── repositories/    # Acesso a dados (termos, users)
│   │   ├── routes/          # Definição das rotas /api
│   │   ├── services/        # GLPI, DocuSign, Monday, DOCX, PDF, Auth
│   │   │   └── providers/   # Strategy pattern (Excel/Monday)
│   │   ├── types/           # Interfaces + schemas Zod
│   │   └── utils/           # Logger, AppError, asyncHandler
│   ├── data/                # SQLite + planilha Excel (runtime)
│   ├── templates/           # ModeloTermo.docx
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/           # Login, Home, Result, History, Users
│   │   ├── components/      # Layout, AssetList, Snackbar
│   │   ├── contexts/        # AuthContext (JWT + localStorage)
│   │   ├── hooks/           # React Query wrappers
│   │   ├── services/        # Axios client com interceptors
│   │   ├── theme/           # Tema corporativo MUI
│   │   └── types/           # Tipagens compartilhadas
│   ├── Dockerfile
│   └── nginx.conf           # Proxy reverso /api → backend
├── docker-compose.yml
└── README.md
```


## Endpoints da API

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/health` | Não | Health check |
| POST | `/api/auth/login` | Não | Login (rate limited: 5/min) |
| GET | `/api/auth/me` | Sim | Dados do usuário logado |
| PUT | `/api/auth/change-password` | Sim | Alterar senha |
| PUT | `/api/auth/avatar` | Sim | Atualizar foto de perfil |
| GET | `/api/users-management` | Sim | Listar usuários |
| POST | `/api/users-management` | Sim | Criar usuário |
| PUT | `/api/users-management/:id` | Sim | Editar usuário |
| DELETE | `/api/users-management/:id` | Sim | Excluir usuário |
| GET | `/api/users/:email/assets` | Sim | Equipamentos do colaborador (GLPI) |
| GET | `/api/monday/employee/:email` | Sim | Dados pessoais do colaborador |
| POST | `/api/terms/generate` | Sim | Gerar e enviar termo via DocuSign |
| GET | `/api/terms` | Sim | Histórico de termos enviados |
| GET | `/api/terms/:id` | Sim | Detalhes de um termo |

## Segurança

- Autenticação JWT com expiração de 24h
- Rate limiting no login (5 tentativas/min por IP)
- Logout automático no frontend quando token expira (401)
- Senhas hasheadas com bcrypt (salt rounds: 10)
- CORS configurável via variável de ambiente
- Trust proxy habilitado para IP real via Nginx

## Banco de Dados (SQLite)

**Tabela `termos`:** id, nome, email, equipamentos (JSON), envelopeId, status, createdAt

**Tabela `users`:** id, name, email, password (bcrypt), avatar (base64), createdAt
