# Full-on Brutal Code Roast

Анонимная доска код-ревью на NestJS, Angular и PostgreSQL. Публикации сгруппированы по языкам, а обсуждение привязано к строкам конкретной ревизии кода.

## Запуск через Docker

```sh
docker compose -f compose.yaml -f compose.app.yaml up --build -d --wait
```

Откройте [доску](http://127.0.0.1:8080). Compose запускает PostgreSQL, применяет миграции, затем поднимает NestJS и Nginx с Angular. Порты привязаны к локальному интерфейсу. Пароль из Compose предназначен для локального запуска.

## Разработка

Нужны Node.js 24, npm и Docker Compose. Скопируйте `.env.example` в `.env`.

```sh
npm ci
docker compose up -d --wait db
npm run build
npm run migrate
```

В отдельных терминалах запустите `npm run dev:api` и `npm run dev:web`. Интерфейс открыт на [порту 4200](http://localhost:4200). API использует префикс `/api`. Последнюю миграцию можно откатить командой `npm run migrate:revert`.

## Тесты

```sh
npm run lint
npm test
docker compose exec -T db createdb -U roast roast_test
docker compose exec -T db createdb -U roast roast_browser
npx playwright install chromium
```

- Для Supertest задайте `TEST_DATABASE_URL=postgresql://roast:roast@127.0.0.1:5432/roast_test` и запустите `npm run test -w @roast/api -- --runInBand`. Тест очищает таблицы публикаций и обсуждений в выделенной базе перед каждым сценарием.
- Для Playwright задайте `BROWSER_DATABASE_URL=postgresql://roast:roast@127.0.0.1:5432/roast_browser`, соберите API через `npm run build -w @roast/api` и запустите `npm run test:browser`. Порты 3000 и 4200 должны быть свободны.
- Для проверки контейнерной сборки запустите весь Compose-стек и выполните `npx playwright test --config apps/web/playwright.smoke.config.ts`.

## Публикации и комментарии

- Лимит кода составляет 51 200 байт UTF-8. Пустой или состоящий из пробелов код отклоняется.
- Клик по номеру выбирает строку. Мышью можно протянуть выделение, на сенсорном экране выбрать границы двумя касаниями, а с клавиатуры использовать Shift и стрелки.
- Оценка от 1 до 5 необязательна. Среднее и число оценок считаются по комментариям выбранной ревизии.
- Изменение кода или языка создаёт новую ревизию. Предыдущие обсуждения доступны в истории.
- Сервер выдаёт секрет при создании публикации или комментария и сохраняет его хеш. Интерфейс хранит секрет в локальном хранилище браузера. Очистка данных сайта лишает автора возможности управлять записью в этом браузере. Для прямых PATCH и DELETE запросов передайте секрет как `Authorization: Bearer …`. Коды ответа `403` и `409` означают отсутствие права на редактирование и конфликт ревизий соответственно.
