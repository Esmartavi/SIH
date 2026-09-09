"""
Procurement Audit Engine
========================
Applies forensic public procurement rules and threshold-gaming detection
to MPLADS financial data. Identifies split works, tender ceiling evasion,
round-number inflation, and ranks administrative entities by Benford deviation.
"""

import os
import math
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from .core import BenfordAnalyzer, BenfordTestResult


class ProcurementAuditEngine:
    """
    Forensic analysis engine specifically calibrated for Indian government
    procurement and MPLADS scheme financial guidelines.
    """

    # Statutory Indian Public Procurement Thresholds (in INR)
    # Ref: General Financial Rules (GFR) 2017 & MPLADS Administrative Norms
    DEFAULT_THRESHOLDS = [
        {
            "name": "Single Tender / Quotation Limit (₹5 Lakhs)",
            "threshold": 500000.0,
            "danger_min": 450000.0,
            "danger_max": 499999.0,
            "post_min": 500000.0,
            "post_max": 550000.0,
            "description": "Works split or priced just under ₹5 Lakhs to evade mandatory multi-bid competitive tendering."
        },
        {
            "name": "Limited Tender Inquiry Limit (₹10 Lakhs)",
            "threshold": 1000000.0,
            "danger_min": 900000.0,
            "danger_max": 999999.0,
            "post_min": 1000000.0,
            "post_max": 1100000.0,
            "description": "Transactions structured right below ₹10 Lakhs to avoid broader advertised e-tender publicity."
        },
        {
            "name": "National e-Procurement Threshold (₹25 Lakhs)",
            "threshold": 2500000.0,
            "danger_min": 2350000.0,
            "danger_max": 2499999.0,
            "post_min": 2500000.0,
            "post_max": 2650000.0,
            "description": "Works budgeted right under ₹25 Lakhs to bypass state-level centralized e-tendering."
        },
        {
            "name": "Special Technical Sanction Limit (₹50 Lakhs)",
            "threshold": 5000000.0,
            "danger_min": 4700000.0,
            "danger_max": 4999999.0,
            "post_min": 5000000.0,
            "post_max": 5300000.0,
            "description": "Budgeted right under ₹50 Lakhs to avoid mandatory Superintending Engineer scrutiny."
        }
    ]

    def __init__(self, data_dir: Optional[str] = None):
        self.root_dir = data_dir or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.sanctions_df: Optional[pd.DataFrame] = None
        self.expenditure_df: Optional[pd.DataFrame] = None

    def load_data(
        self,
        sanctions_df: Optional[pd.DataFrame] = None,
        expenditure_df: Optional[pd.DataFrame] = None
    ):
        """Load datasets into memory for fast querying."""
        if sanctions_df is not None:
            self.sanctions_df = sanctions_df
        else:
            sanctions_path = os.path.join(self.root_dir, "data", "processed", "fraud_flags.csv")
            if not os.path.exists(sanctions_path):
                sanctions_path = os.path.join(self.root_dir, "data", "processed", "clean_sanctioned.csv")
            if not os.path.exists(sanctions_path):
                sanctions_path = os.path.join(self.root_dir, "fraud_flags.csv")
            if not os.path.exists(sanctions_path):
                sanctions_path = os.path.join(self.root_dir, "clean_sanctioned.csv")
            if os.path.exists(sanctions_path):
                cols = ["work_id", "mp_name", "state", "ida", "work_category", "sanction_amount"]
                # Include total_spent or risk_score if in fraud_flags.csv
                try:
                    df = pd.read_csv(sanctions_path, usecols=lambda c: c in cols or c in ["total_spent", "risk_score", "work_status"], low_memory=False)
                    self.sanctions_df = df
                except Exception as e:
                    print(f"Warning loading sanctions data: {e}")

        if expenditure_df is not None:
            self.expenditure_df = expenditure_df
        else:
            exp_path = os.path.join(self.root_dir, "data", "processed", "clean_expenditure.csv")
            if not os.path.exists(exp_path):
                exp_path = os.path.join(self.root_dir, "clean_expenditure.csv")
            if os.path.exists(exp_path):
                try:
                    self.expenditure_df = pd.read_csv(exp_path, low_memory=False)
                except Exception as e:
                    print(f"Warning loading expenditure data: {e}")

    def audit_procurement_thresholds(
        self,
        series: Optional[pd.Series] = None,
        df: Optional[pd.DataFrame] = None,
        amount_col: str = "sanction_amount"
    ) -> List[Dict[str, Any]]:
        """
        Analyze financial amounts for statistical clustering right below
        statutory tender and administrative sanction limits.
        """
        target_df = df if df is not None else self.sanctions_df
        if target_df is None or target_df.empty:
            return []

        col = amount_col if amount_col in target_df.columns else "sanction_amount"
        if col not in target_df.columns:
            # Fallback to first numeric column
            num_cols = target_df.select_dtypes(include=[np.number]).columns
            if len(num_cols) == 0:
                return []
            col = num_cols[0]

        amounts = pd.to_numeric(target_df[col], errors="coerce").dropna()
        total_records = len(amounts)

        threshold_reports = []
        for rule in self.DEFAULT_THRESHOLDS:
            d_min = rule["danger_min"]
            d_max = rule["danger_max"]
            p_min = rule["post_min"]
            p_max = rule["post_max"]

            # Transactions in danger zone (just below limit)
            danger_mask = (amounts >= d_min) & (amounts <= d_max)
            danger_count = int(danger_mask.sum())
            danger_pct = round((danger_count / total_records) * 100.0, 2) if total_records > 0 else 0.0

            # Transactions in buffer zone (just above limit)
            post_mask = (amounts >= p_min) & (amounts <= p_max)
            post_count = int(post_mask.sum())
            post_pct = round((post_count / total_records) * 100.0, 2) if total_records > 0 else 0.0

            # Compute evasion ratio: danger_count / post_count
            # Natural distributions should be smooth or decreasing. An evasion ratio > 2.0 indicates an artificial cliff.
            evasion_ratio = round(danger_count / (post_count + 1), 2)
            cliff_detected = bool(evasion_ratio >= 1.75 and danger_count >= 15)

            threshold_reports.append({
                "rule_name": rule["name"],
                "threshold_amount": rule["threshold"],
                "danger_zone_range": f"₹{d_min:,.0f} - ₹{d_max:,.0f}",
                "post_zone_range": f"₹{p_min:,.0f} - ₹{p_max:,.0f}",
                "danger_count": danger_count,
                "danger_pct": danger_pct,
                "post_count": post_count,
                "post_pct": post_pct,
                "evasion_ratio": evasion_ratio,
                "cliff_detected": cliff_detected,
                "risk_verdict": "SUSPICIOUS EVASION CLIFF" if cliff_detected else "NORMAL SPREAD",
                "description": rule["description"]
            })

        return threshold_reports

    def audit_round_numbers(
        self,
        series: Optional[pd.Series] = None,
        df: Optional[pd.DataFrame] = None,
        amount_col: str = "sanction_amount"
    ) -> Dict[str, Any]:
        """
        Assess percentage of invoices/sanctions ending in exact rounded intervals
        (₹50,000, ₹1,00,000, ₹5,00,000), a classic forensic hallmark of manufactured quotes.
        """
        target_df = df if df is not None else self.sanctions_df
        if target_df is None or target_df.empty:
            return {}

        col = amount_col if amount_col in target_df.columns else target_df.columns[0]
        amounts = pd.to_numeric(target_df[col], errors="coerce").dropna()
        amounts = amounts[amounts > 0]
        total = len(amounts)

        if total == 0:
            return {}

        int_amts = np.round(amounts).astype(np.int64)
        mult_50k = int(((int_amts % 50000) == 0).sum())
        mult_100k = int(((int_amts % 100000) == 0).sum())
        mult_500k = int(((int_amts % 500000) == 0).sum())

        pct_50k = round((mult_50k / total) * 100.0, 2)
        pct_100k = round((mult_100k / total) * 100.0, 2)
        pct_500k = round((mult_500k / total) * 100.0, 2)

        # In legitimate construction bills with actual measurements, exact multiples of 1 Lakh are typically < 25%
        is_round_bias_high = bool(pct_100k > 35.0 or pct_50k > 50.0)

        return {
            "total_analyzed": total,
            "multiples_50k_count": mult_50k,
            "multiples_50k_pct": pct_50k,
            "multiples_100k_count": mult_100k,
            "multiples_100k_pct": pct_100k,
            "multiples_500k_count": mult_500k,
            "multiples_500k_pct": pct_500k,
            "round_bias_detected": is_round_bias_high,
            "verdict": "HIGH ESTIMATION BIAS (Manufactured figures likely)" if is_round_bias_high else "NATURAL MEASURED SPREAD"
        }

    def entity_drilldown_rankings(
        self,
        group_by: str = "state",
        amount_col: str = "sanction_amount",
        min_records: int = 50,
        top_k: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Rank administrative entities (State, District/IDA, MP, or Vendor)
        by their Benford Mean Absolute Deviation (MAD) non-conformity.
        """
        # Determine source dataframe
        if group_by in ["vendor_name", "vendor"]:
            df = self.expenditure_df
            amt = "fund_disbursed" if (df is not None and "fund_disbursed" in df.columns) else amount_col
            group_col = "vendor_name"
        else:
            df = self.sanctions_df
            amt = amount_col
            group_col = "state" if group_by == "state" else ("ida" if group_by in ["ida", "district"] else "mp_name")

        if df is None or df.empty or group_col not in df.columns:
            return []

        clean_df = df.dropna(subset=[group_col, amt]).copy()
        clean_df[amt] = pd.to_numeric(clean_df[amt], errors="coerce")
        clean_df = clean_df[clean_df[amt] > 0]

        grouped = clean_df.groupby(group_col)
        rankings = []

        for entity_name, group in grouped:
            if len(group) < min_records:
                continue

            res = BenfordAnalyzer.evaluate(group[amt], test_type="first_digit", min_sample_size=min_records)
            rankings.append({
                "entity": str(entity_name),
                "records_count": int(len(group)),
                "total_amount": round(float(group[amt].sum()), 2),
                "mad": res.mad,
                "conformity_status": res.conformity_status,
                "anomaly_score": res.anomaly_score,
                "chi_square": res.chi_square,
                "p_value": res.p_value,
                "critical_digits": res.critical_digits
            })

        # Sort descending by MAD score (most anomalous entity first)
        rankings.sort(key=lambda x: x["mad"], reverse=True)
        return rankings[:top_k]

    def get_flagged_anomalous_transactions(
        self,
        critical_digits: Optional[List[int]] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Retrieve specific project transactions that contribute directly to
        the Benford non-conformity and tender threshold cliffs.
        """
        if self.sanctions_df is None or self.sanctions_df.empty:
            return []

        df = self.sanctions_df.copy()
        df["amt"] = pd.to_numeric(df["sanction_amount"], errors="coerce").fillna(0.0)
        df = df[df["amt"] > 0]

        # Extract leading digit
        d1, _, _ = BenfordAnalyzer.extract_digits(df["amt"].to_numpy())
        df["lead_digit"] = d1

        crit_set = set(critical_digits) if (critical_digits is not None and len(critical_digits) > 0) else None

        # Statutory tender evasion ranges
        evasion_ranges = [
            (450000, 499999, "₹5L Tender Ceiling Evasion"),
            (900000, 999999, "₹10L Limited Tender Evasion"),
            (2350000, 2499999, "₹25L e-Procurement Evasion"),
            (4700000, 4999999, "₹50L Special Approval Evasion")
        ]

        # --- Vectorized flagging (replaces iterrows, ~100x faster) ---
        int_amts = np.round(df["amt"].to_numpy()).astype(np.int64)

        # Build a reasons column efficiently with vectorized ops
        reason_series = [[] for _ in range(len(df))]

        for low, high, tag in evasion_ranges:
            mask = (df["amt"].to_numpy() >= low) & (df["amt"].to_numpy() <= high)
            for idx in np.where(mask)[0]:
                reason_series[idx].append(tag)

        # Round-number inflation: >= 5,00,000 and divisible by 1,00,000
        round_mask = (int_amts >= 500000) & ((int_amts % 100000) == 0)
        for idx in np.where(round_mask)[0]:
            reason_series[idx].append("Exact Multiple of ₹1 Lakh (Estimate Inflation)")

        # Lead-digit filter
        lead_digits = df["lead_digit"].to_numpy().astype(int)

        flagged = []
        df_reset = df.reset_index(drop=True)
        for i, reasons in enumerate(reason_series):
            if len(reasons) == 0:
                continue
            ld = int(lead_digits[i])
            if crit_set is not None and ld not in crit_set:
                continue
            row = df_reset.iloc[i]
            flagged.append({
                "work_id": str(row.get("work_id", "")),
                "mp_name": str(row.get("mp_name", "")),
                "state": str(row.get("state", "")),
                "ida": str(row.get("ida", "")),
                "work_category": str(row.get("work_category", "")),
                "sanction_amount": float(row["amt"]),
                "lead_digit": ld,
                "reasons": reasons,
                "risk_level": "CRITICAL" if len(reasons) > 1 else "HIGH"
            })
            if len(flagged) >= limit:
                break

        return flagged
