// Глобальные переменные
let currentBook = null;
let currentPage = 0;
let isPlaying = false;
let isPaused = false;
let speechSynthesis = null;
let currentUtterance = null;
let currentWordIndex = 0;
let words = [];
let autoNextPage = true;
let currentSpeed = 1.0;
let highlightInterval = null;
let wordTimings = [];
let startTime = 0;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Инициализация приложения
function initializeApp() {
    // Проверяем поддержку Web Speech API
    if ('speechSynthesis' in window) {
        speechSynthesis = window.speechSynthesis;
        console.log('Web Speech API поддерживается');
    } else {
        console.log('Web Speech API не поддерживается');
        alert('Ваш браузер не поддерживает озвучку. Обновите браузер.');
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Загрузка файла по клику
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // Drag and Drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Выбор файла
    fileInput.addEventListener('change', handleFileSelect);
    
    // Контроль скорости
    const speedSlider = document.getElementById('speedSlider');
    if (speedSlider) {
        speedSlider.addEventListener('input', function() {
            currentSpeed = parseFloat(this.value);
            document.getElementById('speedValue').textContent = currentSpeed.toFixed(1);
            if (isPlaying && currentUtterance) {
                currentUtterance.rate = currentSpeed;
                // Пересчитываем тайминги при изменении скорости
                recalculateWordTimings();
            }
        });
    }
}

// Обработка Drag and Drop
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#5a6fd8';
    e.currentTarget.style.background = '#f0f2ff';
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#667eea';
    e.currentTarget.style.background = '#f8f9ff';
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#667eea';
    e.currentTarget.style.background = '#f8f9ff';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// Обработка выбора файла
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Обработка файла
function handleFile(file) {
    // Проверка формата
    const allowedFormats = ['.pdf', '.epub', '.fb2', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedFormats.includes(fileExtension)) {
        alert('Неподдерживаемый формат файла. Поддерживаются: PDF, EPUB, FB2, TXT');
        return;
    }
    
    // Показываем прогресс загрузки
    showUploadProgress();
    
    // Создаем FormData для отправки
    const formData = new FormData();
    formData.append('file', file);
    
    // Отправляем файл на backend
    uploadFile(formData);
}

// Отправка файла на backend
async function uploadFile(formData) {
    try {
        const response = await fetch('http://localhost:8000/upload-book', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Сохраняем данные книги
            currentBook = {
                filename: data.filename,
                content: data.content,
                total_pages: data.total_pages
            };
            
            // Показываем результат
            showUploadResult();
            
            // Обновляем читалку
            updateReader();
            
        } else {
            throw new Error('Ошибка при обработке файла');
        }
        
    } catch (error) {
        console.error('Ошибка при загрузке файла:', error);
        alert('Ошибка при загрузке файла: ' + error.message);
        hideUploadProgress();
    }
}

// Показать прогресс загрузки
function showUploadProgress() {
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'block';
    
    // Анимация прогресса
    let progress = 0;
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
        }
        progressFill.style.width = progress + '%';
        progressText.textContent = `Обработка файла... ${Math.round(progress)}%`;
    }, 200);
}

// Скрыть прогресс загрузки
function hideUploadProgress() {
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadArea').style.display = 'block';
}

// Показать результат загрузки
function showUploadResult() {
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadResult').style.display = 'block';
    
    document.getElementById('resultTitle').textContent = `Книга "${currentBook.filename}" загружена!`;
    document.getElementById('resultInfo').textContent = `Обработано страниц: ${currentBook.total_pages}`;
}

// Обновить читалку
function updateReader() {
    if (currentBook) {
        document.getElementById('noBookMessage').style.display = 'none';
        document.getElementById('bookReader').style.display = 'flex';
        
        // Обновляем информацию о книге
        document.getElementById('bookTitle').textContent = currentBook.filename;
        document.getElementById('bookPages').textContent = `Страниц: ${currentBook.total_pages}`;
        
        // Создаем оглавление
        createTableOfContents();
        
        // Показываем первую страницу
        showPage(0);
        
        // Обновляем навигацию
        updateNavigation();
    }
}

