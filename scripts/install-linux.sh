#!/bin/bash
# ============================================
# SPC/CPK Calculator - Linux Installation Script
# ============================================
# Run this script with: sudo bash install-linux.sh
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
INSTALL_PATH="/opt/spc-calculator"
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="spc_calculator"
DB_USER="spc_app"
DB_PASS=""
APP_PORT=3000
APP_USER="www-data"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --path)
            INSTALL_PATH="$2"
            shift 2
            ;;
        --db-host)
            DB_HOST="$2"
            shift 2
            ;;
        --db-port)
            DB_PORT="$2"
            shift 2
            ;;
        --db-name)
            DB_NAME="$2"
            shift 2
            ;;
        --db-user)
            DB_USER="$2"
            shift 2
            ;;
        --db-pass)
            DB_PASS="$2"
            shift 2
            ;;
        --port)
            APP_PORT="$2"
            shift 2
            ;;
        --user)
            APP_USER="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --path PATH      Installation path (default: /opt/spc-calculator)"
            echo "  --db-host HOST   Database host (default: localhost)"
            echo "  --db-port PORT   Database port (default: 3306)"
            echo "  --db-name NAME   Database name (default: spc_calculator)"
            echo "  --db-user USER   Database user (default: spc_app)"
            echo "  --db-pass PASS   Database password"
            echo "  --port PORT      Application port (default: 3000)"
            echo "  --user USER      System user to run app (default: www-data)"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}SPC/CPK Calculator - Linux Installation${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: This script must be run as root!${NC}"
    echo -e "${YELLOW}Run with: sudo bash $0${NC}"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "  ${GREEN}[OK]${NC} Node.js: $NODE_VERSION"
else
    echo -e "  ${RED}[ERROR]${NC} Node.js not found!"
    echo -e "  ${YELLOW}Installing Node.js...${NC}"
    
    # Install Node.js 22.x
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
    
    if command_exists node; then
        echo -e "  ${GREEN}[OK]${NC} Node.js installed"
    else
        echo -e "  ${RED}[ERROR]${NC} Failed to install Node.js!"
        exit 1
    fi
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "  ${GREEN}[OK]${NC} npm: $NPM_VERSION"
else
    echo -e "  ${RED}[ERROR]${NC} npm not found!"
    exit 1
fi

# Check/Install pnpm
if command_exists pnpm; then
    PNPM_VERSION=$(pnpm --version)
    echo -e "  ${GREEN}[OK]${NC} pnpm: $PNPM_VERSION"
else
    echo -e "  ${YELLOW}[INSTALLING]${NC} pnpm..."
    npm install -g pnpm
    if command_exists pnpm; then
        echo -e "  ${GREEN}[OK]${NC} pnpm installed"
    else
        echo -e "  ${RED}[ERROR]${NC} Failed to install pnpm!"
        exit 1
    fi
fi

# Get database password if not provided
if [ -z "$DB_PASS" ]; then
    echo ""
    read -sp "Enter MySQL password for user '$DB_USER': " DB_PASS
    echo ""
fi

# Create installation directory
echo ""
echo -e "${YELLOW}Creating installation directory...${NC}"

if [ -d "$INSTALL_PATH" ]; then
    echo -e "  ${YELLOW}Directory already exists: $INSTALL_PATH${NC}"
    read -p "  Do you want to continue? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi
else
    mkdir -p "$INSTALL_PATH"
    echo -e "  ${GREEN}[OK]${NC} Created: $INSTALL_PATH"
fi

# Copy files (assuming script is run from source directory)
echo ""
echo -e "${YELLOW}Copying application files...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$SOURCE_DIR/package.json" ]; then
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='.env' "$SOURCE_DIR/" "$INSTALL_PATH/"
    echo -e "  ${GREEN}[OK]${NC} Files copied"
else
    echo -e "  ${YELLOW}[WARNING]${NC} Source files not found. Please copy files manually."
fi

# Change to installation directory
cd "$INSTALL_PATH"

# Set ownership
chown -R "$APP_USER:$APP_USER" "$INSTALL_PATH"

