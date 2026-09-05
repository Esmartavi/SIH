"""
MPLADS Data Analyser
Analyses all 12 CSV files (Lok Sabha + Rajya Sabha) and produces a
detailed report of data quality issues before cleaning.
"""

import pandas as pd
import numpy as np
import os
from datetime import datetime

# ─────────────────────────────────────────────
# FILE PATHS  (relative to this script's location
# so it works on ANY machine without editing)
# ─────────────────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))

FILES = {
    "LS_Allocated":     (r"LOK shabha data\Allocated Limit for Honble MPs (1).csv",       "Lok Sabha"),
    "LS_Recommended":   (r"LOK shabha data\Works Recommended.csv",                         "Lok Sabha"),
    "LS_Sanctioned":    (r"LOK shabha data\Works Sanctioned.csv",                          "Lok Sabha"),
    "LS_Completed":     (r"LOK shabha data\Works Completed.csv",                           "Lok Sabha"),
    "LS_Expenditure":   (r"LOK shabha data\Expenditure on Completed and On-going Works as on Date.csv", "Lok Sabha"),
    "LS_Calamity":      (r"LOK shabha data\Amount consented for Calamity.csv",             "Lok Sabha"),
    "RS_Allocated":     (r"rajya shabha\Allocated Limit for Honble MPs (2).csv",           "Rajya Sabha"),
    "RS_Recommended":   (r"rajya shabha\Works Recommended (1).csv",                        "Rajya Sabha"),
    "RS_Sanctioned":    (r"rajya shabha\Works Sanctioned (1).csv",                         "Rajya Sabha"),
    "RS_Completed":     (r"rajya shabha\Works Completed (1).csv",                          "Rajya Sabha"),
    "RS_Expenditure":   (r"rajya shabha\Expenditure on Completed and On-going Works as on Date (1).csv", "Rajya Sabha"),
    "RS_Calamity":      (r"rajya shabha\Amount consented for Calamity (1).csv",            "Rajya Sabha"),
}

report_lines = []

def log(msg=""):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))
    report_lines.append(msg)

def separator(title=""):
    line = "=" * 70
    if title:
        log(f"\n{line}")
        log(f"  {title}")
        log(line)
    else:
        log(line)

