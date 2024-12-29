FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_HOME=/app \
    PYTHONPATH=/app \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

WORKDIR $APP_HOME

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create necessary directories with correct permissions
RUN mkdir -p media static data && \
    chmod 777 media static data

# Copy project files
COPY . .

# Convert line endings to Unix format (LF)
RUN find . -type f -name "*.py" -exec sed -i 's/\r$//' {} +

EXPOSE 8000

# Default command (can be overridden in docker-compose)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
