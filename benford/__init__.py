"""
Benford's Law Forensic Module for Public Procurement & MPLADS Audit
===================================================================
Provides audit-grade statistical anomaly detection, tender threshold
clustering analysis, Nigrini Mean Absolute Deviation (MAD) ratings,
and visual forensic reporting for government fund disbursements.
"""

from .core import BenfordAnalyzer, BenfordTestResult, DigitDistribution
from .procurement_audit import ProcurementAuditEngine
from .visualizer import BenfordVisualizer

__all__ = [
    "BenfordAnalyzer",
    "BenfordTestResult",
    "DigitDistribution",
    "ProcurementAuditEngine",
    "BenfordVisualizer"
]