// Создать оглавление
function createTableOfContents() {
    const contentsList = document.getElementById('contentsList');
    contentsList.innerHTML = '';
    
    const content = currentBook.content;
    let totalPages = 0;
    
    if (Array.isArray(content)) {
        totalPages = content.length;
        content.forEach((page, index) => {
            const item = document.createElement('div');
            item.className = 'content-item';
            item.textContent = `Страница ${index + 1}`;
            item.onclick = () => goToPage(index);
            contentsList.appendChild(item);
        });
    } else {
        // Если контент - строка, разбиваем на страницы
        const words = content.split(' ');
        const wordsPerPage = 200;
        totalPages = Math.ceil(words.length / wordsPerPage);
        
        for (let i = 0; i < totalPages; i++) {
            const item = document.createElement('div');
            item.className = 'content-item';
            item.textContent = `Страница ${i + 1}`;
            item.onclick = () => goToPage(i);
            contentsList.appendChild(item);
        }
    }
    
    // Обновляем общее количество страниц
    currentBook.total_pages = totalPages;
}

// Перейти на страницу
function goToPage(pageIndex) {
    if (isPlaying) {
        stopAudio();
    }
    showPage(pageIndex);
    
    // Обновляем активный элемент в оглавлении
    updateActiveContentItem(pageIndex);
}

