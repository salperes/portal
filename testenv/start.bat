@echo off
echo ========================================
echo MSS Portal Test Environment
echo ========================================
echo.

REM Check if .env exists
if not exist ".env" (
    echo [INFO] .env dosyasi bulunamadi, .env.example kopyalaniyor...
    copy .env.example .env
    echo [INFO] .env dosyasi olusturuldu.
    echo.
)

echo [INFO] Container'lar baslatiliyor...
echo.

REM Start containers
docker-compose up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Container'lar baslatilamadi!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Servisler baslatildi:
echo ========================================
echo.
echo   Frontend (Vite):  http://localhost:5173
echo   Frontend (Nginx): http://localhost:80
echo   Backend API:      http://localhost:3001/api
echo   Swagger Docs:     http://localhost:3001/api/docs
echo   MinIO Console:    http://localhost:9003
echo   PostgreSQL:       localhost:5434
echo   Redis:            localhost:6380
echo.
echo ========================================
echo Komutlar:
echo ========================================
echo   Loglar:    docker-compose logs -f
echo   Durdur:    docker-compose down
echo   Temizle:   docker-compose down -v
echo ========================================
echo.
pause
