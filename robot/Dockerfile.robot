# Dockerfile for ForexOS Robot
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for MT5
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libharfbuzz0b \
    libfreetype6 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY pyproject.toml poetry.lock* ./

# Install Python dependencies
RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi

# Copy application code
COPY src/ ./src/
COPY tests/ ./tests/

# Create data directory
RUN mkdir -p /app/data

# Set environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Run the robot
CMD ["python", "-m", "src.main"]
