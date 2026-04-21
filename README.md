# Infinity - SaaS Carrossel e Stories

Backend MVP em `Node.js + TypeScript + Prisma + PostgreSQL` com pipeline assíncrono para geração de carrossel e stories do Instagram.

## O que foi implementado

- Schema Prisma completo para:
  - usuários, workspaces, marcas, projetos e briefs
  - posts, slides, stories
  - jobs de geração, steps, assets e exports
  - templates e perfis criativos
- Pipeline assíncrono em fila (`BullMQ + Redis`) com etapas:
  - planning
  - copy_generated
  - layout_generated
  - rendering
  - validating
  - completed
- Três modos criativos:
  - `minimal_twitter`
  - `viral_bold`
  - `hybrid`
- Formatos:
  - feed/carrossel `1080x1080`
  - story `1080x1920`
- API MVP:
  - `POST /generation-jobs`
  - `GET /generation-jobs/:jobId`

## Como rodar

1. Copie `.env.example` para `.env` (se necessario) e ajuste credenciais.
2. Suba PostgreSQL + Redis (recomendado via Docker):
   - `docker compose up -d`
3. Gere o cliente Prisma:
   - `npm run prisma:generate`
4. Rode migration inicial:
   - `npm run prisma:migrate:init`
5. Rode seed inicial (templates e perfis criativos):
   - `npm run prisma:seed`
6. Rode em dev:
   - `npm run dev`

## Payload de exemplo

`POST /generation-jobs`

```json
{
  "projectId": "proj_123",
  "postTitle": "5 erros de copy",
  "topic": "Copy para Instagram",
  "objective": "Aumentar salvamentos",
  "audience": "Criadores e infoprodutores",
  "cta": "Comente COPY para receber o checklist",
  "mode": "hybrid",
  "slideCount": 7,
  "storyFrameCount": 3,
  "generateStories": true
}
```

## Teste rapido com curl

```bash
curl -X POST http://localhost:3000/generation-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project_default",
    "postTitle": "5 erros de copy",
    "topic": "Copy para Instagram",
    "objective": "Aumentar salvamentos",
    "audience": "Criadores e infoprodutores",
    "cta": "Comente COPY para receber o checklist",
    "mode": "hybrid",
    "slideCount": 7,
    "storyFrameCount": 3,
    "generateStories": true
  }'
```

Consultar status:

```bash
curl http://localhost:3000/generation-jobs/<generationJobId>
```
