import logging
import os
import json
import re
import time
from datetime import datetime, timedelta
from typing import Any, Dict, FrozenSet, List, Optional, Tuple
import requests

logger = logging.getLogger(__name__)

class NLICError(Exception): pass
class NLICAPIError(NLICError):
    def __init__(self, message, *, url="", params=None):
        super().__init__(message)
        self.url = url
        self.params = params or {}

class NLICNetworkError(NLICError):
    def __init__(self, message, *, url="", params=None):
        super().__init__(message)
        self.url = url
        self.params = params or {}

class _CacheEntry:
    __slots__ = ("data", "expires_at")
    def __init__(self, data, expires_at):
        self.data = data
        self.expires_at = expires_at
    def is_expired(self):
        return datetime.utcnow() >= self.expires_at

class NLICClient:
    SEARCH_ENDPOINT = "http://www.law.go.kr/DRF/lawSearch.do"
    SERVICE_ENDPOINT = "http://www.law.go.kr/DRF/lawService.do"
    _RE_DESC_COLON = re.compile(r"서비스 대상\s*[:：]\s*(\w+)")
    _RE_DESC_PAREN = re.compile(r"서비스 대상\([^)]*[:：]\s*(\w+)")

    def __init__(self, oc_key, metadata_path="law_api_metadata.json", timeout=10.0, max_retries=3, retry_backoff=0.5, rate_limit_delay=0.1, cache_ttl=300):
        self.oc_key = oc_key
        self.metadata_path = metadata_path
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_backoff = retry_backoff
        self.rate_limit_delay = rate_limit_delay
        self.cache_ttl = cache_ttl
        self.api_map = {}
        self._target_cache = {}
        self._cache = {}
        self._last_request_time = 0.0
        self._load_metadata()

    def _load_metadata(self):
        if not os.path.exists(self.metadata_path): return
        with open(self.metadata_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
            for item in data:
                if item.get("htmlName"): self.api_map[item["htmlName"]] = item

    def _extract_target(self, html_name):
        if html_name in self._target_cache: return self._target_cache[html_name]
        api_info = self.api_map.get(html_name)
        if not api_info: return None
        params = api_info.get("request_parameters", [])
        for p in params:
            if p[0] != "target": continue
            ptype, pdesc = p[1], p[2]
            if ":" in ptype:
                val = ptype.split(":", 1)[1].split("(")[0].strip()
                if val:
                    self._target_cache[html_name] = val
                    return val
            if ":" in pdesc:
                m = self._RE_DESC_COLON.search(pdesc) or self._RE_DESC_PAREN.search(pdesc)
                if m:
                    self._target_cache[html_name] = m.group(1)
                    return m.group(1)
        return None

    def _resolve_endpoint(self, html_name):
        api_info = self.api_map.get(html_name)
        if api_info and api_info.get("endpoint_url"):
            if "lawService.do" in api_info["endpoint_url"]: return self.SERVICE_ENDPOINT
        return self.SERVICE_ENDPOINT if "Info" in html_name else self.SEARCH_ENDPOINT

    def call(self, api_name, **params):
        endpoint = self._resolve_endpoint(api_name)
        target = self._extract_target(api_name)
        query_params = {"OC": self.oc_key, "type": "JSON"}
        if target: query_params["target"] = target
        query_params.update(params)
        for attempt in range(self.max_retries):
            try:
                resp = requests.get(endpoint, params=query_params, timeout=self.timeout)
                if resp.status_code >= 400: raise NLICAPIError(f"HTTP {resp.status_code}", url=resp.url)
                body = resp.json()
                if str(body.get("resultCode", "00")) != "00":
                    raise NLICAPIError(f"API Error: {body.get('resultMsg')}", url=resp.url)
                return body
            except Exception as e:
                if attempt == self.max_retries - 1: raise
                time.sleep(self.retry_backoff * (2**attempt))
