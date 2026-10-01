# Patient Management Dashboard

React + TypeScript, FastAPI, PostgreSQL.

## Run
```
cp .env.example .env
docker compose up --build
```
Frontend: http://localhost:5173 · API: http://localhost:8000/health

## Tests and lint
- Backend: `cd backend && pytest && ruff check .`
- Frontend: `cd frontend && npm test && npm run lint && npm run typecheck`
