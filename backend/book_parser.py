import PyPDF2
import ebooklib
from ebooklib import epub
from lxml import etree
import os
from pathlib import Path
from typing import List, Union

class BookParser:
    """Класс для парсинга книг разных форматов"""
    
    def parse_book(self, file_path: Path) -> Union[List[str], str]:
        """Парсинг книги в зависимости от формата"""
        file_ext = file_path.suffix.lower()
        
        if file_ext == '.pdf':
            return self._parse_pdf(file_path)
        elif file_ext == '.epub':
            return self._parse_epub(file_path)
        elif file_ext == '.fb2':
            return self._parse_fb2(file_path)
        elif file_ext == '.txt':
            return self._parse_txt(file_path)
        else:
            raise ValueError(f"Неподдерживаемый формат файла: {file_ext}")
    
    def _parse_pdf(self, file_path: Path) -> List[str]:
        """Парсинг PDF файла"""
        pages = []
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text = page.extract_text()
                    if text.strip():
                        pages.append(text.strip())
        except Exception as e:
            raise Exception(f"Ошибка при парсинге PDF: {str(e)}")
        
        return pages
    
    def _parse_epub(self, file_path: Path) -> List[str]:
        """Парсинг EPUB файла"""
        chapters = []
        try:
            book = epub.read_epub(file_path)
            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_DOCUMENT:
                    content = item.get_content().decode('utf-8')
                    # Простое извлечение текста из HTML
                    text = self._extract_text_from_html(content)
                    if text.strip():
                        chapters.append(text.strip())
        except Exception as e:
            raise Exception(f"Ошибка при парсинге EPUB: {str(e)}")
        
        return chapters
    
    def _parse_fb2(self, file_path: Path) -> List[str]:
        """Парсинг FB2 файла"""
        chapters = []
        try:
            tree = etree.parse(file_path)
            root = tree.getroot()
            
            # Поиск всех элементов body (главы)
            bodies = root.findall('.//{*}body')
            for body in bodies:
                # Извлечение текста из главы
                text_elements = body.findall('.//{*}p')
                chapter_text = []
                for elem in text_elements:
                    if elem.text:
                        chapter_text.append(elem.text.strip())
                
                if chapter_text:
                    chapters.append(' '.join(chapter_text))
        except Exception as e:
            raise Exception(f"Ошибка при парсинге FB2: {str(e)}")
        
        return chapters
    
    def _parse_txt(self, file_path: Path) -> str:
        """Парсинг TXT файла"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
                return content
        except Exception as e:
            raise Exception(f"Ошибка при парсинге TXT: {str(e)}")
    
    def _extract_text_from_html(self, html_content: str) -> str:
        """Простое извлечение текста из HTML"""
        import re
        # Удаление HTML тегов
        text = re.sub(r'<[^>]+>', '', html_content)
        # Удаление лишних пробелов
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
