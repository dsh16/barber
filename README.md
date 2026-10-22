# Barber

Монорепозиторий на npm workspaces: `apps/backend` — Express 5 + Sequelize 6,
`apps/frontend` — Nuxt 4. Оба приложения используют TypeScript.

Публикация фронтенда на GitHub Pages и API с внешней PostgreSQL: [DEPLOY.md](DEPLOY.md).

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

Без `TEST_DATABASE_URL` выполняются unit-тесты, интеграционные тесты пропускаются.
Для тестов с PostgreSQL создайте отдельную БД с именем, заканчивающимся на `_test`,
и запустите `TEST_DATABASE_URL=postgres://.../barber_test npm test`.
CI выполняет оба набора тестов с отдельным PostgreSQL.
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
Добавляйте версионированные миграции в `apps/backend/src/migrations.ts`.
Первая миграция создаёт мастеров, услуги, записи и демонстрационный каталог.
Автоматический `sync({ alter: true })` не используется.

`npm run db:down` останавливает PostgreSQL, сохраняя данные в Docker volume.
Удаление volume уничтожает данные; смена пароля в `.env` не меняет пароль
в уже инициализированной БД.

## Клиентская запись

Главная страница: мастер (или «Любой мастер») → услуга → имя и телефон → номер.
Запись сохраняется в PostgreSQL. Пока все услуги доступны у всех мастеров.
`masterId: null` означает отсутствие предпочтения; автоматического назначения нет.
Каталог мастеров и услуг демонстрационный — замените его до реального запуска.

- `GET /api/catalog` — мастера и услуги.
- `POST /api/bookings` — `{ requestId, masterId, serviceId, name, phone }`.
  `requestId` — UUID v4, `masterId` — ID или `null`. Ответ: `{ queueNumber }`.
  Новая запись возвращает 201, повтор того же запроса — 200 с тем же номером.
  Изменение данных с прежним `requestId` возвращает 409.

Очередь общая для барбершопа, номера постоянно возрастают и не сбрасываются по дням.
Номер — идентификатор записи, не текущая позиция и не время приёма.
PostgreSQL sequence допускает пропуски после отката транзакций.
Телефон нормализуется в международную форму; российский префикс 8 заменяется на +7.
Личных данных в публичном ответе нет. Список записей и админка пока не реализованы.
