# Типы камер

Система поддерживает несколько типов камер для мониторинга парковок.

## Типы камер

### 1. `rtsp` (по умолчанию)
RTSP поток с IP-камеры. Требует `rtsp_url`.

**Пример создания:**
```json
POST /api/cameras
{
  "name": "Камера парковки 1",
  "camera_type": "rtsp",
  "rtsp_url": "rtsp://192.168.1.100:554/stream",
  "is_active": true
}
```

**Статус:** В разработке (заглушка)

### 2. `static`
Статические изображения из папки `public/{camera_id}/*`. Изображения переключаются циклически.

**Пример создания:**
```json
POST /api/cameras
{
  "name": "Статическая камера 1",
  "camera_type": "static",
  "is_active": true
}
```

**Требования:**
- Создайте папку `server/public/{camera_id}/` (где `{camera_id}` - ID камеры)
- Поместите изображения (`.jpg`, `.jpeg`, `.png`, `.webp`) в эту папку
- Изображения будут обрабатываться в алфавитном порядке

**Пример структуры:**
```
server/
  public/
    1/          # camera_id = 1
      image1.jpg
      image2.jpg
      image3.png
    2/          # camera_id = 2
      frame1.jpg
      frame2.jpg
```

**Статус:** ✅ Реализовано

### 3. `http`
HTTP endpoint, возвращающий изображение.

**Пример создания:**
```json
POST /api/cameras
{
  "name": "HTTP камера",
  "camera_type": "http",
  "rtsp_url": "http://192.168.1.100/snapshot.jpg",
  "is_active": true
}
```

**Статус:** В разработке (заглушка)

### 4. `file`
Изображение из файла на диске.

**Статус:** В разработке (заглушка)

## Связывание камеры с парковкой

После создания камеры свяжите её с парковкой:

```json
POST /api/parking-cameras
{
  "parking_id": 1,
  "camera_id": 1
}
```

## Миграция базы данных

Если база данных уже существует, выполните миграцию:

```bash
psql -U postgres -d smart_parking -f db/migration_add_camera_type.sql
```

Или через Docker:

```bash
docker exec -i smart-park-postgres psql -U postgres -d smart_parking < server/db/migration_add_camera_type.sql
```

## Как это работает

1. **Загрузка камер:** При запуске сервис загружает все активные камеры из БД
2. **Обработка кадров:** Каждые 15 секунд сервис получает кадр от каждой камеры
3. **Анализ:** Кадр отправляется в NN сервис для анализа
4. **Сохранение:** Результаты сохраняются в базу данных и обновляют статусы парковочных мест

## Пример использования

1. Создайте static камеру:
```bash
curl -X POST http://localhost:3000/api/cameras \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Камера парковки 1",
    "camera_type": "static"
  }'
```

2. Создайте папку с изображениями:
```bash
mkdir -p server/public/1
cp your_images/*.jpg server/public/1/
```

3. Свяжите камеру с парковкой:
```bash
curl -X POST http://localhost:3000/api/parking-cameras \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parking_id": 1,
    "camera_id": 1
  }'
```

4. Сервис автоматически начнет обрабатывать изображения при следующем цикле (каждые 15 секунд)

