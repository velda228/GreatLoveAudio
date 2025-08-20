#!/bin/bash

echo "🚀 Запуск GreatLoveAudio Backend..."

# Переход в директорию backend
cd backend

# Создание виртуального окружения если его нет
if [ ! -d "venv" ]; then
    echo "📦 Создание виртуального окружения..."
    python3 -m venv venv
fi

# Активация виртуального окружения
echo "🔧 Активация виртуального окружения..."
source venv/bin/activate

# Установка зависимостей
echo "📚 Установка зависимостей..."
pip install -r requirements.txt

# Запуск сервера
echo "🌐 Запуск FastAPI сервера..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
