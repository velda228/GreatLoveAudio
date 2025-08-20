# GreatLoveAudio - Читалка книг с озвучкой

Веб-приложение для чтения книг с функцией озвучки текста.

## Возможности
- Загрузка книг в форматах PDF, EPUB, FB2
- Чтение книг в удобном интерфейсе
- Озвучка текста с выбором голоса
- Синхронизация текста и аудио

## Структура проекта
- `backend/` - Python FastAPI сервер
- `frontend/` - React веб-приложение
- `uploads/` - Временные файлы книг
- `audio/` - Сгенерированные аудио файлы

## Запуск

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Технологии
- **Backend**: Python, FastAPI, PyPDF2, ebooklib
- **Frontend**: React, TypeScript, Web Speech API
- **Озвучка**: Web Speech API / AI TTS
