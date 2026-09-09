"""
FastAPI Router for LLM Explain Layer
====================================
Exposes forensic intelligence endpoints for works, MP portfolios, national briefings,
and Server-Sent Events (SSE) streaming for real-time judge presentations.
"""

import urllib.parse
from fastapi import APIRouter, HTTPException, Path, Query
from fastapi.responses import StreamingResponse
from .explain import GeminiExplainer

router = APIRouter(prefix="/api/explain", tags=["AI Explain Layer"])
_explainer = GeminiExplainer()


@router.get("/models")
async def get_models_info():
    """Returns active LLM configuration, model status, and supported endpoints."""
    return {
        "status": "active",
        "provider": "Google GenAI (Gemini Flash)",
        "model": _explainer.model,
        "features": [
            "Forensic Case File Generation (Work-level)",
            "Real-Time Server-Sent Events (SSE) Streaming",
            "MP Portfolio Systemic Fraud Intelligence",
            "Ministry Executive Briefing (National-level)",
            "Automatic Statistical & Rule-Based Fallback"
        ],
        "endpoints": [
            "GET /api/explain/work/{work_id}",
            "GET /api/explain/work/{work_id}/stream",
            "GET /api/explain/stream/{work_id}",
            "GET /api/explain/mp?mp_name={name}",
            "GET /api/explain/briefing",
            "GET /api/explain/models",
            "GET /api/explain/health"
        ]
    }


@router.get("/health")
async def explain_health():
    """Health check for LLM explain layer and in-memory caches."""
    return {
        "status": "healthy",
        "model": _explainer.model,
        "has_api_key": bool(_explainer.api_key),
        "cached_works_count": len(_explainer._work_cache),
        "cached_mps_count": len(_explainer._mp_cache)
    }


@router.get("/work/{work_id:path}/stream")
async def explain_work_stream_endpoint(work_id: str = Path(..., description="Full Work ID")):
    """
    Stream live forensic audit narrative token-by-token using Server-Sent Events (SSE).
    Perfect for interactive live UI demonstrations where judges see the AI thinking.
    """
    decoded_work_id = urllib.parse.unquote(work_id.strip())
    # Strip any trailing '/stream' if accidentally duplicated
    if decoded_work_id.endswith("/stream"):
        decoded_work_id = decoded_work_id[:-7]

    return StreamingResponse(
        _explainer.explain_work_stream(decoded_work_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/stream/{work_id:path}")
async def explain_work_stream_alias(work_id: str = Path(..., description="Full Work ID")):
    """Alternative route for SSE streaming to avoid any path parameter ambiguities."""
    decoded_work_id = urllib.parse.unquote(work_id.strip())
    return StreamingResponse(
        _explainer.explain_work_stream(decoded_work_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/work/{work_id:path}")
async def explain_work_endpoint(work_id: str = Path(..., description="Full Work ID e.g. WS/MP18371/2024-2025/163349")):
    """
    Generate an audit-grade case file narrative for an individual flagged work.
    Returns structured JSON with summary, red flags, severity verdict, and recommended action.
    """
    decoded_work_id = urllib.parse.unquote(work_id.strip())
    
    # Defensive handling: if client called /work/{work_id}/stream and hit this route
    if decoded_work_id.endswith("/stream"):
        clean_id = decoded_work_id[:-7]
        return StreamingResponse(
            _explainer.explain_work_stream(clean_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    try:
        explanation = _explainer.explain_work(decoded_work_id)
        return {
            "status": "success",
            "work_id": decoded_work_id,
            "explanation": explanation
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error explaining work: {str(e)}")


@router.get("/mp")
async def explain_mp_endpoint(mp_name: str = Query(..., description="Full or partial MP name")):
    """
    Generate an MP-level systemic risk intelligence audit report.
    Analyzes portfolio funds at risk, contractor monopolization, and delayed execution.
    """
    decoded_mp_name = urllib.parse.unquote(mp_name.strip())
    try:
        explanation = _explainer.explain_mp(decoded_mp_name)
        return {
            "status": "success",
            "mp_name": decoded_mp_name,
            "explanation": explanation
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error explaining MP portfolio: {str(e)}")


@router.get("/briefing")
async def explain_briefing_endpoint():
    """
    Generate an executive-level briefing for the MoSPI Ministry Secretary.
    Synthesizes Benford's Law findings, estimation bias, and funds at risk across all States.
    """
    try:
        explanation = _explainer.explain_briefing()
        return {
            "status": "success",
            "explanation": explanation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error generating briefing: {str(e)}")
