# SPIRA Pinterest Agent

Автоматизированный агент для создания Pinterest-пинов с SEO-стратегией для бренда SPIRA.

## Описание

Pinterest Agent автоматически:
- Находит новые изображения в папке `content/new`
- Анализирует контент
- Генерирует SEO-оптимизированные пины
- Подготавливает метаданные
- Готовит к публикации

## Установка

```bash
npm install
```

## Настройка

1. Скопируйте `.env.example` в `.env`
2. Добавьте свои ключи API

## Запуск

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Запуск
npm start
```

## Структура папок

```
content/
├── new/          # Новые изображения
├── processed/    # Обработанные изображения
├── published/    # Опубликованные пины
└── errors/       # Ошибки обработки
```

## Зависимости

- Node.js 20+
- TypeScript
- OpenAI API
- Pinterest API
## Публикация страниц через GitHub Pages

В проекте есть статические страницы для публикации через GitHub Pages:

- `public/index.html` — главная страница
- `public/privacy-policy.html` — Privacy Policy

### Вариант 1: публикация из папки `public` через ветку `gh-pages`

1. Убедитесь, что проект загружен в GitHub-репозиторий.
2. Создайте отдельную ветку для GitHub Pages:

```bash
git subtree push --prefix public origin gh-pages
```

3. Откройте репозиторий на GitHub.
4. Перейдите в **Settings → Pages**.
5. В блоке **Build and deployment** выберите:
   - **Source:** Deploy from a branch
   - **Branch:** `gh-pages`
   - **Folder:** `/ (root)`
6. Нажмите **Save**.

После публикации страницы будут доступны по адресам:

- `https://<github-username>.github.io/<repository-name>/`
- `https://<github-username>.github.io/<repository-name>/privacy-policy.html`

### Вариант 2: публикация из корня репозитория

Если нужно публиковать GitHub Pages прямо из ветки `main`, перенесите файлы из `public/` в корень репозитория или настройте отдельный workflow GitHub Actions для деплоя папки `public`.
