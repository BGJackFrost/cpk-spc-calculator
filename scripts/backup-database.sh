#!/bin/bash
# ============================================
# SPC/CPK Calculator - Database Backup Script
# ============================================
# Usage: ./backup-database.sh [options]
# ============================================

set -e

# Default configuration
BACKUP_DIR="/var/backups/spc-calculator"
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="spc_calculator"
DB_USER="spc_app"
DB_PASS=""
RETENTION_DAYS=30
COMPRESS=true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --host)
            DB_HOST="$2"
            shift 2
            ;;
        --port)
            DB_PORT="$2"
            shift 2
            ;;
        --database)
            DB_NAME="$2"
            shift 2
            ;;
        --user)
            DB_USER="$2"
            shift 2
            ;;
        --password)
            DB_PASS="$2"
            shift 2
            ;;
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --no-compress)
            COMPRESS=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --dir PATH        Backup directory (default: /var/backups/spc-calculator)"
            echo "  --host HOST       Database host (default: localhost)"
            echo "  --port PORT       Database port (default: 3306)"
            echo "  --database NAME   Database name (default: spc_calculator)"
            echo "  --user USER       Database user (default: spc_app)"
            echo "  --password PASS   Database password"
            echo "  --retention DAYS  Keep backups for N days (default: 30)"
            echo "  --no-compress     Don't compress backup file"
            echo "  -h, --help        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Load from .env file if exists
if [ -f ".env" ]; then
    source .env 2>/dev/null || true
    
    # Extract from DATABASE_URL if available
    if [ -n "$DATABASE_URL" ] && [ -z "$DB_PASS" ]; then
        # Parse mysql://user:pass@host:port/database
        DB_USER=$(echo "$DATABASE_URL" | sed -n 's|mysql://\([^:]*\):.*|\1|p')
        DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^@]*@\([^:]*\):.*|\1|p')
        DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^@]*@[^:]*:\([^/]*\)/.*|\1|p')
        DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^/]*/\(.*\)|\1|p')
    fi
fi

# Prompt for password if not provided
if [ -z "$DB_PASS" ]; then
    read -sp "Enter MySQL password for user '$DB_USER': " DB_PASS
    echo ""
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/spc_backup_$TIMESTAMP.sql"

echo -e "${YELLOW}Starting database backup...${NC}"
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  Backup directory: $BACKUP_DIR"
echo ""

# Perform backup
echo -e "${YELLOW}Dumping database...${NC}"
mysqldump \
    -h "$DB_HOST" \
    -P "$DB_PORT" \
    -u "$DB_USER" \
    -p"$DB_PASS" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    "$DB_NAME" > "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    echo -e "${RED}Backup failed!${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "  ${GREEN}[OK]${NC} Dump completed: $FILE_SIZE"

# Compress if enabled
if [ "$COMPRESS" = true ]; then
    echo -e "${YELLOW}Compressing backup...${NC}"
    gzip "$BACKUP_FILE"
    BACKUP_FILE="$BACKUP_FILE.gz"
    COMPRESSED_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "  ${GREEN}[OK]${NC} Compressed: $COMPRESSED_SIZE"
fi

# Clean up old backups
echo -e "${YELLOW}Cleaning up old backups...${NC}"
DELETED_COUNT=$(find "$BACKUP_DIR" -name "spc_backup_*.sql*" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo -e "  ${GREEN}[OK]${NC} Deleted $DELETED_COUNT old backup(s)"

# Summary
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Backup completed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Backup file: $BACKUP_FILE"
echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo "Retention: $RETENTION_DAYS days"
echo ""

# List recent backups
echo "Recent backups:"
ls -lh "$BACKUP_DIR"/spc_backup_*.sql* 2>/dev/null | tail -5 || echo "  No backups found"
