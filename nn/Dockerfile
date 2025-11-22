# syntax=docker/dockerfile:1

FROM python:3.11-slim

WORKDIR /app

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Обновляем pip для более быстрой установки
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Устанавливаем зависимости в оптимальном порядке для кэширования
# Сначала легкие зависимости
RUN pip install --no-cache-dir \
    Pillow>=10.0.0 \
    flask>=3.0.0 \
    flask-cors>=4.0.0 \
    numpy>=1.24.0

# Затем opencv (быстрее чем torch)
RUN pip install --no-cache-dir opencv-python-headless>=4.8.0

# В конце устанавливаем PyTorch CPU-only (самый тяжелый, но CPU версия намного быстрее)
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch>=2.0.0 \
    torchvision>=0.15.0

# Копируем модель, разметку и код приложения
# Файлы копируются из контекста сборки (../nn) в образ
COPY parking_classifier.pt .
COPY slots.json .
COPY app.py .

# Переменные окружения
ENV MODEL_PATH=/app/parking_classifier.pt
ENV PORT=5000

EXPOSE 5000

CMD ["python", "app.py"]

