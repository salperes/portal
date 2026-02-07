# MSS Portal - Development Server Manager
# PowerShell Script

$ErrorActionPreference = "SilentlyContinue"
$ProjectRoot = $PSScriptRoot

# Process tracking
$script:FrontendJob = $null
$script:BackendJob = $null

function Show-Menu {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "    MSS Portal - Dev Server Manager    " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  [1] Start Frontend" -ForegroundColor Green
    Write-Host "  [2] Stop Frontend" -ForegroundColor Red
    Write-Host "  [3] Start Backend" -ForegroundColor Green
    Write-Host "  [4] Stop Backend" -ForegroundColor Red
    Write-Host "  [5] Exit" -ForegroundColor Yellow
    Write-Host ""

    # Show status
    $frontendStatus = if (Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "vite" }) { "Running" } else { "Stopped" }
    $backendStatus = if (Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "nest" }) { "Running" } else { "Stopped" }

    Write-Host "  Status:" -ForegroundColor Gray
    $frontendColor = if ($frontendStatus -eq "Running") { "Green" } else { "Red" }
    $backendColor = if ($backendStatus -eq "Running") { "Green" } else { "Red" }
    Write-Host "    Frontend: $frontendStatus" -ForegroundColor $frontendColor
    Write-Host "    Backend:  $backendStatus" -ForegroundColor $backendColor
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
}

function Start-Frontend {
    Write-Host "`nStarting Frontend..." -ForegroundColor Yellow
    $frontendPath = Join-Path $ProjectRoot "frontend"

    if (-not (Test-Path $frontendPath)) {
        Write-Host "Frontend folder not found!" -ForegroundColor Red
        return
    }

    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$frontendPath`" && npm run dev" -WindowStyle Normal
    Write-Host "Frontend started at http://localhost:5173" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

function Stop-Frontend {
    Write-Host "`nStopping Frontend..." -ForegroundColor Yellow

    # Find and kill Vite processes
    $viteProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        try { $_.CommandLine -match "vite" } catch { $false }
    }

    if ($viteProcesses) {
        $viteProcesses | Stop-Process -Force
        Write-Host "Frontend stopped." -ForegroundColor Green
    } else {
        # Try to kill by port
        $portProcess = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($portProcess) {
            Stop-Process -Id $portProcess -Force -ErrorAction SilentlyContinue
            Write-Host "Frontend stopped." -ForegroundColor Green
        } else {
            Write-Host "Frontend is not running." -ForegroundColor Yellow
        }
    }
    Start-Sleep -Seconds 1
}

function Start-Backend {
    Write-Host "`nStarting Backend..." -ForegroundColor Yellow
    $backendPath = Join-Path $ProjectRoot "backend"

    if (-not (Test-Path $backendPath)) {
        Write-Host "Backend folder not found!" -ForegroundColor Red
        return
    }

    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$backendPath`" && npm run start:dev" -WindowStyle Normal
    Write-Host "Backend started at http://localhost:3000/api" -ForegroundColor Green
    Write-Host "Swagger: http://localhost:3000/api/docs" -ForegroundColor Cyan
    Start-Sleep -Seconds 2
}

function Stop-Backend {
    Write-Host "`nStopping Backend..." -ForegroundColor Yellow

    # Find and kill NestJS processes
    $nestProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        try { $_.CommandLine -match "nest" } catch { $false }
    }

    if ($nestProcesses) {
        $nestProcesses | Stop-Process -Force
        Write-Host "Backend stopped." -ForegroundColor Green
    } else {
        # Try to kill by port
        $portProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($portProcess) {
            Stop-Process -Id $portProcess -Force -ErrorAction SilentlyContinue
            Write-Host "Backend stopped." -ForegroundColor Green
        } else {
            Write-Host "Backend is not running." -ForegroundColor Yellow
        }
    }
    Start-Sleep -Seconds 1
}

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Select option"

    switch ($choice) {
        "1" { Start-Frontend }
        "2" { Stop-Frontend }
        "3" { Start-Backend }
        "4" { Stop-Backend }
        "5" {
            Write-Host "`nExiting..." -ForegroundColor Yellow
            break
        }
        default {
            Write-Host "`nInvalid option!" -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
} while ($choice -ne "5")

Write-Host "Goodbye!" -ForegroundColor Cyan
