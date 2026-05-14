#!/bin/bash
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec nextjs-db pg_dump -U ${DB_USER:-user} ${DB_NAME:-database} > $BACKUP_DIR/backup_$TIMESTAMP.sql
find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -delete
