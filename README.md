# Менеджер проектов и задач

Vue 3 (клиент) + Express + MySQL (сервер). Во внешней сети фронт и API работают с **одного URL**: Express отдаёт `client/dist` и `/api`.

## Что переносить

Скопируйте репозиторий **без** `node_modules` и без `server/.env` (пароли и секреты не таскайте между машинами). На новом сервере создайте `.env` заново.

Нужны: **Node.js 18.18+** (лучше 20 LTS), **MySQL 8**. Vite 6 собирается на Node 18/20; Vite 8 на хостинге с Node < 20.12 падает с ошибкой `styleText`.

## Первый запуск на новом сервере

1. Установите зависимости и соберите фронт:

```bash
npm run install:all
npm run build
```

2. Создайте базу MySQL и пользователя.

3. Скопируйте `server/.env.example` в `server/.env` и заполните:

| Переменная | Смысл |
|---|---|
| `NODE_ENV=production` | Боевой режим |
| `FRONTEND_URL` | Публичный URL, как в адресной строке (`https://pm.example.com`) |
| `JWT_SECRET` | Длинная случайная строка |
| `DB_*` | Хост, порт, имя БД, логин, пароль |
| `COOKIE_SECURE` | `true` при HTTPS; `false`, если заходите по HTTP (IP без TLS) |
| `BITRIX24_REDIRECT_URI` | `https://ваш-домен/api/bitrix24/callback` — тот же URI в кабинете Bitrix24 |

`server/.env` читается относительно файла конфига, запускать можно из любой папки.

4. Запуск:

```bash
npm start
```

Слушает `0.0.0.0:5000` (или `HOST` / `PORT` из `.env`). Проверка: `GET /api/health` → `{"ok":true}`.

Миграции БД выполняются при старте.

## Nginx (рекомендуется HTTPS)

Проксируйте 443 на Node.

После TLS:

- `FRONTEND_URL=https://ваш-домен`
- `COOKIE_SECURE=true`
- `TRUST_PROXY=true` (уже по умолчанию)

Откройте в файрволе только 80/443, порт 5000 оставьте на localhost.

## Локальная разработка

Два процесса: API на 5000, Vite на 5173 (прокси `/api`).

```bash
npm run dev:server
npm run dev:client
```

В `server/.env`: `FRONTEND_URL=http://localhost:5173`, `COOKIE_SECURE=false` или без `NODE_ENV=production`.

## Клиент и API на разных доменах

Сборка с `client/.env`:

```
VITE_API_BASE=https://api.example.com/api
```

Тогда `FRONTEND_URL` — origin фронта, CORS и cookie `SameSite` могут потребовать донастройки; проще один домен через nginx.