# Install dependencies
echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
sudo -u "$APP_USER" pnpm install
echo -e "  ${GREEN}[OK]${NC} Dependencies installed"

# Generate JWT Secret
echo ""
echo -e "${YELLOW}Generating JWT Secret...${NC}"
JWT_SECRET=$(openssl rand -base64 48)
echo -e "  ${GREEN}[OK]${NC} JWT Secret generated"

# Create .env file
echo ""
echo -e "${YELLOW}Creating configuration file...${NC}"

cat > "$INSTALL_PATH/.env" << EOF
# Database Configuration
DATABASE_URL=mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Application Settings
NODE_ENV=production
PORT=$APP_PORT

# Offline Mode Configuration
OFFLINE_MODE=true
AUTH_MODE=local
STORAGE_MODE=local
LLM_MODE=disabled
LOCAL_STORAGE_PATH=./uploads

# Authentication
JWT_SECRET=$JWT_SECRET

# Realtime Features (disabled for stability)
SSE_ENABLED=false
WEBSOCKET_ENABLED=false

# Rate Limiting
RATE_LIMIT_ENABLED=false

# App Branding
VITE_APP_TITLE=SPC/CPK Calculator
VITE_APP_LOGO=/logo.svg
EOF

chown "$APP_USER:$APP_USER" "$INSTALL_PATH/.env"
chmod 600 "$INSTALL_PATH/.env"
echo -e "  ${GREEN}[OK]${NC} Configuration file created"

# Initialize database
echo ""
echo -e "${YELLOW}Initializing database schema...${NC}"
sudo -u "$APP_USER" pnpm db:push
echo -e "  ${GREEN}[OK]${NC} Database schema initialized"

# Build application
echo ""
echo -e "${YELLOW}Building application...${NC}"
sudo -u "$APP_USER" pnpm build
echo -e "  ${GREEN}[OK]${NC} Application built"

# Create uploads directory
mkdir -p "$INSTALL_PATH/uploads"
chown "$APP_USER:$APP_USER" "$INSTALL_PATH/uploads"
echo -e "  ${GREEN}[OK]${NC} Uploads directory created"

# Create systemd service
echo ""
echo -e "${YELLOW}Creating systemd service...${NC}"

cat > /etc/systemd/system/spc-calculator.service << EOF
[Unit]
Description=SPC/CPK Calculator Web Application
After=network.target mysql.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$INSTALL_PATH
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=spc-calculator
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable spc-calculator
echo -e "  ${GREEN}[OK]${NC} Systemd service created and enabled"

# Installation complete
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${CYAN}Installation Path:${NC} $INSTALL_PATH"
echo -e "${CYAN}Application Port:${NC} $APP_PORT"
echo -e "${CYAN}Service Name:${NC} spc-calculator"
echo ""
echo -e "${YELLOW}Service Management Commands:${NC}"
echo -e "  Start:   ${NC}sudo systemctl start spc-calculator"
echo -e "  Stop:    ${NC}sudo systemctl stop spc-calculator"
echo -e "  Restart: ${NC}sudo systemctl restart spc-calculator"
echo -e "  Status:  ${NC}sudo systemctl status spc-calculator"
echo -e "  Logs:    ${NC}sudo journalctl -u spc-calculator -f"
echo ""
echo -e "${YELLOW}Default admin credentials:${NC}"
echo -e "  Username: ${NC}admin"
echo -e "  Password: ${NC}Admin@123"
echo ""
echo -e "${RED}IMPORTANT: Change the admin password after first login!${NC}"
echo ""
echo -e "${CYAN}Access the application at: http://localhost:$APP_PORT${NC}"
echo ""

# Ask if user wants to start the application now
read -p "Do you want to start the application now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Starting application...${NC}"
    systemctl start spc-calculator
    sleep 3
    
    if systemctl is-active --quiet spc-calculator; then
        echo -e "${GREEN}Application started successfully!${NC}"
        echo -e "Access at: ${CYAN}http://localhost:$APP_PORT${NC}"
    else
        echo -e "${RED}Failed to start application. Check logs:${NC}"
        echo "  sudo journalctl -u spc-calculator -n 50"
    fi
fi