// Обновить активный элемент оглавления
function updateActiveContentItem(pageIndex) {
    const items = document.querySelectorAll('.content-item');
    items.forEach((item, index) => {
        if (index === pageIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Показать страницу
function showPage(pageIndex) {
    if (!currentBook) return;
    
    currentPage = pageIndex;
    const content = currentBook.content;
    
    let pageText = '';
    if (Array.isArray(content)) {
        if (pageIndex < content.length) {
            pageText = content[pageIndex];
        }
    } else {
        // Если контент - строка, разбиваем на страницы
        const words = content.split(' ');
        const wordsPerPage = 200;
        const start = pageIndex * wordsPerPage;
        const end = start + wordsPerPage;
        pageText = words.slice(start, end).join(' ');
    }
    
    // Разбиваем текст на слова для подсветки
    words = pageText.split(/\s+/).filter(word => word.trim().length > 0);
    currentWordIndex = 0;
    
    // Создаем HTML с возможностью подсветки слов
    const textContent = document.getElementById('textContent');
    textContent.innerHTML = '';
    
    words.forEach((word, index) => {
        const wordSpan = document.createElement('span');
        wordSpan.textContent = word + ' ';
        wordSpan.className = 'word';
        wordSpan.dataset.index = index;
        textContent.appendChild(wordSpan);
    });
    
    // Рассчитываем тайминги для слов
    calculateWordTimings();
    
    updatePageInfo();
    updateNavigation();
    updateActiveContentItem(pageIndex);
}

// Рассчитать тайминги для слов
function calculateWordTimings() {
    wordTimings = [];
    const baseTimePerWord = 0.4 / currentSpeed; // Базовое время на слово в секундах
    
    words.forEach((word, index) => {
        const startTime = index * baseTimePerWord;
        const endTime = (index + 1) * baseTimePerWord;
        wordTimings.push({
            start: startTime,
            end: endTime,
            word: word
        });
    });
}

// Пересчитать тайминги при изменении скорости
function recalculateWordTimings() {
    if (wordTimings.length > 0) {
        const elapsedTime = (Date.now() - startTime) / 1000;
        const newBaseTimePerWord = 0.4 / currentSpeed;
        
        wordTimings.forEach((timing, index) => {
            if (index < currentWordIndex) {
                // Уже прочитанные слова
                timing.start = index * newBaseTimePerWord;
                timing.end = (index + 1) * newBaseTimePerWord;
            } else {
                // Оставшиеся слова
                timing.start = elapsedTime + (index - currentWordIndex) * newBaseTimePerWord;
                timing.end = elapsedTime + (index - currentWordIndex + 1) * newBaseTimePerWord;
            }
        });
    }
}

// Подсветить текущее слово
function highlightCurrentWord() {
    // Убираем предыдущую подсветку
    const highlightedWords = document.querySelectorAll('.word-highlight');
    highlightedWords.forEach(word => {
        word.classList.remove('word-highlight');
    });
    
    // Подсвечиваем текущее слово
    if (currentWordIndex < words.length) {
        const currentWord = document.querySelector(`[data-index="${currentWordIndex}"]`);
        if (currentWord) {
            currentWord.classList.add('word-highlight');
            
            // Прокручиваем к подсвеченному слову
            currentWord.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
}

// Начать подсветку слов
function startWordHighlighting() {
    if (highlightInterval) {
        clearInterval(highlightInterval);
    }
    
    startTime = Date.now();
    currentWordIndex = 0;
    highlightCurrentWord();
    
    // Используем более частую проверку для точности
    highlightInterval = setInterval(() => {
        if (isPlaying && !isPaused) {
            const elapsedTime = (Date.now() - startTime) / 1000;
            
            // Находим текущее слово на основе времени
            let found = false;
            for (let i = 0; i < wordTimings.length; i++) {
                if (elapsedTime >= wordTimings[i].start && elapsedTime < wordTimings[i].end) {
                    if (currentWordIndex !== i) {
                        currentWordIndex = i;
                        highlightCurrentWord();
                    }
                    found = true;
                    break;
                }
            }
            
            // Если достигли конца страницы
            if (!found && currentWordIndex >= words.length - 1) {
                clearInterval(highlightInterval);
                return;
            }
        }
    }, 50); // Проверяем каждые 50мс для точности
}

// Остановить подсветку слов
function stopWordHighlighting() {
    if (highlightInterval) {
        clearInterval(highlightInterval);
        highlightInterval = null;
    }
    
    // Убираем все подсветки
    const highlightedWords = document.querySelectorAll('.word-highlight');
    highlightedWords.forEach(word => {
        word.classList.remove('word-highlight');
    });
}

// Обновить информацию о странице
function updatePageInfo() {
    const totalPages = currentBook.total_pages;
    document.getElementById('pageInfo').textContent = `Страница ${currentPage + 1} из ${totalPages}`;
    document.getElementById('currentPage').textContent = `Страница ${currentPage + 1} из ${totalPages}`;
    
    // Обновляем прогресс
    const progress = ((currentPage + 1) / totalPages) * 100;
    document.getElementById('readingProgress').style.width = progress + '%';
}

// Обновить навигацию
function updateNavigation() {
    const totalPages = currentBook.total_pages;
    
    document.getElementById('prevPage').disabled = currentPage === 0;
    document.getElementById('nextPage').disabled = currentPage >= totalPages - 1;
}

// Следующая страница
function nextPage() {
    if (currentBook && currentPage < currentBook.total_pages - 1) {
        if (isPlaying) {
            stopAudio();
        }
        showPage(currentPage + 1);
    }
}

// Предыдущая страница
function previousPage() {
    if (currentBook && currentPage > 0) {
        if (isPlaying) {
            stopAudio();
        }
        showPage(currentPage - 1);
    }
}

// Переключить аудио
function toggleAudio() {
    if (isPlaying) {
        if (isPaused) {
            resumeAudio();
        } else {
            pauseAudio();
        }
    } else {
        startAudio();
    }
}

// Начать аудио
function startAudio() {
    if (!speechSynthesis || !currentBook) return;
    
    const text = document.getElementById('textContent').textContent;
    if (!text.trim()) return;
    
    // Останавливаем предыдущее воспроизведение
    if (currentUtterance) {
        speechSynthesis.cancel();
    }
    
    // Создаем новое высказывание
    currentUtterance = new SpeechSynthesisUtterance(text);
    
    // Настройки голоса
    const selectedVoice = document.getElementById('voiceSelect').value;
    const voices = speechSynthesis.getVoices();
    
    if (selectedVoice !== 'default') {
        const voice = voices.find(v => 
            v.name.includes(selectedVoice) || v.lang.includes('ru')
        );
        if (voice) {
            currentUtterance.voice = voice;
        }
    }
    
    currentUtterance.lang = 'ru-RU';
    currentUtterance.rate = currentSpeed;
    currentUtterance.pitch = 1;
    
    // Обработчики событий
    currentUtterance.onstart = () => {
        // Начинаем подсветку слов
        startWordHighlighting();
    };
    
    currentUtterance.onend = () => {
        isPlaying = false;
        isPaused = false;
        updatePlayButton();
        currentUtterance = null;
        stopWordHighlighting();
        
        // Автоматически переходим на следующую страницу
        if (autoNextPage && currentPage < currentBook.total_pages - 1) {
            setTimeout(() => {
                nextPage();
                startAudio();
            }, 1000);
        }
    };
    
    currentUtterance.onerror = (event) => {
        console.error('Ошибка озвучки:', event);
        isPlaying = false;
        isPaused = false;
        updatePlayButton();
        currentUtterance = null;
        stopWordHighlighting();
    };
    
    // Начинаем воспроизведение
    speechSynthesis.speak(currentUtterance);
    isPlaying = true;
    isPaused = false;
    updatePlayButton();
}

// Пауза аудио
function pauseAudio() {
    if (speechSynthesis && currentUtterance) {
        speechSynthesis.pause();
        isPaused = true;
        updatePlayButton();
        // Останавливаем подсветку слов
        if (highlightInterval) {
            clearInterval(highlightInterval);
        }
    }
}

// Возобновить аудио
function resumeAudio() {
    if (speechSynthesis && currentUtterance && isPaused) {
        speechSynthesis.resume();
        isPaused = false;
        updatePlayButton();
        // Возобновляем подсветку слов с сохранением позиции
        startWordHighlighting();
    }
}

// Остановить аудио
function stopAudio() {
    if (speechSynthesis && currentUtterance) {
        speechSynthesis.cancel();
        isPlaying = false;
        isPaused = false;
        currentUtterance = null;
        updatePlayButton();
        stopWordHighlighting();
    }
}

// Обновить кнопку воспроизведения
function updatePlayButton() {
    const playButton = document.getElementById('playButton');
    const stopButton = document.getElementById('stopButton');
    const pauseButton = document.getElementById('pauseButton');
    
    if (isPlaying) {
        if (isPaused) {
            playButton.textContent = '▶️ Возобновить';
            pauseButton.disabled = true;
        } else {
            playButton.textContent = '⏸️ Пауза';
            pauseButton.disabled = false;
        }
        stopButton.disabled = false;
    } else {
        playButton.textContent = '▶️ Воспроизвести';
        stopButton.disabled = true;
        pauseButton.disabled = true;
    }
}

// Открыть читалку
function openReader() {
    document.getElementById('reader').scrollIntoView({ behavior: 'smooth' });
}

// Плавная прокрутка для навигации
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Анимация появления элементов при скролле
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Наблюдаем за элементами для анимации
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.feature, .upload-area');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Эффект параллакса для плавающих элементов
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const elements = document.querySelectorAll('.element');
    
    elements.forEach((element, index) => {
        const speed = 0.5 + (index * 0.1);
        element.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// Изменение навбара при скролле
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.2)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    }
});

// Эффект печатной машинки для заголовка
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Запуск эффекта печатной машинки после загрузки
window.addEventListener('load', () => {
    setTimeout(() => {
        const title = document.querySelector('.hero-title');
        const originalText = title.textContent;
        typeWriter(title, originalText, 150);
    }, 500);
});

// Добавление звездного фона
function createStars() {
    const hero = document.querySelector('.hero');
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: white;
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            animation: twinkle ${2 + Math.random() * 3}s infinite;
            opacity: ${0.3 + Math.random() * 0.7};
        `;
        hero.appendChild(star);
    }
}

// Добавление CSS анимации для звезд
const style = document.createElement('style');
style.textContent = `
    @keyframes twinkle {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
    }
`;
document.head.appendChild(style);

// Создание звезд после загрузки
window.addEventListener('load', createStars);
