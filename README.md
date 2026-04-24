# Law Daily Scan

Daily legal revision scanner and reporter for FSC.

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

## Usage

Run the daily report:
```bash
./run_daily_report.sh
```

The report will be generated in the `output/` directory.
