import os
import json
import sys
from datetime import datetime, timedelta, timezone
import re

# Allow importing from parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from law_api_client import NLICClient
except ImportError:
    print("Error: law_api_client.py must be in the parent directory.")
    sys.exit(1)

def get_env_key():
    try:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('oc_key='):
                    return line.split('=')[1].strip()
    except FileNotFoundError:
        return None
    return None

def find_first_list(d, target_keys=["law", "법령", "admrul", "행정규칙"]):
    if isinstance(d, list): return d
    if not isinstance(d, dict): return None
    
    # Try exact match first
    for k in target_keys:
        if k in d:
            res = d[k]
            if isinstance(res, dict): return [res]
            if isinstance(res, list): return res

    for v in d.values():
        res = find_first_list(v, target_keys)
        if res: return res
    return None

def clean_html(text):
    if not text: return ""
    # Remove all HTML tags including <img>
    clean = re.sub(r'<[^>]+>', '', text)
    return clean.strip()

def flatten_text(lst):
    if not lst: return []
    flat_list = []
    if isinstance(lst, str): return [lst]
    if isinstance(lst, dict): return [str(lst)]
    for itm in lst:
        if isinstance(itm, list): flat_list.extend(flatten_text(itm))
        elif isinstance(itm, str): flat_list.append(itm)
        elif isinstance(itm, dict): flat_list.append(str(itm))
    return flat_list

def normalize_law_name(name):
    if not name: return ""
    # Strip whitespace first, then remove agency prefixes like (금융위원회)
    name = name.strip()
    name = re.sub(r'^\([^)]+\)\s*', '', name)
    return name.strip()

def load_target_laws(excel_path):
    if not os.path.exists(excel_path):
        print(f"Warning: Excel file {excel_path} not found. Filtering disabled.")
        return None
    try:
        import pandas as pd
        df = pd.read_excel(excel_path)
        if '명칭' not in df.columns:
            print(f"Warning: '명칭' column missing in {excel_path}. Filtering disabled.")
            return None
        names = df['명칭'].dropna().astype(str).tolist()
        return {normalize_law_name(n) for n in names}
    except Exception as e:
        print(f"Error loading target laws from Excel: {e}")
        return None

