# Интеграция нейронной сети - Документация

## Обзор

В проект интегрирован Python микросервис для анализа изображений парковки с помощью PyTorch модели. Сервис определяет свободные и занятые парковочные места на изображении.

## Архитектура

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │────────▶│ Node.js API  │────────▶│ NN Service  │
│  (Frontend) │         │   (Server)   │         │  (Python)   │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │  PostgreSQL  │
                        └──────────────┘
```

## Структура проекта

```
smart-park/
├── nn/                          # Python микросервис
│   ├── app.py                   # Flask приложение
│   ├── requirements.txt         # Python зависимости
│   ├── Dockerfile               # Docker образ для NN сервиса
│   ├── parking_classifier.pt    # PyTorch модель
│   └── README.md                # Документация NN сервиса
├── server/                      # Node.js сервер
│   ├── src/
│   │   ├── services/
│   │   │   └── nnService.ts     # Сервис для взаимодействия с NN
│   │   ├── controllers/
│   │   │   └── parkingAnalysisController.ts
│   │   └── routes/
│   │       └── parkingAnalysisRoutes.ts
│   └── docker-compose.yml      # Локальная разработка
└── docker-compose.prod.yml      # Продакшен
```

## API Endpoints

### 1. Проверка доступности NN сервиса

```
GET /api/parking-analysis/health
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "nn_service": "available"
  }
}
```

### 2. Анализ изображения (загрузка файла)

```
POST /api/parking-analysis
Content-Type: multipart/form-data
Authorization: Bearer <token> (опционально)
```

**Request:**
- `image` (file) - изображение в формате JPEG, PNG или WebP (макс. 10MB)

**Response:**
```json
{
  "status": "success",
  "data": {
    "status": "success",
    "spots_state": [1, 0, 1, 1, 0],
    "total_spots": 5,
    "free_spots": 3,
    "occupied_spots": 2
  }
}
```

**Пример с curl:**
```bash
curl -X POST http://localhost:3000/api/parking-analysis \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@parking_image.jpg"
```

### 3. Анализ изображения (base64)

```
POST /api/parking-analysis/base64
Content-Type: application/json
Authorization: Bearer <token> (опционально)
```

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "status": "success",
    "spots_state": [1, 0, 1, 1, 0],
    "total_spots": 5,
    "free_spots": 3,
    "occupied_spots": 2
  }
}
```

## Локальная разработка

### Запуск с Docker Compose

1. Убедитесь, что файл модели находится в `nn/parking_classifier.pt`

2. Запустите все сервисы:
```bash
cd server
docker-compose up --build
```

Сервисы будут доступны:
- Node.js API: `http://localhost:3000`
- NN Service: `http://localhost:5000`
- PostgreSQL: `localhost:5432`

### Переменные окружения

Для сервера (в `.env` или `docker-compose.yml`):
```env
NN_SERVICE_URL=http://nn-service:5000
NN_SERVICE_TIMEOUT=30000
```

## Продакшен развертывание

### Запуск на удаленном сервере

1. Скопируйте файлы на сервер:
   - `server/` - весь каталог сервера
   - `nn/` - весь каталог с нейронной сетью
   - `client/` - весь каталог клиента (если нужно)

2. Создайте файл `.env.prod` в директории `server/`:
```env
DB_HOST=db
DB_PORT=5432
DB_NAME=smart_parking
DB_USER=smart_park
DB_PASSWORD=your_secure_password
PORT=3000
NODE_ENV=production
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
TRAEFIK_DOMAIN=your-domain.com
TRAEFIK_ACME_EMAIL=your-email@example.com
```

3. Запустите с помощью docker-compose:
```bash
cd server
docker-compose -f docker-compose.prod.yml up -d --build
```

### Проверка работы

1. Проверьте статус контейнеров:
```bash
docker-compose -f docker-compose.prod.yml ps
```

2. Проверьте логи:
```bash
docker-compose -f docker-compose.prod.yml logs nn-service
docker-compose -f docker-compose.prod.yml logs server
```

3. Проверьте health check:
```bash
curl https://your-domain.com/api/parking-analysis/health
```

## Устранение неполадок

### NN сервис не отвечает

1. Проверьте, что контейнер запущен:
```bash
docker ps | grep nn-service
```

2. Проверьте логи:
```bash
docker logs smart-park-nn-service
```

3. Убедитесь, что модель загружена:
```bash
curl http://localhost:5000/health
```

### Ошибка "Model not loaded"

- Убедитесь, что файл `parking_classifier.pt` существует в `nn/`
- Проверьте, что файл смонтирован в контейнер (в docker-compose.yml)
- Проверьте права доступа к файлу

### Ошибка "NN Service is not available"

- Проверьте, что `NN_SERVICE_URL` правильно настроен
- Убедитесь, что контейнеры находятся в одной Docker сети
- Проверьте, что порт 5000 не заблокирован

### Медленная работа

- Убедитесь, что используется GPU (если доступно)
- Увеличьте `NN_SERVICE_TIMEOUT` в переменных окружения
- Проверьте размер изображений (рекомендуется < 10MB)

## Интеграция с существующим кодом

### Сохранение результатов анализа

Вы можете сохранить результаты анализа в базу данных через существующий API:

```typescript
// После получения результатов от NN сервиса
const result = await nnService.predictImage(imageBuffer);

// Сохранить в историю парковки
await parkingHistoryRepository.create({
  parking_id: parkingId,
  spots_state: result.spots_state
});
```

### Обновление состояния парковочных мест

```typescript
// Обновить состояние каждого места
for (let i = 0; i < result.spots_state.length; i++) {
  await parkingSpotRepository.update(spotId, {
    is_free: result.spots_state[i] === 1
  });
}
```

## Дополнительные настройки

### Изменение порта NN сервиса

В `docker-compose.yml`:
```yaml
nn-service:
  environment:
    PORT: 5001  # Изменить порт
```

И в `.env` сервера:
```env
NN_SERVICE_URL=http://nn-service:5001
```

### Настройка таймаутов

В `.env` сервера:
```env
NN_SERVICE_TIMEOUT=60000  # 60 секунд
```

## Безопасность

- NN сервис работает только внутри Docker сети и не доступен извне
- API endpoints защищены авторизацией (опциональной для публичного доступа)
- Ограничение размера файла: 10MB
- Валидация типов файлов (только изображения)

## Производительность

- Рекомендуется использовать GPU для ускорения инференса
- Кэширование результатов может быть добавлено при необходимости
- Для высокой нагрузки рассмотрите использование очередей (RabbitMQ, Redis)

