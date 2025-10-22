#!/usr/bin/env python3
"""
Database migration runner for Serenity Rehabilitation Center
Run this script to set up the database schema and seed data
"""

import os
import sys
import logging
from pathlib import Path
from typing import Optional

# Try to import psycopg2, fall back to sqlite if not available
try:
    import psycopg2  # type: ignore
    from psycopg2 import sql  # type: ignore
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("psycopg2 not available. This script requires PostgreSQL.")

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

from config import settings

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_sql_file(connection, file_path: Path) -> bool:
    """Execute SQL commands from a file"""
    try:
        with open(file_path, 'r') as file:
            sql_commands = file.read()
        
        cursor = connection.cursor()
        cursor.execute(sql_commands)
        connection.commit()
        cursor.close()
        logger.info(f"Successfully executed {file_path}")
        return True
    except Exception as e:
        logger.error(f"Error executing {file_path}: {str(e)}")
        connection.rollback()
        return False

def create_database_if_not_exists() -> bool:
    """Create the database if it doesn't exist"""
    if not PSYCOPG2_AVAILABLE:
        logger.error("psycopg2 is required for database operations")
        return False
    
    try:
        # Parse the database URL to get connection parameters
        db_url = settings.database_url
        if db_url.startswith('postgresql://'):
            db_url = db_url.replace('postgresql://', 'postgres://', 1)
        
        # Connect to postgres database to create our database
        import urllib.parse as urlparse
        url = urlparse.urlparse(db_url)
        
        # Connect to default postgres database
        conn = psycopg2.connect(
            host=url.hostname,
            port=url.port,
            user=url.username,
            password=url.password,
            database='postgres'
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if database exists
        database_name = url.path[1:]  # Remove leading slash
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (database_name,))
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))
            logger.info(f"Created database: {database_name}")
        else:
            logger.info(f"Database {database_name} already exists")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Error creating database: {str(e)}")
        return False

def run_migrations() -> bool:
    """Run all migration scripts"""
    if not PSYCOPG2_AVAILABLE:
        logger.error("psycopg2 is required for database operations")
        return False
    
    try:
        # Create database if it doesn't exist
        if not create_database_if_not_exists():
            return False
        
        # Connect to the application database
        connection = psycopg2.connect(settings.database_url)
        
        # Get migration files directory
        migrations_dir = backend_dir / 'migrations'
        
        # Run migration files in order
        migration_files = [
            '001_initial_schema.sql',
            '002_seed_data.sql'
        ]
        
        for migration_file in migration_files:
            file_path = migrations_dir / migration_file
            if file_path.exists():
                logger.info(f"Running migration: {migration_file}")
                if not run_sql_file(connection, file_path):
                    logger.error(f"Migration failed: {migration_file}")
                    return False
            else:
                logger.warning(f"Migration file not found: {file_path}")
        
        connection.close()
        logger.info("All migrations completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        return False

def reset_database() -> bool:
    """Drop all tables and recreate them (USE WITH CAUTION)"""
    if not PSYCOPG2_AVAILABLE:
        logger.error("psycopg2 is required for database operations")
        return False
    
    try:
        connection = psycopg2.connect(settings.database_url)
        cursor = connection.cursor()
        
        # Drop all tables
        cursor.execute("""
            DROP SCHEMA public CASCADE;
            CREATE SCHEMA public;
            GRANT ALL ON SCHEMA public TO postgres;
            GRANT ALL ON SCHEMA public TO public;
        """)
        
        connection.commit()
        cursor.close()
        connection.close()
        
        logger.info("Database reset completed")
        
        # Run migrations again
        return run_migrations()
        
    except Exception as e:
        logger.error(f"Database reset failed: {str(e)}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Database migration tool')
    parser.add_argument('--reset', action='store_true', help='Reset database (drops all tables)')
    args = parser.parse_args()
    
    if args.reset:
        logger.warning("Resetting database - all data will be lost!")
        response = input("Are you sure? (yes/no): ")
        if response.lower() == 'yes':
            success = reset_database()
        else:
            logger.info("Database reset cancelled")
            success = True
    else:
        success = run_migrations()
    
    sys.exit(0 if success else 1)