def analyse_file(name, rel_path, house):
    full_path = os.path.join(BASE, rel_path)
    separator(f"{name}  [{house}]")

    if not os.path.exists(full_path):
        log(f"  FILE NOT FOUND: {full_path}")
        return

    try:
        df = pd.read_csv(full_path, dtype=str, encoding="utf-8-sig")
    except Exception as e:
        log(f"  Could not load: {e}")
        return

    rows, cols = df.shape
    log(f"  Rows        : {rows:,}")
    log(f"  Columns     : {cols}")
    log(f"  Column names: {list(df.columns)}")

    # Missing values
    log(f"\n  [ Missing / Null Values ]")
    missing = df.isnull().sum()
    for col, cnt in missing.items():
        if cnt > 0:
            pct = cnt / rows * 100
            log(f"    WARN '{col}'  ->  {cnt:,} missing  ({pct:.1f}%)")
    if missing.sum() == 0:
        log("    OK No null values found")

    # String N/A values
    log(f"\n  [ String N/A Values ]")
    na_counts = {}
    for col in df.columns:
        cnt = df[col].str.strip().str.upper().isin(["N/A", "NA", "NONE", "NULL", "-"]).sum()
        if cnt > 0:
            na_counts[col] = cnt
    if na_counts:
        for col, cnt in na_counts.items():
            log(f"    WARN '{col}'  ->  {cnt:,} string N/A values")
    else:
        log("    OK No string N/A values found")

    # Tab issues
    log(f"\n  [ Tab Character Issues ]")
    tab_issues = {}
    for col in df.columns:
        cnt = df[col].str.contains(r'\t', na=False).sum()
        if cnt > 0:
            tab_issues[col] = cnt
    if tab_issues:
        for col, cnt in tab_issues.items():
            log(f"    WARN '{col}'  ->  {cnt:,} rows have TAB characters")
    else:
        log("    OK No tab characters found")

    # Duplicate rows
    log(f"\n  [ Duplicate Rows ]")
    dups = df.duplicated().sum()
    if dups > 0:
        log(f"    WARN {dups:,} fully duplicate rows found")
    else:
        log("    OK No duplicate rows")

    # Numeric columns
    amount_cols = [c for c in df.columns if any(k in c.lower() for k in
                   ["amount", "disbursed", "allocated", "fund", "limit"])]
    if amount_cols:
        log(f"\n  [ Numeric Column Checks ]")
        for col in amount_cols:
            non_numeric = pd.to_numeric(df[col].str.replace(",", ""), errors="coerce").isna().sum()
            if non_numeric > 0:
                log(f"    WARN '{col}'  ->  {non_numeric:,} non-numeric values")
            else:
                series = pd.to_numeric(df[col].str.replace(",", ""), errors="coerce")
                log(f"    OK '{col}'  ->  min={series.min():,.0f}  max={series.max():,.0f}  mean={series.mean():,.0f}")

    # Date columns
    date_cols = [c for c in df.columns if "date" in c.lower()]
    if date_cols:
        log(f"\n  [ Date Column Checks ]")
        for col in date_cols:
            parsed = pd.to_datetime(df[col], dayfirst=True, errors="coerce")
            bad = parsed.isna().sum()
            if bad > 0:
                log(f"    WARN '{col}'  ->  {bad:,} unparseable dates")
                bad_vals = df[col][parsed.isna()].dropna().unique()[:5]
                log(f"       Sample bad values: {list(bad_vals)}")
            else:
                log(f"    OK '{col}'  ->  range: {parsed.min().date()} to {parsed.max().date()}")

    # Cardinality
    log(f"\n  [ Key Column Cardinality ]")
    key_cols = [c for c in df.columns if any(k in c.lower() for k in
                ["member", "mp", "vendor", "constituency", "state", "work id", "work status", "payment"])]
    for col in key_cols:
        uniq = df[col].nunique()
        log(f"    '{col}'  ->  {uniq:,} unique values")
        top5 = df[col].value_counts().head(5)
        for val, cnt in top5.items():
            log(f"       {cnt:>6,}x  {str(val)[:60]}")

    # Fraud checks
    log(f"\n  [ Fraud-Relevant Quick Checks ]")
    vendor_col = next((c for c in df.columns if "vendor" in c.lower()), None)

    # Explicitly match both LS variant (Parliaments) and RS variant (Parliament)
    # Also covers any future column naming differences between the two houses
    MP_COL_CANDIDATES = [
        "Hon'ble Members of Parliaments",   # Lok Sabha exact header
        "Hon'ble Members of Parliament",    # Rajya Sabha exact header
        "Hon'ble Members of Parliament",    # fallback lower-stripped
    ]
    mp_col = None
    for candidate in MP_COL_CANDIDATES:
        if candidate in df.columns:
            mp_col = candidate
            break
    # Final fallback: fuzzy match
    if mp_col is None:
        mp_col = next((c for c in df.columns if "member" in c.lower() or
                       ("hon" in c.lower() and "parliament" in c.lower())), None)

    if mp_col:
        log(f"    MP column detected: '{mp_col}'")
    else:
        log("    WARN: Could not detect MP column — skipping vendor fraud checks")

    if vendor_col and mp_col:
        grp = df.groupby(mp_col)[vendor_col].nunique()
        log(f"    MP with most unique vendors: {grp.idxmax()} ({grp.max()} vendors)")
        single_vendor_mp = (grp == 1).sum()
        log(f"    MPs using only 1 vendor: {single_vendor_mp}")
        top_pair = df.groupby([mp_col, vendor_col]).size().reset_index(name="count")
        top_pair = top_pair.sort_values("count", ascending=False).head(5)
        log(f"    Top 5 MP-Vendor pairs by frequency:")
        for _, row in top_pair.iterrows():
            log(f"       {row['count']:>5}x  MP: {str(row[mp_col])[:30]}  ->  Vendor: {str(row[vendor_col])[:30]}")

    status_col = next((c for c in df.columns if "status" in c.lower()), None)
    if status_col:
        log(f"\n    Work Status Distribution:")
        for val, cnt in df[status_col].value_counts().items():
            log(f"       {cnt:>6,}x  {val}")

    log()


if __name__ == "__main__":
    log("=" * 70)
    log("  MPLADS DATA QUALITY ANALYSIS REPORT")
    log(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log("=" * 70)

    for name, (rel_path, house) in FILES.items():
        analyse_file(name, rel_path, house)

    report_path = os.path.join(BASE, "data_analysis_report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))

    print(f"\n\nFull report saved to: {report_path}")
