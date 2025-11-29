#!/bin/bash

# Скрипт для запуска dev-сервера

echo "Проверка наличия Node.js..."
if command -v node &> /dev/null; then
    echo "Node.js найден: $(node --version)"
    
    if [ ! -d "node_modules" ]; then
        echo "Установка зависимостей..."
        npm install
    fi
    
    echo "Запуск Vite dev-сервера..."
    npm run dev
elif command -v python3 &> /dev/null; then
    echo "Node.js не найден. Используем Python HTTP Server..."
    echo "Сервер будет доступен по адресу: http://localhost:8000"
    python3 -m http.server 8000
else
    echo "Ошибка: не найден ни Node.js, ни Python3"
    echo "Пожалуйста, установите один из них для запуска dev-сервера"
    exit 1
fi

