# Многоэтапная сборка
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы для установки зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Финальный образ с nginx
FROM nginx:alpine

# Удаляем дефолтные файлы nginx
RUN rm -rf /usr/share/nginx/html/*

WORKDIR /usr/share/nginx/html

# Копируем собранные файлы из builder
COPY --from=builder /app/dist .

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 80

# Nginx запускается автоматически
