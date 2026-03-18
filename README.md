# FrameAgent — SaaS de Criação de Mídia com IA

**Status:** MVP Dia 1 ✅ | **Deadline MVP:** 01/04/2026

---

## O que é

FrameAgent é um SaaS composável de criação e edição de imagens/vídeos para agentes de IA. Modelo BYOK (Bring Your Own Keys) — o usuário traz suas próprias API keys de fal.ai, ElevenLabs, Hedra, Gemini, OpenAI, etc., e usa tudo via uma única interface visual.

**Diferenciais:**
- 🔑 BYOK — sem markup em cima das APIs, sem lock-in
- 🔀 Pipeline composável — encadeie geradores, editores, renderers
- 🤖 API para agentes de IA — jobs via REST, webhooks de retorno
- 📱 Reel automático 9:16 — geração → edição → lip sync → composição
- 💳 Preço por crédito — pague só pelo que usa

---

## Dia 1: Setup Completo ✅

### Tarefas Concluídas

- [x] **GitHub Repo** — `MarianaAssistente/frameagent` (público)
- [x] **Next.js 14** — App Router + Tailwind CSS + shadcn/ui
- [x] **Supabase Schema** — 6 tabelas (users, jobs, assets, api_keys, credit_transactions, plans)
- [x] **Clerk Auth** — Sign-in/Sign-up pages, middleware, webhook
- [x] **Dashboard MVP** — Landing page + 5 páginas autenticadas
- [x] **Vercel Deploy** — Auto-deploy on push configurado
- [x] **Env Vars** — Supabase + Clerk (placeholder) prontos

### Stack

| Componente | Tecnologia | Status |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + Tailwind + shadcn/ui | ✅ Pronto |
| **Auth** | Clerk | ✅ Integrado (placeholders) |
| **DB** | Supabase (PostgreSQL) | ✅ Schema criado |
| **Deploy** | Vercel | ✅ Projeto criado |
| **Git** | GitHub (MarianaAssistente org) | ✅ Repo público |
| **Backend** | FastAPI (Dia 2) | ⏳ TODO |
| **Queue** | BullMQ + Upstash Redis (Dia 2) | ⏳ TODO |
| **Payment** | Stripe (Dia 3) | ⏳ TODO |

---

## URLs

- **Deploy Vercel:** https://frameagent.vercel.app (em deploy, ~2 min)
- **GitHub Repo:** https://github.com/MarianaAssistente/frameagent
- **Pesquisa (Atena):** `/home/ceo-mariana/.openclaw/workspace/shared/research/SYNTHIO_RESEARCH_2026-03-18.md`
- **Project Tracker:** FRA-001 no Supabase Tasks

---

## Configuração Local

### Pré-requisitos
- Node.js 18+
- npm / yarn
- `.env.local` com as variáveis (veja `.env.example`)

### Setup
```bash
npm install
npm run dev
# Acessa http://localhost:3000
```

### Variáveis de Ambiente Necessárias

**Clerk:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — criar em dashboard.clerk.com
- `CLERK_SECRET_KEY` — criar em dashboard.clerk.com
- `CLERK_WEBHOOK_SECRET` — opcional, para webhooks

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL` — ✅ já configurado
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — ✅ já configurado
- `SUPABASE_SERVICE_ROLE_KEY` — ✅ já configurado

---

## Próximos Passos

### Dia 2 (19/03)
- [ ] Integração fal.ai (image + video generation)
- [ ] BullMQ + Upstash Redis para job queue
- [ ] API endpoint `/api/jobs` (criar/listar/status)
- [ ] Worker Python FastAPI (processamento assíncrono)
- [ ] Webhook de retorno para agentes

### Dia 3 (20/03)
- [ ] Integração Stripe (pagamento + webhook)
- [ ] Página de upgrade de planos
- [ ] Credit system (debit on job completion)
- [ ] API keys encryption (BYOK armazenamento seguro)

### Semana 2 (24-28/03)
- [ ] Avatar lip sync (Hedra + ElevenLabs)
- [ ] Pipeline Reel compose (input: prompt → output: vídeo 9:16)
- [ ] Histórico de jobs + assets
- [ ] Documentação de API

### Semana 3 (31/03 - 01/04)
- [ ] Testes end-to-end
- [ ] QA + refinements
- [ ] **MVP Release — 01/04/2026**

---

## Estrutura do Projeto

```
frameagent/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── jobs/
│   │   │   ├── assets/
│   │   │   ├── keys/
│   │   │   └── settings/
│   │   └── layout.tsx
│   ├── api/
│   │   ├── webhooks/clerk/
│   │   ├── jobs/ (TODO)
│   │   └── keys/ (TODO)
│   ├── page.tsx (landing)
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── supabase.ts
│   └── utils.ts
├── types/
│   └── database.ts
├── components/
│   ├── ui/ (shadcn)
│   ├── layout/
│   └── dashboard/
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── public/
├── .env.example
├── middleware.ts
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── package.json
└── README.md
```

---

## Contribuidores

- **Hefesto** (CTO) — Arquitetura, scaffolding, deploy
- **Atena** (CSO) — Pesquisa, estratégia de produto
- **Mariana** (CEO) — Coordenação, integração GitHub + Vercel

---

## Licença

Proprietário — STM Group, 2026

---

*Last updated: 18/03/2026 · Próxima atualização: 19/03/2026 (Dia 2)*
