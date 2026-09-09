"""
LLM Explain Layer
=================
Gemini-powered forensic auditor intelligence for MPLADS fraud detection.
Provides plain-English narratives for works, MP portfolios, and national briefings.
"""

from .context_builder import ContextBuilder, build_work_context, build_mp_context, build_national_context, format_inr
from .explain import GeminiExplainer

__all__ = [
    "ContextBuilder",
    "GeminiExplainer",
    "build_work_context",
    "build_mp_context",
    "build_national_context",
    "format_inr",
]
