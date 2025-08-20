#!/bin/bash

echo "🚀 Запуск GreatLoveAudio Frontend..."

# Переход в директорию frontend
cd frontend

# Установка зависимостей если node_modules не существует
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
fi

# Запуск React приложения
echo "🌐 Запуск React приложения..."
npm start
