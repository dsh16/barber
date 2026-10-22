# Barber

Монорепозиторий на npm workspaces: `apps/backend` — Express 5 + Sequelize 6,
`apps/frontend` — Nuxt 4. Оба приложения используют TypeScript.

## Требования

Node.js >=22.12 (рекомендуется Node 24), npm 11 и Docker Compose v2.

## Локальный запуск

Все команды выполняются из корня репозитория:

```sh
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
npm ci
npm run db:up
npm run db:migrate
npm run dev
```

Frontend: порт 3000. Backend: порт 4000. PostgreSQL: порт 5432.
`GET /api/health` проверяет процесс API, `GET /api/ready` — подключение к БД.
Бэкенд при старте требует доступную БД. Переменные backend читаются из
`apps/backend/.env`; Nuxt — из `apps/frontend/.env`. Корневой `.env` используется
Docker Compose. При изменении реквизитов БД обновите также `DATABASE_URL`.
Пароль в примере предназначен только для локальной разработки.

## Проверки и сборка

```sh
npm test
npm run typecheck
npm run build
```

Тесты API проверяют liveness и обе ветки readiness без внешней БД.
Для интеграционной проверки запустите PostgreSQL и API и запросите `/api/ready`.
После сборки приложения запускаются отдельно:

```sh
npm start -w @barber/backend
npm start -w @barber/frontend
```

При production-запуске передавайте переменные через окружение, включая
`DATABASE_URL`, `CORS_ORIGIN` и `NUXT_PUBLIC_API_BASE` (публичный адрес API).
Nuxt production-сервер автоматически `.env` не загружает.

## Миграции

Umzug хранит выполненные миграции в таблице `SequelizeMeta`.
Список миграций пока пуст: добавляйте версионированные миграции в
`apps/backend/src/migrate.ts`. Модели и предметная схема ещё не заданы.
Автоматический `sync({ alter: true })` не используется.

`npm run db:down` останавливает PostgreSQL, сохраняя данные в Docker volume.
Удаление volume уничтожает данные; смена пароля в `.env` не меняет пароль
в уже инициализированной БД.