def main():
    import os
    from dotenv import load_dotenv
    from langchain_core.messages import HumanMessage
    
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))
    
    llm = None
    provider = os.getenv("LLM_PROVIDER", "openrouter").lower()
    model_name = os.getenv("LLM_MODEL")

    try:
        if provider == "openai":
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model=model_name or "gpt-4o", temperature=0.1)
        elif provider == "anthropic":
            from langchain_anthropic import ChatAnthropic
            llm = ChatAnthropic(model=model_name or "claude-3-5-sonnet-latest", temperature=0.1)
        elif provider == "ollama":
            from langchain_ollama import ChatOllama
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            llm = ChatOllama(model=model_name or "llama3", base_url=base_url, temperature=0.1)
        elif provider == "openrouter":
            from langchain_openrouter import ChatOpenRouter
            llm = ChatOpenRouter(model=model_name or "google/gemini-3-flash-preview", temperature=0.1)
        else:
            print(f"Warning: Unsupported LLM_PROVIDER '{provider}'. Falling back to None.")
    except Exception as e:
        print(f"Warning: Failed to initialize LLM ({provider}): {e}")

    key = get_env_key()
    if not key:
        print("Error: oc_key not found in .env file")
        sys.exit(1)

    client = NLICClient(oc_key=key)
    
    # Target date: today (KST)
    kst = timezone(timedelta(hours=9))
    target_date_str = datetime.now(kst).strftime("%Y%m%d")
    display_date = f"{target_date_str[:4]}-{target_date_str[4:6]}-{target_date_str[6:]}"
    
    print(f"Fetching laws and admin rules effective on {display_date}...")
    
    report_data = {
        "date": display_date,
        "laws": []
    }
    
    all_laws = []
    
    # 1. Fetch Laws (eflaw)
    try:
        results = client.call("lsEfYdListGuide", efYd=f"{target_date_str}~{target_date_str}")
        law_list = find_first_list(results)
        if law_list:
            for l in law_list: l["_type"] = "law"
            all_laws.extend(law_list)
    except Exception as e:
        print(f"Failed to fetch laws: {e}")

    # 2. Fetch Administrative Rules (admrul)
    try:
        res_prom = client.call("admrulListGuide", date=target_date_str)
        list_prom = find_first_list(res_prom) or []
        res_ef = client.call("admrulListGuide", sort="efdes")
        list_ef_all = find_first_list(res_ef) or []
        list_ef = [r for r in list_ef_all if r.get("시행일자") == target_date_str]
        admrul_map = {}
        for r in list_prom + list_ef:
            rid = r.get("행정규칙일련번호")
            if rid:
                r["_type"] = "admrul"
                admrul_map[rid] = r
        all_laws.extend(list(admrul_map.values()))
    except Exception as e:
        print(f"Failed to fetch administrative rules: {e}")

    # 3. Filter by Excel list (fsc_hierarchy_all.xlsx)
    excel_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fsc_hierarchy_all.xlsx")
    target_names = load_target_laws(excel_path)
    if target_names is not None:
        filtered_list = []
        for l in all_laws:
            name = l.get("법령명한글") or l.get("법령명") or l.get("행정규칙명")
            if normalize_law_name(name) in target_names:
                filtered_list.append(l)
        print(f"Filtered {len(all_laws)} items down to {len(filtered_list)} based on Excel list.")
        all_laws = filtered_list

    try:
        total_count = len(all_laws)
        print(f"Total relevant items (Laws + Admin Rules): {total_count}")
        
        processed_count = 0
        
        for item in all_laws:
            if not isinstance(item, dict): continue
            
            is_admrul = (item.get("_type") == "admrul")
            
            if is_admrul:
                name = item.get("행정규칙명")
                gubun = item.get("제개정구분명")
                law_id = item.get("행정규칙일련번호")
                api_info = "admrulInfoGuide"
                api_comparison = "admrulOldAndNewInfoGuide"
                call_params = {"ID": law_id} # Admrul uses ID
            else:
                name = item.get("법령명한글") or item.get("법령명")
                gubun = item.get("제개정구분명") or item.get("제개정구분")
                law_id = item.get("법령일련번호")
                api_info = "lsNwInfoGuide" 
                api_comparison = "oldAndNewInfoGuide"
                call_params = {"MST": law_id} # Laws use MST for version-specific info
                
            if not law_id: continue
                
            print(f" Fetching details for: {name} (ID: {law_id}, Type: {'AdminRule' if is_admrul else 'Law'})")
            
            try:
                detail = client.call(api_info, **call_params)
                if not isinstance(detail, dict):
                    print(f"   Warning: API {api_info} returned non-dict for {name}")
                    continue
                
                # Extract info node
                if is_admrul:
                    service_node = detail.get("AdmRulService", {})
                    # Fallback if top-level is not AdmRulService
                    if not service_node: service_node = detail
                    law_info = service_node.get("행정규칙기본정보", {})
                    reason_container = service_node
                    revision_container = service_node
                else:
                    # Law response root can be any key like '법령' or '법령정보'
                    root_key = list(detail.keys())[0] if detail else "법령"
                    root_node = detail.get(root_key, {})
                    if not isinstance(root_node, dict): root_node = detail
                    law_info = root_node.get("법령") if not root_node.get("개정문") else root_node
                    if not law_info: law_info = root_node
                    reason_container = law_info
                    revision_container = law_info
                
                reason = "No reason available."
                reason_node = reason_container.get("제개정이유", {})
                if isinstance(reason_node, str): reason = clean_html(reason_node)
                elif isinstance(reason_node, dict):
                    reason_content = reason_node.get("제개정이유내용", "")
                    flat_reason = flatten_text(reason_content)
                    clean_reason = []
                    for line in flat_reason:
                        if line and not any(blurp in line for blurp in ["[일부개정]", "[일괄개정]", "[전분개정]", "[타법개정]", "<법제처 제공>"]):
                            if line.strip(): clean_reason.append(clean_html(line))
                    reason = "\n".join(clean_reason) if clean_reason else "\n".join([clean_html(f) for f in flat_reason])
                
                revision_text = "No revision text available."
                revision_node = revision_container.get("개정문", {})
                if isinstance(revision_node, str): revision_text = clean_html(revision_node)
                elif isinstance(revision_node, dict):
                    revision_content = revision_node.get("개정문내용", "")
                    flat_rev = flatten_text(revision_content)
                    clean_rev = [clean_html(r) for r in flat_rev if clean_html(r)]
                    revision_text = "\n".join(clean_rev)

                # Fetch comparison
                comparison = []
                try:
                    old_new_info = client.call(api_comparison, **call_params)
                    comp_root = "AdmRulOldAndNewService" if is_admrul else "OldAndNewService"
                    # Fallback: find any key that contains "OldAndNew"
                    if old_new_info and not comp_root in old_new_info:
                        for k in old_new_info.keys():
                            if "OldAndNew" in k:
                                comp_root = k
                                break
                    
                    if old_new_info and isinstance(old_new_info.get(comp_root), dict):
                        old_new_srv = old_new_info[comp_root]
                        shin_list = old_new_srv.get("신조문목록", {}).get("조문", [])
                        gu_list = old_new_srv.get("구조문목록", {}).get("조문", [])
                        if isinstance(shin_list, dict): shin_list = [shin_list]
                        if isinstance(gu_list, dict): gu_list = [gu_list]
                        for idx in range(max(len(shin_list or []), len(gu_list or []))):
                            new_t = (shin_list[idx].get("content", "") if shin_list and idx < len(shin_list) else "")
                            old_t = (gu_list[idx].get("content", "") if gu_list and idx < len(gu_list) else "")
                            c_new, c_old = clean_html(new_t), clean_html(old_t)
                            if c_new or c_old: comparison.append({"old": c_old, "new": c_new})
                except Exception: pass

                # LLM Summary
                llm_summary = None
                if llm and (reason.strip() or revision_text.strip()):
                    try:
                        from langchain_core.output_parsers import JsonOutputParser
                        from pydantic import BaseModel, Field
                        class ResponseSchemaModel(BaseModel):
                            target_audience: str = Field(description="누구에게 이 법이 적용되는지 구체적으로 명시. 예: 20~100마리 미만 민간 동물보호시설 운영자")
                            changes: list[str] = Field(description="[기존] 내용과 [변경] 내용을 반드시 '하나의 문자열 요소' 안에 함께 담아주세요. 항목당 형식은 반드시 '[기존] (내용) \\n [변경] (내용)' 이어야 합니다. 절대로 [기존]과 [변경]을 별도의 배열 요소로 나누지 마세요.")
                            action_items: list[str] = Field(description="대상자가 실질적으로 대비하거나 행동해야 할 구체적인 사항의 문자열 배열")
                        output_parser = JsonOutputParser(pydantic_object=ResponseSchemaModel)
                        format_inst = output_parser.get_format_instructions()
                        prom_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prompt.md")
                        with open(prom_path, "r", encoding="utf-8") as f: base_prompt = f.read()
                        comp_t = ""
                        if comparison:
                            comp_t = "\n\n[신구조문대비표]\n"
                            for comp in comparison[:10]:
                                comp_t += f"- (기존): {comp.get('old', 'N/A')}\n  (변경): {comp.get('new', 'N/A')}\n"
                        law_text = f"법령명: {name} ({gubun})\n\n[제개정 이유]\n{reason.strip()[:1500]}\n\n[개정 주요 내용]\n{revision_text.strip()[:1500]}{comp_t}"
                        prompt = base_prompt.replace("{format_instructions}", format_inst).replace("(이곳에 분석할 개정법률보고서 내용을 붙여넣으세요)", law_text)
                        res = llm.invoke([HumanMessage(content=prompt)])
                        if res and res.content:
                            llm_summary = output_parser.parse(res.content)
                            if llm_summary and "changes" in llm_summary and isinstance(llm_summary["changes"], list):
                                refined_changes = []
                                temp_block = ""
                                for chg in llm_summary["changes"]:
                                    chg_s = chg.strip()
                                    if chg_s.startswith("[기존]"):
                                        if temp_block:
                                            refined_changes.append(temp_block)
                                        temp_block = chg
                                    elif chg_s.startswith("[변경]") or chg_s.startswith("->") or chg_s.startswith("▶"):
                                        if temp_block:
                                            sep = "" if temp_block.endswith("\n") else "\n"
                                            temp_block += sep + chg
                                        else:
                                            refined_changes.append(chg)
                                    else:
                                        if temp_block:
                                            sep = "" if temp_block.endswith("\n") else "\n"
                                            temp_block += sep + chg
                                        else:
                                            refined_changes.append(chg)
                                if temp_block:
                                    refined_changes.append(temp_block)
                                llm_summary["changes"] = refined_changes
                    except Exception as e: print(f"   LLM failed for {name}: {e}")

                report_data["laws"].append({
                    "name": name, "type": gubun, "id": law_id, "is_admin_rule": is_admrul,
                    "reason": reason.strip(), "revision_text": revision_text.strip(),
                    "comparison": comparison, "llm_summary": llm_summary
                })
                processed_count += 1
            except Exception as e: print(f" Failed to process: {name}: {e}")

        with open("daily_data.json", 'w', encoding='utf-8') as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
        print(f"\nSuccessfully saved parsed data to daily_data.json")
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
