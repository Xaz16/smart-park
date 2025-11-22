# NN Service - Микросервис для анализа изображений парковки

Python микросервис для анализа изображений парковки с помощью PyTorch модели.

## Описание

Сервис принимает изображения парковки через HTTP API и возвращает массив состояний парковочных мест в формате `[1, 0, 1, ...]`, где:
- `1` - место свободно
- `0` - место занято

## Запуск локально (без Docker)

1. Установите зависимости:
```bash
pip install -r requirements.txt
```

2. Убедитесь, что файл модели `parking_classifier.pt` находится в текущей директории

3. Запустите сервис:
```bash
python app.py
```

Сервис будет доступен на `http://localhost:5000`

## Запуск в Docker

```bash
docker build -t smart-park-nn-service .
docker run -p 5000:5000 -v $(pwd)/parking_classifier.pt:/app/parking_classifier.pt:ro smart-park-nn-service
```

## API Endpoints

### Health Check
```
GET /health
```

Проверяет доступность сервиса и загруженность модели.

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cpu"
}
```

### Анализ изображения (multipart/form-data)
```
POST /predict
Content-Type: multipart/form-data
```

**Request:**
- `image` (file) - изображение в формате JPEG, PNG или WebP

**Response:**
```json
{
  "status": "success",
  "spots_state": [1, 0, 1, 1, 0],
  "total_spots": 5,
  "free_spots": 3,
  "occupied_spots": 2
}
```

**Пример использования с curl:**
```bash
curl -X POST http://localhost:5000/predict \
  -F "image=@parking_image.jpg"
```

### Анализ изображения (base64)
```
POST /predict-base64
Content-Type: application/json
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
  "spots_state": [1, 0, 1, 1, 0],
  "total_spots": 5,
  "free_spots": 3,
  "occupied_spots": 2
}
```

## Переменные окружения

- `MODEL_PATH` - путь к файлу модели (по умолчанию: `/app/parking_classifier.pt`)
- `PORT` - порт для запуска сервиса (по умолчанию: `5000`)

## Примечания

- Модель автоматически загружается при запуске сервиса
- Сервис поддерживает CPU и GPU (если доступно)
- Максимальный размер изображения ограничен только памятью сервера
- Рекомендуется использовать изображения размером не более 10MB

