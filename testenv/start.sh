#!/bin/bash
echo "========================================"
echo "MSS Portal Test Environment"
echo "========================================"
echo

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "[INFO] .env dosyasi bulunamadi, .env.example kopyalaniyor..."
    cp .env.example .env
    echo "[INFO] Lutfen .env dosyasini duzenleyin ve tekrar calistirin."
    exit 1
fi

echo "[INFO] Container'lar baslatiliyor..."
echo

# Start containers
docker-compose up -d --build

echo
echo "========================================"
echo "Servisler:"
echo "========================================"
echo "Frontend (Vite):  http://localhost:5173"
echo "Frontend (Nginx): http://localhost"
echo "Backend API:      http://localhost:3001/api"
echo "Swagger Docs:     http://localhost:3001/api/docs"
echo "MinIO Console:    http://localhost:${MINIO_CONSOLE_PORT:-9003}"
echo "========================================"
echo
echo "[INFO] Loglari izlemek icin: docker-compose logs -f"
echo "[INFO] Durdurmak icin: docker-compose down"
