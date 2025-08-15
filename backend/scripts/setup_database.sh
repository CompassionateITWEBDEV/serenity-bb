#!/bin/bash

# Database setup script for Serenity Rehabilitation Center
# This script sets up the database and runs migrations

set -e

echo "Setting up Serenity Rehabilitation Center Database..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed."
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "pip3 is required but not installed."
    exit 1
fi

# Install required Python packages
echo "Installing required packages..."
pip3 install psycopg2-binary python-dotenv

# Check if .env file exists
if [ ! -f "../.env" ]; then
    echo "Creating .env file from example..."
    cp "../.env.example" "../.env"
    echo "Please edit backend/.env with your database credentials"
    exit 1
fi

# Run migrations
echo "Running database migrations..."
python3 run_migrations.py

echo "Database setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start the FastAPI server: uvicorn main:app --reload"
echo "2. Visit http://localhost:8000/docs to see the API documentation"
echo "3. Use the sample credentials to test:"
echo "   - Email: john.doe@email.com"
echo "   - Password: password123"
