"""
Analyze Image Column in Works Completed (Lok Sabha and Rajya Sabha)
"""
import os
import pandas as pd

ls_path = os.path.join("data", "raw", "LOK shabha data", "Works Completed.csv")
rs_path = os.path.join("data", "raw", "rajya shabha", "Works Completed (1).csv")

def analyze_file(path, label):
    print("=" * 60)
    print(f"ANALYZING {label}: {path}")
    print("=" * 60)
    df = pd.read_csv(path, low_memory=False)
    print(f"Total Rows: {len(df):,}")
    
    # Find image column
    img_col = None
    for c in df.columns:
        if "image" in c.lower():
            img_col = c
            break
            
    if not img_col:
        print("[!] No image column found.")
        return
        
    print(f"Image Column Name: {repr(img_col)}")
    
    # Analyze values
    vc = df[img_col].value_counts(dropna=False)
    print("Top values in Image column:")
    for val, count in vc.head(10).items():
        pct = (count / len(df)) * 100
        print(f"  * {repr(val)}: {count:,} rows ({pct:.2f}%)")
        
    has_image = df[df[img_col].notna() & ~df[img_col].astype(str).str.strip().isin(["", "nan", "NaN", "N/A", "NA", "null", "None"])]
    print(f"\nTotal with image value: {len(has_image):,} ({len(has_image)/len(df)*100:.2f}%)")
    print(f"Total WITHOUT image: {len(df) - len(has_image):,} ({(len(df)-len(has_image))/len(df)*100:.2f}%)")

analyze_file(ls_path, "LOK SABHA")
print("\n")
analyze_file(rs_path, "RAJYA SABHA")
