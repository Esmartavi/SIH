"""
MPLADS Fraud Detection — Backend API
FastAPI server that serves fraud_flags.csv data and manages the audit log.
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import sqlite3
import subprocess
import sys
import os
import jwt
import hashlib
from datetime import datetime, timedelta
import json

app = FastAPI(title="MPLADS Fraud Detection API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR   = os.path.dirname(BASE_DIR)
FLAGS_FILE = os.path.join(ROOT_DIR, "fraud_flags.csv")
DB_FILE    = os.path.join(ROOT_DIR, "audit_log.db")
MODELS_PY  = os.path.join(ROOT_DIR, "fraud_models.py")
VENV_PY    = os.path.join(ROOT_DIR, "venv", "Scripts", "python.exe")

# ── JWT Config ─────────────────────────────────────────────────────────────────
SECRET_KEY = "mplads_sih_2026_secret_key"
ALGORITHM  = "HS256"
security   = HTTPBearer(auto_error=False)

# ── Demo User Accounts (In production: DB-backed, MoSPI-administered) ──────────
DEMO_USERS = {
    "ministry_admin": {
        "password_hash": hashlib.sha256("Ministry@2026".encode()).hexdigest(),
        "role": "ministry",
        "name": "MoSPI Ministry Official",
    },
    "state_nodal_up": {
        "password_hash": hashlib.sha256("StateUP@2026".encode()).hexdigest(),
        "role": "state",
        "state": "Uttar Pradesh",
        "name": "State Nodal Authority — UP",
    },
    "district_pilibhit": {
        "password_hash": hashlib.sha256("District@2026".encode()).hexdigest(),
        "role": "district",
        "state": "Uttar Pradesh",
        "ida": "PILIBHIT",
        "name": "District Authority — Pilibhit",
    },
    "mp_javed": {
        "password_hash": hashlib.sha256("MP@2026".encode()).hexdigest(),
        "role": "mp",
        "mp_name": "Shri Javed Ali Khan",
        "name": "Shri Javed Ali Khan (MP)",
    },
}

# ── DB Init ────────────────────────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS dismissals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            action TEXT NOT NULL,
            justification TEXT NOT NULL,
            original_risk_score REAL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# ── Helpers ────────────────────────────────────────────────────────────────────
def load_flags() -> pd.DataFrame:
    if not os.path.exists(FLAGS_FILE):
        raise HTTPException(
            status_code=503,
            detail="fraud_flags.csv not found. Call POST /api/run-pipeline first."
        )
    df = pd.read_csv(FLAGS_FILE, encoding="utf-8-sig")
    df = df.fillna("")
    return df

def create_token(username: str, role: str, extra: dict = {}) -> str:
    payload = {
        "sub": username,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=12),
        **extra
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ── Auth Endpoints ─────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
def login(req: LoginRequest):
    user = DEMO_USERS.get(req.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    pw_hash = hashlib.sha256(req.password.encode()).hexdigest()
    if pw_hash != user["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    extra = {k: v for k, v in user.items() if k not in ("password_hash", "role")}
    token = create_token(req.username, user["role"], extra)
    return {"access_token": token, "role": user["role"], "name": user["name"]}

# ── Pipeline Trigger ───────────────────────────────────────────────────────────
@app.post("/api/run-pipeline")
def run_pipeline(user=Depends(decode_token)):
    if user["role"] not in ("ministry", "state"):
        raise HTTPException(status_code=403, detail="Only Ministry or State officials can trigger pipeline.")
    try:
        result = subprocess.run(
            [VENV_PY, MODELS_PY],
            capture_output=True, text=True, timeout=600
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Pipeline error: {result.stderr[-500:]}")
        return {"status": "success", "message": "Pipeline completed. fraud_flags.csv updated."}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Pipeline timed out after 10 minutes.")

# ── Flags / Alerts ─────────────────────────────────────────────────────────────
@app.get("/api/flags")
def get_flags(user=Depends(decode_token)):
    df = load_flags()
    role = user.get("role")

    # Role-based filtering
    if role == "mp":
        df = df[df["mp_name"] == user.get("mp_name", "")]
    elif role == "district":
        df = df[df["state"] == user.get("state", "")]
    elif role == "state":
        df = df[df["state"] == user.get("state", "")]
    # ministry sees everything

    df = df.sort_values("risk_score", ascending=False)
    return df.to_dict(orient="records")

# ── States Aggregation ─────────────────────────────────────────────────────────
@app.get("/api/states")
def get_states(user=Depends(decode_token)):
    df = load_flags()
    
    label_map = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
    df["risk_num"] = df["risk_label"].map(label_map).fillna(1)

    state_stats = df.groupby("state").agg(
        total_works=("work_id", "count"),
        critical_count=("risk_label", lambda x: (x == "CRITICAL").sum()),
        high_count=("risk_label", lambda x: (x == "HIGH").sum()),
        avg_risk=("risk_score", "mean"),
        max_risk=("risk_score", "max"),
    ).reset_index()

    return state_stats.fillna(0).to_dict(orient="records")

# ── MP Drill Down ──────────────────────────────────────────────────────────────
@app.get("/api/mp/{mp_name}")
def get_mp_data(mp_name: str, user=Depends(decode_token)):
    df = load_flags()
    mp_df = df[df["mp_name"].str.contains(mp_name, case=False, na=False)]
    
    if mp_df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for MP: {mp_name}")
    
    summary = {
        "mp_name": mp_name,
        "total_works": len(mp_df),
        "critical_count": int((mp_df["risk_label"] == "CRITICAL").sum()),
        "high_count": int((mp_df["risk_label"] == "HIGH").sum()),
        "total_amount": float(mp_df["sanction_amount"].replace("", 0).astype(float).sum()),
        "avg_risk_score": float(mp_df["risk_score"].mean()),
        "works": mp_df.sort_values("risk_score", ascending=False).to_dict(orient="records")
    }
    return summary

# ── MP List ────────────────────────────────────────────────────────────────────
@app.get("/api/mp-list")
def get_mp_list(user=Depends(decode_token)):
    df = load_flags()
    mps = df["mp_name"].dropna().unique().tolist()
    return sorted(mps)

# ── Validate ───────────────────────────────────────────────────────────────────
@app.get("/api/validate")
def run_validation(user=Depends(decode_token)):
    validate_py = os.path.join(ROOT_DIR, "validate.py")
    if not os.path.exists(validate_py):
        raise HTTPException(status_code=404, detail="validate.py not found")
    
    result = subprocess.run(
        [VENV_PY, validate_py],
        capture_output=True, text=True, timeout=120,
        cwd=ROOT_DIR
    )
    return {
        "stdout": result.stdout,
        "returncode": result.returncode
    }

# ── Audit Log ──────────────────────────────────────────────────────────────────
class DismissalRequest(BaseModel):
    work_id: str
    action: str
    justification: str
    original_risk_score: float

@app.post("/api/audit/dismiss")
def dismiss_alert(req: DismissalRequest, user=Depends(decode_token)):
    if len(req.justification.strip()) < 20:
        raise HTTPException(status_code=400, detail="Justification must be at least 20 characters.")
    
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO dismissals (work_id, timestamp, user_id, role, action, justification, original_risk_score) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (req.work_id, datetime.now().isoformat(), user["sub"], user["role"], req.action, req.justification, req.original_risk_score)
    )
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Action permanently logged to audit trail."}

@app.get("/api/audit")
def get_audit_log(user=Depends(decode_token)):
    if user["role"] not in ("ministry", "state"):
        raise HTTPException(status_code=403, detail="Only Ministry or State officials can view the full audit log.")
    
    conn = sqlite3.connect(DB_FILE)
    df = pd.read_sql_query("SELECT * FROM dismissals ORDER BY timestamp DESC", conn)
    conn.close()
    return df.to_dict(orient="records")

@app.get("/api/audit/da-flagged")
def get_flagged_das(user=Depends(decode_token)):
    """Auto-flag District Authorities who dismissed 10+ CRITICAL alerts in 30 days."""
    if user["role"] != "ministry":
        raise HTTPException(status_code=403, detail="Ministry access only.")
    
    conn = sqlite3.connect(DB_FILE)
    df = pd.read_sql_query("SELECT * FROM dismissals WHERE action='DISMISSED'", conn)
    conn.close()
    
    if df.empty:
        return []
    
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    cutoff = datetime.now() - timedelta(days=30)
    recent = df[df["timestamp"] > cutoff]
    
    counts = recent.groupby("user_id").size().reset_index(name="dismissal_count")
    flagged = counts[counts["dismissal_count"] >= 10]
    return flagged.to_dict(orient="records")

# ── Image Forensics ────────────────────────────────────────────────────────────
@app.get("/api/image-forensics")
def get_image_forensics():
    summary_path = os.path.join(ROOT_DIR, "forensics", "forensics_summary.json")
    if os.path.exists(summary_path):
        with open(summary_path, "r") as f:
            return json.load(f)
    return {"status": "not_run", "message": "Run image_forensics.py first"}

@app.post("/api/image-forensics/run")
def run_image_forensics_endpoint(user=Depends(decode_token)):
    if user["role"] not in ("ministry", "state"):
        raise HTTPException(status_code=403, detail="Only Ministry or State officials can trigger image forensics.")
    
    script_path = os.path.join(ROOT_DIR, "forensics", "image_forensics.py")
    try:
        subprocess.run([VENV_PY, script_path], cwd=ROOT_DIR, check=True)
        return {"status": "success", "message": "Forensics complete"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Health Check ───────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    flags_ready = os.path.exists(FLAGS_FILE)
    return {
        "status": "ok",
        "fraud_flags_ready": flags_ready,
        "timestamp": datetime.now().isoformat()
    }
