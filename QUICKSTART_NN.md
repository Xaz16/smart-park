# Быстрый старт - Интеграция нейронной сети

## Что было сделано

✅ Создан Python микросервис для работы с PyTorch моделью  
✅ Создан API endpoint в Node.js для анализа изображений  
✅ Настроена интеграция между сервисами  
✅ Обновлены Docker конфигурации для локальной и продакшен среды  

## Быстрый запуск

### 1. Локальная разработка

```bash
cd server
docker-compose up --build
```

Сервисы будут доступны:
- API: http://localhost:3000
- NN Service: http://localhost:5000

### 2. Тестирование API

#### Проверка здоровья NN сервиса:
```bash
curl http://localhost:3000/api/parking-analysis/health
```

#### Анализ изображения:
```bash
curl -X POST http://localhost:3000/api/parking-analysis \
  -F "image=@путь/к/изображению.jpg"
```

#### Анализ изображения (base64):
```bash
curl -X POST http://localhost:3000/api/parking-analysis/base64 \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."}'
```

### 3. Продакшен развертывание

```bash
cd server
# Создайте .env.prod с необходимыми переменными
docker-compose -f docker-compose.prod.yml up -d --build
```

## Структура API

### Endpoints

- `GET /api/parking-analysis/health` - проверка доступности NN сервиса
- `POST /api/parking-analysis` - анализ изображения (multipart/form-data)
- `POST /api/parking-analysis/base64` - анализ изображения (base64)

### Формат ответа

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

Где `spots_state` - массив, где:
- `1` = место свободно
- `0` = место занято

## Важные файлы

- `nn/app.py` - Python микросервис
- `nn/Dockerfile` - Docker образ для NN сервиса
- `server/src/services/nnService.ts` - сервис для взаимодействия с NN
- `server/src/controllers/parkingAnalysisController.ts` - контроллер API
- `server/src/routes/parkingAnalysisRoutes.ts` - роуты API
- `server/docker-compose.yml` - локальная разработка
- `server/docker-compose.prod.yml` - продакшен

## Дополнительная документация

- Подробная документация: `server/NN_INTEGRATION.md`
- Документация NN сервиса: `nn/README.md`

## Установка зависимостей

После клонирования проекта выполните:

```bash
# В директории server
npm install

# В директории nn (если запускаете локально без Docker)
pip install -r requirements.txt
```

## Примечания

- Убедитесь, что файл `nn/parking_classifier.pt` существует
- Для продакшена настройте переменные окружения в `.env.prod`
- NN сервис работает только внутри Docker сети и недоступен извне

