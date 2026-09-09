"""
Core Benford's Law Engine
=========================
Fast, vectorized implementation of Benford's Law statistical tests:
- First-Digit Analysis (1-9)
- Second-Digit Analysis (0-9)
- First-Two-Digits Analysis (10-99)
- Mark Nigrini's Mean Absolute Deviation (MAD) Conformity Ratings
- Chi-Square Goodness-of-Fit (chi2 and p-value)
- Z-Scores with Yates continuity correction
"""

import math
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from scipy.stats import chi2


@dataclass
class DigitDistribution:
    digit: int
    observed_count: int
    observed_pct: float
    expected_count: float
    expected_pct: float
    diff_pct: float
    z_score: float
    is_anomaly: bool
    risk_level: str  # NORMAL, MODERATE, CRITICAL


@dataclass
class BenfordTestResult:
    test_type: str  # "first_digit", "second_digit", "first_two_digits"
    sample_size: int
    mad: float
    conformity_status: str  # Close Conformity, Acceptable, Marginally Acceptable, Non-Conformity
    chi_square: float
    p_value: float
    degrees_of_freedom: int
    anomaly_score: float  # 0 to 100 index
    critical_digits: List[int]
    distributions: List[DigitDistribution]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class BenfordAnalyzer:
    """
    Mathematical analyzer applying Benford's Law to numerical audit series.
    Optimized with vectorized NumPy routines for instantaneous evaluation
    over millions of financial records.
    """

    # Nigrini MAD Conformity Thresholds
    MAD_THRESHOLDS = {
        "first_digit": [
            (0.006, "Close Conformity"),
            (0.012, "Acceptable Conformity"),
            (0.015, "Marginally Acceptable"),
            (float("inf"), "Non-Conformity (Suspicious Manipulation)")
        ],
        "second_digit": [
            (0.008, "Close Conformity"),
            (0.010, "Acceptable Conformity"),
            (0.012, "Marginally Acceptable"),
            (float("inf"), "Non-Conformity (Suspicious Manipulation)")
        ],
        "first_two_digits": [
            (0.0012, "Close Conformity"),
            (0.0018, "Acceptable Conformity"),
            (0.0022, "Marginally Acceptable"),
            (float("inf"), "Non-Conformity (Suspicious Manipulation)")
        ]
    }

    @staticmethod
    def _clean_and_filter(data: Any) -> np.ndarray:
        """Sanitize numerical series, filtering out zeroes, negative numbers, and non-finite values."""
        if isinstance(data, pd.Series):
            arr = pd.to_numeric(data, errors="coerce").dropna().to_numpy()
        elif isinstance(data, (list, tuple)):
            arr = np.array(data, dtype=float)
        else:
            arr = np.asarray(data, dtype=float)

        # Retain only strictly positive finite numbers
        mask = np.isfinite(arr) & (arr > 0)
        return arr[mask]

    @staticmethod
    def extract_digits(amounts: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Vectorized extraction of first digit, second digit, and first two digits.
        Uses scale-invariant log10 mantissa arithmetic for microsecond execution.
        """
        if len(amounts) == 0:
            return np.array([], dtype=int), np.array([], dtype=int), np.array([], dtype=int)

        # Scale numbers so that leading digit is in [1, 9]
        # x = 10 ** (log10(amount) - floor(log10(amount)))
        # Vectorized mantissa calculation with float precision protection
        log10_val = np.log10(amounts)
        mantissa = log10_val - np.floor(log10_val)
        norm_val = np.round(10.0 ** mantissa, 12)

        # Clip safely to avoid floating-point boundary overflow
        norm_val = np.clip(norm_val, 1.0, 9.99999999999)
        first_digits = np.floor(norm_val).astype(int)

        scaled_two = np.round(norm_val * 10.0, 10)
        scaled_two = np.clip(scaled_two, 10.0, 99.99999999999)
        first_two = np.floor(scaled_two).astype(int)
        second_digits = first_two % 10

        return first_digits, second_digits, first_two

    @classmethod
    def get_expected_distribution(cls, test_type: str = "first_digit") -> Dict[int, float]:
        """Compute theoretical Benford probabilities (proportions 0.0 to 1.0)."""
        if test_type == "first_digit":
            return {d: math.log10(1.0 + 1.0 / d) for d in range(1, 10)}
        elif test_type == "second_digit":
            probs = {}
            for d2 in range(0, 10):
                # P(d2) = sum_{d1=1}^9 log10(1 + 1 / (10*d1 + d2))
                prob = sum(math.log10(1.0 + 1.0 / (10 * d1 + d2)) for d1 in range(1, 10))
                probs[d2] = prob
            return probs
        elif test_type == "first_two_digits":
            return {d: math.log10(1.0 + 1.0 / d) for d in range(10, 100)}
        else:
            raise ValueError(f"Unknown test type: {test_type}")

    @classmethod
    def evaluate(
        cls,
        data: Any,
        test_type: str = "first_digit",
        min_sample_size: int = 50
    ) -> BenfordTestResult:
        """
        Execute comprehensive Benford analysis on a numerical dataset.
        Returns a BenfordTestResult dataclass with full statistical verification.
        """
        arr = cls._clean_and_filter(data)
        n = len(arr)

        expected_dist = cls.get_expected_distribution(test_type)
        all_digits = list(expected_dist.keys())

        if n < min_sample_size:
            # Low sample size fallback
            empty_dists = [
                DigitDistribution(
                    digit=d,
                    observed_count=0,
                    observed_pct=0.0,
                    expected_count=0.0,
                    expected_pct=round(expected_dist[d] * 100, 2),
                    diff_pct=0.0,
                    z_score=0.0,
                    is_anomaly=False,
                    risk_level="NORMAL"
                )
                for d in all_digits
            ]
            return BenfordTestResult(
                test_type=test_type,
                sample_size=n,
                mad=0.0,
                conformity_status="Insufficient Data (< 50 records)",
                chi_square=0.0,
                p_value=1.0,
                degrees_of_freedom=len(all_digits) - 1,
                anomaly_score=0.0,
                critical_digits=[],
                distributions=empty_dists
            )

        # Extract digits
        d1, d2, d12 = cls.extract_digits(arr)
        if test_type == "first_digit":
            target_digits = d1
        elif test_type == "second_digit":
            target_digits = d2
        else:
            target_digits = d12

        # Count frequencies
        unique, counts = np.unique(target_digits, return_counts=True)
        count_map = dict(zip(unique, counts))

        distributions: List[DigitDistribution] = []
        abs_diff_sum = 0.0
        chi_sq_stat = 0.0
        critical_digits: List[int] = []

        for d in all_digits:
            obs_cnt = int(count_map.get(d, 0))
            obs_prop = obs_cnt / n
            exp_prop = expected_dist[d]
            exp_cnt = exp_prop * n

            obs_pct = obs_prop * 100.0
            exp_pct = exp_prop * 100.0
            diff_pct = obs_pct - exp_pct

            # Absolute deviation for MAD
            abs_diff_sum += abs(obs_prop - exp_prop)

            # Chi-square component
            if exp_cnt > 0:
                chi_sq_stat += ((obs_cnt - exp_cnt) ** 2) / exp_cnt

            # Z-Score with Yates continuity correction
            # Z = (|p - P| - 1/(2N)) / sqrt(P*(1-P)/N)
            var_prop = (exp_prop * (1.0 - exp_prop)) / n
            denom = math.sqrt(var_prop) if var_prop > 0 else 1.0
            numerator = max(0.0, abs(obs_prop - exp_prop) - (1.0 / (2.0 * n)))
            z_mag = numerator / denom

            # Preserve direction (+ for excess, - for deficit)
            z_score = z_mag if (obs_cnt >= exp_cnt) else -z_mag

            # Risk classification based on Z-score thresholds (1.96 = 95%, 2.58 = 99%)
            if abs(z_score) >= 2.58:
                risk_level = "CRITICAL"
                is_anomaly = True
                critical_digits.append(d)
            elif abs(z_score) >= 1.96:
                risk_level = "MODERATE"
                is_anomaly = True
            else:
                risk_level = "NORMAL"
                is_anomaly = False

            distributions.append(
                DigitDistribution(
                    digit=int(d),
                    observed_count=obs_cnt,
                    observed_pct=round(obs_pct, 2),
                    expected_count=round(exp_cnt, 1),
                    expected_pct=round(exp_pct, 2),
                    diff_pct=round(diff_pct, 2),
                    z_score=round(float(z_score), 2),
                    is_anomaly=is_anomaly,
                    risk_level=risk_level
                )
            )

        # Mean Absolute Deviation
        k = len(all_digits)
        mad = abs_diff_sum / k

        # Conformity status lookup based on Nigrini benchmarks
        thresholds = cls.MAD_THRESHOLDS.get(test_type, cls.MAD_THRESHOLDS["first_digit"])
        status = "Non-Conformity (Suspicious Manipulation)"
        for cutoff, label in thresholds:
            if mad <= cutoff:
                status = label
                break

        # Degrees of Freedom and Chi-square p-value
        df = k - 1
        p_val = float(chi2.sf(chi_sq_stat, df))

        # Composite Anomaly Score (0 - 100)
        # Scaled by MAD relative to acceptable threshold + maximum Z-score
        base_mad_target = thresholds[1][0]  # "Acceptable" limit
        mad_ratio = min(3.0, mad / (base_mad_target if base_mad_target > 0 else 0.012))
        max_abs_z = max((abs(d.z_score) for d in distributions), default=0.0)
        z_ratio = min(3.0, max_abs_z / 2.58)

        anomaly_score = min(100.0, round((0.6 * (mad_ratio / 3.0) + 0.4 * (z_ratio / 3.0)) * 100.0, 1))

        return BenfordTestResult(
            test_type=test_type,
            sample_size=n,
            mad=round(float(mad), 5),
            conformity_status=status,
            chi_square=round(float(chi_sq_stat), 2),
            p_value=float(f"{p_val:.2e}"),
            degrees_of_freedom=df,
            anomaly_score=anomaly_score,
            critical_digits=critical_digits,
            distributions=distributions
        )
