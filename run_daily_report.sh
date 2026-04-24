#!/bin/bash
# run_daily_report.sh
# Automated script for Law Daily Scan

set -e # Exit immediately if a command exits with a non-zero status.

echo "=== 📜 Daily Law Revision Report Generator ==="

# --- 1. Environment & Dependency Checks ---
echo "[Setup] Checking dependencies..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 could not be found. Please install Python 3.8+."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Error: node could not be found. Please install Node.js 18+."
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please copy .env.example to .env and configure your keys."
    exit 1
fi

# Auto-activate Python virtual environment if it exists
if [ -d "venv" ]; then
    echo "[Setup] Activating Python virtual environment..."
    source venv/bin/activate
fi

# Ensure output directory exists
if [ ! -d "output" ]; then
    echo "[Setup] Creating output/ directory..."
    mkdir -p output
fi

# --- 2. Data Fetching ---
echo "[1/2] ⬇️ Fetching today's revised laws via NLIC API and analyzing with LLM..."
if ! python3 core/daily_fetcher.py; then
    echo "❌ Data fetching and analysis failed. Aborting."
    exit 1
fi

# --- 3. DOCX Generation ---
if [ ! -f "daily_data.json" ]; then
    echo "⚠️ Info: daily_data.json was not generated. It might mean there are no laws to report today."
    exit 0
fi

echo "[2/2] 📝 Generating DOCX report..."
if ! node core/generate_docx.js; then
    echo "❌ DOCX generation failed. Aborting."
    exit 1
fi

echo "✅ === Done! Report successfully generated in the output/ directory. ==="

