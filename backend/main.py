from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import shutil
from pathlib import Path
from book_parser import BookParser
from text_to_speech import TextToSpeech

app = FastAPI(title="GreatLoveAudio API", version="1.0.0")

# Настройка CORS для frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Создание директорий
UPLOAD_DIR = Path("uploads")
AUDIO_DIR = Path("audio")
UPLOAD_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(exist_ok=True)

book_parser = BookParser()
tts = TextToSpeech()

@app.get("/")
async def root():
    return {"message": "GreatLoveAudio API работает!"}

@app.post("/upload-book")
async def upload_book(file: UploadFile = File(...)):
    """Загрузка книги и извлечение текста"""
    try:
        # Проверка формата файла
        allowed_formats = ['.pdf', '.epub', '.fb2', '.txt']
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_formats:
            raise HTTPException(status_code=400, detail="Неподдерживаемый формат файла")
        
        # Сохранение файла
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Парсинг книги
        book_content = book_parser.parse_book(file_path)
        
        return {
            "success": True,
            "filename": file.filename,
            "content": book_content,
            "total_pages": len(book_content) if isinstance(book_content, list) else 1
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обработке файла: {str(e)}")

@app.post("/generate-speech")
async def generate_speech(text: str, voice: str = "default"):
    """Генерация аудио из текста"""
    try:
        audio_data = tts.generate_speech(text, voice)
        return {
            "success": True,
            "audio_data": audio_data,
            "voice": voice
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при генерации аудио: {str(e)}")

@app.get("/available-voices")
async def get_available_voices():
    """Получение списка доступных голосов"""
    voices = tts.get_available_voices()
    return {"voices": voices}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
