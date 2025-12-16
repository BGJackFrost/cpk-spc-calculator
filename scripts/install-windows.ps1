# ============================================
# SPC/CPK Calculator - Windows Installation Script
# ============================================
# Run this script with Administrator privileges
# ============================================

param(
    [string]$InstallPath = "C:\Apps\spc-calculator",
    [string]$DBHost = "localhost",
    [string]$DBPort = "3306",
    [string]$DBName = "spc_calculator",
    [string]$DBUser = "spc_app",
    [string]$DBPass = "",
    [int]$AppPort = 3000
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "SPC/CPK Calculator - Windows Installation" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Function to check if a command exists
function Test-Command {
    param([string]$Command)
    return [bool](Get-Command -Name $Command -ErrorAction SilentlyContinue)
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "  [OK] Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "  Please install Node.js from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Check npm
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Host "  [OK] npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] npm not found!" -ForegroundColor Red
    exit 1
}

# Check/Install pnpm
if (Test-Command "pnpm") {
    $pnpmVersion = pnpm --version
    Write-Host "  [OK] pnpm: $pnpmVersion" -ForegroundColor Green
} else {
    Write-Host "  [INSTALLING] pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Failed to install pnpm!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] pnpm installed" -ForegroundColor Green
}

# Check MySQL connection
Write-Host ""
Write-Host "Checking MySQL connection..." -ForegroundColor Yellow

if ([string]::IsNullOrEmpty($DBPass)) {
    $DBPass = Read-Host "Enter MySQL password for user '$DBUser'" -AsSecureString
    $DBPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DBPass))
}

# Create installation directory
Write-Host ""
Write-Host "Creating installation directory..." -ForegroundColor Yellow

if (Test-Path $InstallPath) {
    Write-Host "  Directory already exists: $InstallPath" -ForegroundColor Yellow
    $confirm = Read-Host "  Do you want to continue? (y/n)"
    if ($confirm -ne "y") {
        Write-Host "Installation cancelled." -ForegroundColor Red
        exit 0
    }
} else {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-Host "  [OK] Created: $InstallPath" -ForegroundColor Green
}

# Copy files (assuming script is run from source directory)
Write-Host ""
Write-Host "Copying application files..." -ForegroundColor Yellow

$sourceDir = Split-Path -Parent $PSScriptRoot
if (Test-Path "$sourceDir\package.json") {
    Copy-Item -Path "$sourceDir\*" -Destination $InstallPath -Recurse -Force -Exclude @(".git", "node_modules", ".env")
    Write-Host "  [OK] Files copied" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Source files not found. Please copy files manually." -ForegroundColor Yellow
}

# Change to installation directory
Set-Location $InstallPath

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Failed to install dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Dependencies installed" -ForegroundColor Green

# Generate JWT Secret
Write-Host ""
Write-Host "Generating JWT Secret..." -ForegroundColor Yellow
$jwtSecret = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
Write-Host "  [OK] JWT Secret generated" -ForegroundColor Green

# Create .env file
Write-Host ""
Write-Host "Creating configuration file..." -ForegroundColor Yellow

$envContent = @"
# Database Configuration
DATABASE_URL=mysql://${DBUser}:${DBPass}@${DBHost}:${DBPort}/${DBName}

# Application Settings
NODE_ENV=production
PORT=$AppPort

# Offline Mode Configuration
OFFLINE_MODE=true
AUTH_MODE=local
STORAGE_MODE=local
LLM_MODE=disabled
LOCAL_STORAGE_PATH=./uploads

# Authentication
JWT_SECRET=$jwtSecret

# Realtime Features (disabled for stability)
SSE_ENABLED=false
WEBSOCKET_ENABLED=false

# Rate Limiting
RATE_LIMIT_ENABLED=false

# App Branding
VITE_APP_TITLE=SPC/CPK Calculator
VITE_APP_LOGO=/logo.svg
"@

$envContent | Out-File -FilePath "$InstallPath\.env" -Encoding UTF8
Write-Host "  [OK] Configuration file created" -ForegroundColor Green

# Initialize database
Write-Host ""
Write-Host "Initializing database schema..." -ForegroundColor Yellow
pnpm db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Failed to initialize database!" -ForegroundColor Red
    Write-Host "  Please check your database connection settings." -ForegroundColor Yellow
    exit 1
}
Write-Host "  [OK] Database schema initialized" -ForegroundColor Green

# Build application
Write-Host ""
Write-Host "Building application..." -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Application built" -ForegroundColor Green

# Create uploads directory
New-Item -ItemType Directory -Path "$InstallPath\uploads" -Force | Out-Null
Write-Host "  [OK] Uploads directory created" -ForegroundColor Green

# Create start script
$startScript = @"
@echo off
cd /d "$InstallPath"
node dist/index.js
pause
"@
$startScript | Out-File -FilePath "$InstallPath\start.bat" -Encoding ASCII
Write-Host "  [OK] Start script created" -ForegroundColor Green

# Installation complete
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installation Path: $InstallPath" -ForegroundColor Cyan
Write-Host "Application Port: $AppPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Yellow
Write-Host "  Option 1: Run start.bat" -ForegroundColor White
Write-Host "  Option 2: cd $InstallPath && pnpm start" -ForegroundColor White
Write-Host ""
Write-Host "Default admin credentials:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: Admin@123" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Change the admin password after first login!" -ForegroundColor Red
Write-Host ""
Write-Host "Access the application at: http://localhost:$AppPort" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to start the application now
$startNow = Read-Host "Do you want to start the application now? (y/n)"
if ($startNow -eq "y") {
    Write-Host "Starting application..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$InstallPath`" && node dist/index.js"
    Start-Sleep -Seconds 3
    Write-Host "Application started! Opening browser..." -ForegroundColor Green
    Start-Process "http://localhost:$AppPort"
}
