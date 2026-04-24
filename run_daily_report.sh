#!/bin/bash
# run_daily_report.sh

echo "=== Daily Law Revision Report Generator ==="

# Step 1: Fetch data
echo "[1/2] Fetching today's revised laws via NLIC API..."
python3 core/daily_fetcher.py

if [ $? -ne 0 ]; then
    echo "Data fetching failed. Aborting."
    exit 1
fi

# Step 2: Generate DOCX
echo "[2/2] Generating DOCX report..."
node core/generate_docx.js

if [ $? -ne 0 ]; then
    echo "DOCX generation failed. Aborting."
    exit 1
fi

echo "=== Done ==="
