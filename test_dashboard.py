import streamlit as st
import pandas as pd
import requests

st.set_page_config(page_title="MPLADS Fraud Detector Test", layout="wide")

st.title("🚨 MPLADS Fraud Detection - Quick Test")

# Test API connection
st.sidebar.header("API Test")
api_url = st.sidebar.text_input("Backend URL", "http://localhost:8000")

if st.sidebar.button("Check API Health"):
    try:
        res = requests.get(f"{api_url}/api/health")
        if res.status_code == 200:
            st.sidebar.success("Backend is running!")
            st.sidebar.json(res.json())
        else:
            st.sidebar.error(f"Error: {res.status_code}")
    except Exception as e:
        st.sidebar.error(f"Connection failed: {e}")

# Load local data
st.header("Local Data (fraud_flags.csv)")
try:
    df = pd.read_csv("fraud_flags.csv")
    
    # KPIs
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Works Analyzed", f"{len(df):,}")
    col2.metric("CRITICAL Alerts", f"{len(df[df['risk_label'] == 'CRITICAL']):,}")
    col3.metric("HIGH Alerts", f"{len(df[df['risk_label'] == 'HIGH']):,}")
    col4.metric("Monopoly Flags", f"{len(df[df['work_vendor_flag'] == True]):,}")
    
    # Filter by risk
    risk_filter = st.selectbox("Filter by Risk Level", ["All", "CRITICAL", "HIGH", "MEDIUM", "LOW"])
    
    if risk_filter != "All":
        filtered_df = df[df['risk_label'] == risk_filter]
    else:
        filtered_df = df
        
    # Sort by risk score
    filtered_df = filtered_df.sort_values("risk_score", ascending=False)
    
    # Display table
    cols_to_show = ["work_id", "mp_name", "state", "work_category", "sanction_amount", "risk_score", "risk_label", "reason"]
    st.dataframe(filtered_df[cols_to_show].head(100), use_container_width=True)
    
except FileNotFoundError:
    st.error("fraud_flags.csv not found! Run the ML pipeline first.")
