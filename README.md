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
2. Gere o cliente Prisma:
   - `npm run prisma:generate`
3. Rode migrations:
   - `npm run prisma:migrate`
4. Suba Redis e PostgreSQL localmente.
5. Rode em dev:
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
