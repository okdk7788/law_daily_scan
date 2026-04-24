# Law Daily Scan 📜✨

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Law Daily Scan**은 매일 업데이트되는 대한민국 법령 및 행정규칙 개정 사항을 자동으로 가져오고 분석하여, 깔끔한 형태의 보고서로 생성해 주는 컴플라이언스 모니터링 자동화 도구입니다. 금융위(FSC) 및 관련 규칙 등 조직 내에서 반드시 팔로업해야 하는 법령들의 변경 사항을 추적하는 데 최적화되어 있습니다.

이 도구는 **국가법령정보센터(NLIC) API**와 사전에 정의된 타겟 엑셀 리스트를 교차 검증하며, **LLM (OpenRouter 웹을 통한 Gemini 등)** 을 활용해 복잡한 법률 개정 텍스트를 실무자가 바로 이해할 수 있는 비즈니스 인사이트 및 구체적인 Action Item으로 변환하여 **Word 문서(.docx)** 모닝 브리핑용 파일로 자동 생성합니다.

## 🚀 주요 기능

- **자동 스캐닝 (Automated Scanning)**: 매일 시행되거나 공포되는 법령과 행정규칙을 자동으로 수집합니다.
- **정밀 필터링 (Precision Filtering)**: `fsc_hierarchy_all.xlsx` 엑셀 파일에 정의된 명칭과 대조하여, 우리 조직에 필요한 법령 개정 사항만 정확하게 발췌합니다.
- **AI 기반 법률 분석 (AI-Powered Analysis)**: LLM이 개정 전/후 조문을 분석해 주요 변경 요약, 대상 독자, 그리고 실무자가 즉시 대비해야 할 행동 지침을 도출합니다.
- **프로덕션 레벨 보고서 (Production-Ready Reports)**: 추가적인 편집 없이 바로 팀이나 경영진에 공유할 수 있는 완성도 높은 Word(`.docx`) 문서로 저장합니다.

## 🏗️ 아키텍처 흐름

1. **Python Engine**: NLIC API 호출 -> 복잡한 법령 데이터 파싱 -> 엑셀 기반 필터링 -> LLM 호출(프롬프트 분석). 최종 데이터를 `daily_data.json`으로 저장.
2. **Node.js Engine**: 파이썬이 생성한 JSON 데이터를 읽어 들여 `docx` 라이브러리로 구조화된 스타일의 워드 파일을 최종 렌더링.

## ⚙️ 사전 요구 사항 (Prerequisites)

이 프로젝트를 실행하려면 다음 환경이 필요합니다:
- **Python 3.8+**
- **Node.js 18+**

## 🛠️ 설치 및 설정 (Setup & Installation)

1. **저장소 클론하기**:
   ```bash
   git clone https://github.com/okdk7788/law_daily_scan.git
   cd law_daily_scan
   ```

2. **파이썬 환경 구성**:
   가상 환경(virtual environment)을 사용하는 것을 권장합니다.
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Windows의 경우 `venv\Scripts\activate` 사용
   pip install -r requirements.txt
   ```

3. **Node.js 의존성 설치**:
   ```bash
   npm install
   ```

4. **환경 변수 구성**:
   기본 제공되는 예제 파일을 복사하여 여러분의 API 키를 입력하세요.
   ```bash
   cp .env.example .env
   ```
   `.env` 파일을 열어 다음 값을 필수로 채워주세요:
   ```env
   OPENROUTER_API_KEY=나의_오픈라우터_API_키
   oc_key=국가법령정보센터_API_인증키
   ```

## 📖 사용 방법 (Usage)

전체 스크립트를 한 번에 실행하려면 제공된 Bash 스크립트를 사용합니다:

```bash
./run_daily_report.sh
```

### 어떻게 동작하나요?
1. NLIC API에서 오늘의 규정 변경 사항을 수집합니다.
2. `fsc_hierarchy_all.xlsx`에 명시되지 않은 법령은 스킵합니다.
3. LLM이 변경된 법안 내용을 읽고 스마트 요약본을 작성합니다.
4. 모든 과정이 끝나면 `output/` 폴더 내부에 오늘 날짜가 적힌 Word 보고서 파일(예: `output/개정법률보고서_2024-05-15.docx`)이 생성됩니다!

---

## 🎯 커스텀 타겟 리스트 (엑셀에 필요한 법령/행정규칙 추가)

이 프로그램은 무분별하게 모든 개정안을 가져오지 않고, **우리가 모니터링하기로 정한 법령/행정규칙 리스트**만 가져옵니다!
추가적인 법규 모니터링이 필요하다면 별도의 코드 수정 없이 엑셀 파일만 수정하면 됩니다:

1. 폴더 내의 `fsc_hierarchy_all.xlsx` 파일을 엽니다.
2. **'명칭'** 열(Column) 하단에 새롭게 추적하고 싶은 법령, 시행령, 행정규칙 이름 등을 정확하게 한 줄씩 추가합니다.
3. 저장하고 닫습니다. 다음 스크립트 실행부터 즉시 반영됩니다.

---

## 🕒 자동화 설정 가이드 (매일 정해진 시간에 리포트 뽑기)

매일 수동으로 스크립트를 돌릴 필요 없이 리눅스/맥의 **Crontab**을 이용해 출근 시간 전 새벽에 자동으로 리포트가 생성되도록 세팅할 수 있습니다.

1. 터미널에서 `crontab -e` 명령어를 입력합니다.
2. 파일의 가장 아래에 다음 줄을 추가합니다. (예: 매일 평일(월-금) 아침 7시 00분에 실행)
   ```bash
   0 7 * * 1-5 cd /본인의/절대/경로/law_daily_scan && ./run_daily_report.sh >> /본인의/절대/경로/law_daily_scan/output/cron.log 2>&1
   ```
3. 저장을 완료하면, 이제 매일 아침 출근할 때마다 `output/` 폴더 안에 신규 동향 보고서가 알아서 준비되어 있을 것입니다!

---

## 📁 주요 프로젝트 구조

- `core/daily_fetcher.py`: 데이터 파싱과 LLM 연동을 총괄하는 파이썬 핵심 스크립트.
- `core/generate_docx.js`: 구성된 데이터를 워드 양식으로 렌더링하는 JS 스크립트.
- `fsc_hierarchy_all.xlsx`: 필터링 대상이 정리된 화이트리스트 엑셀.
- `prompt.md`: AI가 비즈니스 영향도를 완벽하게 파악하도록 정교하게 튜닝된 프롬프트.
- `run_daily_report.sh`: 의존성 체크부터 2단 엔진(Py+JS)을 순차 구동하는 오케스트레이터.

## 📄 라이선스 (License)

이 프로젝트는 [MIT License](LICENSE)를 따릅니다. 누구나 자유롭게 활용하고, 수정하고 상업적 목적으로 배포할 수 있습니다.
