# Law Daily Scan 📜✨

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Law Daily Scan** is an automated compliance monitoring tool designed to fetch, analyze, and generate beautiful reports for daily legal and administrative rule revisions in South Korea. It is specifically optimized for tracking legal changes managed by the Financial Services Commission (FSC) and related financial rules.

This tool runs automatically to cross-reference daily legal revisions from the **National Law Information Center (NLIC)** API with a predefined target list. It leverages the power of **LLMs (Gemini via OpenRouter)** to analyze legalese into actionable business insights and generates a professional, ready-to-share **Word Document (.docx)** report.

## 🚀 Features

- **Automated Scanning**: Pulls the daily revised laws and administrative rules instantly.
- **Precision Filtering**: Checks updates against an Excel file (`fsc_hierarchy_all.xlsx`) to only capture relevant compliance changes.
- **AI-Powered Analysis**: Utilizes LLMs to extract changes concisely, define the target audience, and generate concrete action items.
- **Production-Ready Reports**: Automatically formats and builds a highly professional `.docx` document ready for management or compliance teams.

## 🏗️ Architecture

1. **Python Engine**: Calls NLIC APIs, parses complex data, runs targeted filters, and invokes LLMs for summary generation. Outputs to `daily_data.json`.
2. **Node.js Engine**: Consumes the JSON data to render a fully styled, structured DOCX file using `docx`.

## ⚙️ Prerequisites

To run this project, make sure you have the following installed:
- **Python 3.8+**
- **Node.js 18+**

## 🛠️ Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/okdk7788/law_daily_scan.git
   cd law_daily_scan
   ```

2. **Set up the Python Environment**:
   It is recommended to use a virtual environment.
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   pip install -r requirements.txt
   ```

3. **Install Node.js Dependencies**:
   ```bash
   npm install
   ```

4. **Configure Environment Variables**:
   Copy the example environment file and add your API keys.
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to include your OpenRouter API Key and NLIC (oc_key):
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   oc_key=your_nlic_api_key_here
   ```

## 📖 Usage

Run the bash script to execute the complete end-to-end pipeline:

```bash
./run_daily_report.sh
```

### What happens when you run this?
1. The script will fetch today's legal updates from the NLIC API.
2. It will filter out non-relevant laws using `fsc_hierarchy_all.xlsx`.
3. The LLM parses the old vs. new textual changes to provide an intelligent summary.
4. Finally, the newly minted report is saved in the `output/` directory (e.g., `output/개정법률보고서_2024-05-15.docx`).

## 📁 Project Structure

- `core/daily_fetcher.py`: The main data extraction and LLM connection script.
- `core/generate_docx.js`: The reporting engine turning JSON into Word format.
- `fsc_hierarchy_all.xlsx`: Whitelist mapping for laws to monitor.
- `prompt.md`: Carefully crafted prompt injected into Gemini for generating analysis.
- `run_daily_report.sh`: Bash orchestrator.

## 🤝 Contribution

Contributions, issues and feature requests are welcome! 
Feel free to check [issues page](https://github.com/okdk7788/law_daily_scan/issues).

## 📄 License

This project is licensed under the [MIT License](LICENSE).
