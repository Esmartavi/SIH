"""
Verification Script for LLM Explain Layer
=========================================
Tests all 4 modes, SSE streaming, models info, health, and error handling
using FastAPI's TestClient.
"""

import os
import sys
import json
import time

# Ensure UTF-8 output encoding for Rupee sign (₹) on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("TESTING LLM EXPLAIN LAYER ENDPOINTS")
    print("=" * 60)

    # 1. Models endpoint
    print("\n[1] Testing /api/explain/models ...")
    r = client.get("/api/explain/models")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    print(f"    SUCCESS: Provider: {data['provider']}, Model: {data['model']}")

    # 2. Health endpoint
    print("\n[2] Testing /api/explain/health ...")
    r = client.get("/api/explain/health")
    assert r.status_code == 200
    data = r.json()
    print(f"    SUCCESS: Status: {data['status']}, Has API key: {data['has_api_key']}")

    # 3. Work-level explanation
    sample_work = "WS/MP18371/2024-2025/163349"
    print(f"\n[3] Testing /api/explain/work/{sample_work} ...")
    t0 = time.time()
    r = client.get(f"/api/explain/work/{sample_work}")
    elapsed = time.time() - t0
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    res = r.json()
    assert res["status"] == "success"
    exp = res["explanation"]
    print(f"    SUCCESS in {elapsed:.2f}s:")
    print(f"    - Case Summary: {exp.get('case_summary', '')[:100]}...")
    print(f"    - Red Flags ({len(exp.get('red_flags', []))}): {exp.get('red_flags', [])}")
    print(f"    - Severity Verdict: {exp.get('severity_verdict')}")
    print(f"    - Recommended Action: {exp.get('recommended_action')}")
    print(f"    - Funds at Risk: {exp.get('funds_at_risk_inr')}")

    # 4. Work-level streaming (SSE)
    print(f"\n[4] Testing /api/explain/work/{sample_work}/stream (SSE) ...")
    t0 = time.time()
    r = client.get(f"/api/explain/work/{sample_work}/stream")
    elapsed = time.time() - t0
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    lines = r.text.strip().split("\n")
    data_lines = [l for l in lines if l.startswith("data:")]
    assert len(data_lines) > 0, "No SSE data lines returned"
    print(f"    SUCCESS in {elapsed:.2f}s: Received {len(data_lines)} SSE frames.")
    print(f"    Sample SSE Frame: {data_lines[0]}")
    print(f"    Final SSE Frame: {data_lines[-1]}")

    # 5. MP-level explanation
    sample_mp = "Angomcha Bimol Akoijam"
    print(f"\n[5] Testing /api/explain/mp?mp_name={sample_mp} ...")
    t0 = time.time()
    r = client.get(f"/api/explain/mp?mp_name={sample_mp}")
    elapsed = time.time() - t0
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    res = r.json()
    assert res["status"] == "success"
    exp = res["explanation"]
    print(f"    SUCCESS in {elapsed:.2f}s:")
    print(f"    - Portfolio Summary: {exp.get('portfolio_summary', '')[:100]}...")
    print(f"    - Dominant Pattern: {exp.get('dominant_pattern')}")
    print(f"    - Systemic vs Isolated: {exp.get('systemic_vs_isolated')}")

    # 6. National briefing
    print("\n[6] Testing /api/explain/briefing ...")
    t0 = time.time()
    r = client.get("/api/explain/briefing")
    elapsed = time.time() - t0
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    res = r.json()
    assert res["status"] == "success"
    exp = res["explanation"]
    print(f"    SUCCESS in {elapsed:.2f}s:")
    print(f"    - Opening: {exp.get('opening_paragraph', '')[:100]}...")
    print(f"    - Headline Stat: {exp.get('headline_stat')}")
    print(f"    - Top States: {exp.get('top_states_of_concern')}")

    # 7. Error handling: 404 for non-existent work
    print("\n[7] Testing error handling (404 on non-existent work) ...")
    r = client.get("/api/explain/work/NON_EXISTENT_WORK_99999")
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"
    print("    SUCCESS: 404 handled gracefully.")

    print("\n" + "=" * 60)
    print("ALL LLM EXPLAIN LAYER TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
