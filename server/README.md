# Smart Parking Server

Серверная часть проекта "Умная парковка" на Node.js с Express и TypeScript.

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

3. Настройте переменные окружения в `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_parking
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
```

4. Убедитесь, что PostgreSQL запущен и создана база данных. Выполните скрипт инициализации:
```bash
psql -U postgres -f db/init-db.sql
```

## Запуск

### Режим разработки
```bash
npm run dev
```

### Сборка и запуск
```bash
npm run build
npm start
```

## Авторизация и роли

Система поддерживает три типа пользователей:

1. **Водитель** - не требует авторизации, имеет доступ только к GET запросам
2. **Управляющий парковкой** (`parking_administrator`) - может управлять только назначенными ему парковками
3. **Администратор сервиса** (`service_admin`) - имеет полный доступ ко всем функциям системы

### Авторизация

#### Вход в систему
```
POST /api/auth/login
Body: {
  "username": "admin",
  "password": "password123"
}
Response: {
  "status": "success",
  "data": {
    "token": "jwt-token",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "service_admin"
    }
  }
}
```

#### Получить текущего пользователя
```
GET /api/auth/me
Headers: {
  "Authorization": "Bearer jwt-token"
}
```

#### Использование токена
Все защищенные endpoints требуют заголовок `Authorization: Bearer <token>`

## API Endpoints

### Авторизация (Auth)
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/me` - Получить текущего пользователя (требует авторизации)

### Парковки (Parkings)
- `GET /api/parkings` - Получить все парковки (доступно всем, для администраторов парковки - только их парковки)
- `GET /api/parkings/:id` - Получить парковку по ID (доступно всем)
- `POST /api/parkings` - Создать парковку (только service_admin)
- `PUT /api/parkings/:id` - Обновить парковку (service_admin или parking_administrator для своих парковок)
- `DELETE /api/parkings/:id` - Удалить парковку (только service_admin)

### Камеры (Cameras)
- `GET /api/cameras` - Получить все камеры (доступно всем)
- `GET /api/cameras/:id` - Получить камеру по ID (доступно всем)
- `POST /api/cameras` - Создать камеру (только service_admin)
- `PUT /api/cameras/:id` - Обновить камеру (только service_admin)
- `DELETE /api/cameras/:id` - Удалить камеру (только service_admin)

### Парковочные места (Parking Spots)
- `GET /api/parking-spots` - Получить все парковочные места (доступно всем, опционально: `?parking_id=1`)
- `GET /api/parking-spots/:id` - Получить парковочное место по ID (доступно всем)
- `POST /api/parking-spots` - Создать парковочное место (service_admin или parking_administrator для своих парковок)
- `PUT /api/parking-spots/:id` - Обновить парковочное место (service_admin или parking_administrator для своих парковок)
- `DELETE /api/parking-spots/:id` - Удалить парковочное место (service_admin или parking_administrator для своих парковок)

### История парковки (Parking History)
- `GET /api/parking-history` - Получить историю (доступно всем, опционально: `?parking_id=1&start_date=...&end_date=...`)
- `GET /api/parking-history/:id` - Получить запись истории по ID (доступно всем)
- `POST /api/parking-history` - Создать запись истории (service_admin или parking_administrator для своих парковок)
- `DELETE /api/parking-history/:id` - Удалить запись истории (service_admin или parking_administrator для своих парковок)

### Пользователи (Users)
- `GET /api/users` - Получить всех пользователей (только service_admin)
- `GET /api/users/:id` - Получить пользователя по ID (только service_admin)
- `POST /api/users` - Создать пользователя (только service_admin)
- `PUT /api/users/:id` - Обновить пользователя (только service_admin)
- `DELETE /api/users/:id` - Удалить пользователя (только service_admin)

### Связь парковок и камер (Parking Cameras)
- `GET /api/parking-cameras` - Получить все связи (доступно всем, опционально: `?parking_id=1&camera_id=1`)
- `GET /api/parking-cameras/:id` - Получить связь по ID (доступно всем)
- `POST /api/parking-cameras` - Создать связь (только service_admin)
- `DELETE /api/parking-cameras/:id` - Удалить связь по ID (только service_admin)
- `DELETE /api/parking-cameras/relation/remove` - Удалить связь по parking_id и camera_id (только service_admin, body: `{parking_id, camera_id}`)

### Связь пользователей и парковок (User Parkings)
- `GET /api/user-parkings` - Получить все связи (доступно всем, опционально: `?user_id=1&parking_id=1`)
- `GET /api/user-parkings/:id` - Получить связь по ID (доступно всем)
- `POST /api/user-parkings` - Создать связь (только service_admin)
- `DELETE /api/user-parkings/:id` - Удалить связь по ID (только service_admin)
- `DELETE /api/user-parkings/relation/remove` - Удалить связь по user_id и parking_id (только service_admin, body: `{user_id, parking_id}`)

## Примеры запросов

### Вход в систему
```json
POST /api/auth/login
{
  "username": "admin",
  "password": "password123"
}
```

### Создать пользователя (только service_admin)
```json
POST /api/users
Headers: {
  "Authorization": "Bearer jwt-token"
}
Body: {
  "username": "parking_admin",
  "password": "password123",
  "role": "parking_administrator",
  "is_active": true
}
```

### Назначить парковку пользователю (только service_admin)
```json
POST /api/user-parkings
Headers: {
  "Authorization": "Bearer jwt-token"
}
Body: {
  "user_id": 2,
  "parking_id": 1
}
```

### Создать парковку (только service_admin)
```json
POST /api/parkings
Headers: {
  "Authorization": "Bearer jwt-token"
}
Body: {
  "name": "Центральная парковка",
  "address": "ул. Ленина, 1",
  "total_spots": 50,
  "latitude": 55.7558,
  "longitude": 37.6173,
  "is_active": true
}
```

### Создать парковочное место (требует авторизации)
```json
POST /api/parking-spots
Headers: {
  "Authorization": "Bearer jwt-token"
}
Body: {
  "parking_id": 1,
  "spot_number": 1,
  "is_free": true,
  "coordinates": {
    "x": 10.5,
    "y": 20.3
  }
}
```

### Создать запись истории (требует авторизации)
```json
POST /api/parking-history
Headers: {
  "Authorization": "Bearer jwt-token"
}
Body: {
  "parking_id": 1,
  "spots_state": [1, 0, 1, 1, 0]
}
```

### Получить все парковки (без авторизации - для водителей)
```json
GET /api/parkings
```

### Получить парковочные места для парковки (без авторизации - для водителей)
```json
GET /api/parking-spots?parking_id=1
```

## Структура проекта

```
server/
├── src/
│   ├── config/          # Конфигурация (база данных)
│   ├── controllers/     # Контроллеры для обработки запросов
│   ├── middleware/      # Middleware (обработка ошибок, аутентификация)
│   ├── repositories/    # Репозитории для работы с базой данных (Repository pattern)
│   ├── routes/          # Маршруты API
│   ├── types/           # TypeScript типы
│   ├── utils/           # Утилиты (JWT, проверка доступа)
│   ├── app.ts           # Настройка Express приложения
│   └── server.ts        # Точка входа
├── db/                  # SQL скрипты
├── package.json
├── tsconfig.json
└── README.md
```

