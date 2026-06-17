FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python manage.py collectstatic --noinput 2>/dev/null || true
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "contratid.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
