"""
Benford Forensic Visualizer
===========================
Generates audit-grade, publication-quality interactive forensic charts:
1. Primary Observed vs Benford Expected Distribution (with confidence bands)
2. Statistical Z-Score Deviation Bar Chart (with critical significance lines)
3. Mark Nigrini MAD Conformity Speedometer Gauge
4. Statutory Tender Threshold Evasion Cliff Histogram
Ready for Streamlit, Plotly JSON API responses, and standalone HTML reports.
"""

import json
from typing import Dict, Any, List, Optional
import plotly.graph_objects as go
from .core import BenfordTestResult, DigitDistribution


class BenfordVisualizer:
    """
    Visualization engine rendering high-impact forensic graphics.
    Uses dark-mode glassmorphic aesthetics tailored for defense and anti-corruption auditing.
    """

    DARK_THEME = {
        "paper_bgcolor": "#0e131f",
        "plot_bgcolor": "#141b2d",
        "font_color": "#e0e6ed",
        "grid_color": "#232d45",
        "benford_line_color": "#00f0ff",      # Neon Cyan for theoretical curve
        "bar_normal_color": "#3b82f6",        # Clean Blue
        "bar_moderate_color": "#f59e0b",      # Amber Warning
        "bar_critical_color": "#ef4444",      # Crimson Alert
        "threshold_line_color": "#f43f5e"     # Vivid Rose
    }

    LIGHT_THEME = {
        "paper_bgcolor": "#ffffff",
        "plot_bgcolor": "#f8fafc",
        "font_color": "#0f172a",
        "grid_color": "#e2e8f0",
        "benford_line_color": "#0284c7",
        "bar_normal_color": "#2563eb",
        "bar_moderate_color": "#d97706",
        "bar_critical_color": "#dc2626",
        "threshold_line_color": "#e11d48"
    }

    @classmethod
    def create_distribution_figure(
        cls,
        result: BenfordTestResult,
        title: Optional[str] = None,
        dark_mode: bool = True
    ) -> go.Figure:
        """
        Build the flagship forensic chart: Observed vs Theoretical Benford's Law.
        Features color-coded deviation bars, neon theoretical curve, and statistical tooltips.
        """
        theme = cls.DARK_THEME if dark_mode else cls.LIGHT_THEME
        dists = result.distributions

        digits = [d.digit for d in dists]
        observed_pcts = [d.observed_pct for d in dists]
        expected_pcts = [d.expected_pct for d in dists]
        diff_pcts = [d.diff_pct for d in dists]
        z_scores = [d.z_score for d in dists]
        counts = [d.observed_count for d in dists]

        # Determine bar colors based on risk severity
        bar_colors = []
        for d in dists:
            if d.risk_level == "CRITICAL":
                bar_colors.append(theme["bar_critical_color"])
            elif d.risk_level == "MODERATE":
                bar_colors.append(theme["bar_moderate_color"])
            else:
                bar_colors.append(theme["bar_normal_color"])

        fig = go.Figure()

        # 1. Observed Distribution Bars
        hover_text = [
            f"<b>Digit: {d.digit}</b><br>" +
            f"Observed: {d.observed_pct:.2f}% ({c:,} records)<br>" +
            f"Expected: {e:.2f}%<br>" +
            f"Deviation: {diff:+.2f}%<br>" +
            f"Z-Score: {z:+.2f}<br>" +
            f"Verdict: <b>{d.risk_level}</b>"
            for d, c, e, diff, z in zip(dists, counts, expected_pcts, diff_pcts, z_scores)
        ]

        fig.add_trace(
            go.Bar(
                x=digits,
                y=observed_pcts,
                name="Observed Actual %",
                marker=dict(
                    color=bar_colors,
                    line=dict(color="rgba(255, 255, 255, 0.2)", width=1.5),
                    opacity=0.88
                ),
                text=[f"{p:.1f}%" for p in observed_pcts],
                textposition="outside",
                hoverinfo="text",
                hovertext=hover_text
            )
        )

        # 2. Theoretical Benford Law Curve
        fig.add_trace(
            go.Scatter(
                x=digits,
                y=expected_pcts,
                mode="lines+markers",
                name="Benford's Law (Theoretical)",
                line=dict(color=theme["benford_line_color"], width=3.5, shape="spline"),
                marker=dict(size=9, color="#ffffff", line=dict(color=theme["benford_line_color"], width=2.5)),
                hoverinfo="skip"
            )
        )

        chart_title = title or f"Benford's Law Forensic Audit — {result.test_type.replace('_', ' ').title()} (N={result.sample_size:,})"
        status_color = "#10b981" if "Close" in result.conformity_status else ("#f59e0b" if "Acceptable" in result.conformity_status else "#ef4444")

        fig.update_layout(
            title=dict(
                text=f"<b>{chart_title}</b><br><span style='font-size:13px; color:{status_color};'><b>Conformity: {result.conformity_status} (MAD = {result.mad:.5f} | χ² = {result.chi_square:.1f} | p = {result.p_value})</b></span>",
                x=0.03,
                y=0.95
            ),
            paper_bgcolor=theme["paper_bgcolor"],
            plot_bgcolor=theme["plot_bgcolor"],
            font=dict(color=theme["font_color"], family="Inter, Segoe UI, sans-serif"),
            xaxis=dict(
                title="Leading Digit",
                tickmode="linear",
                tick0=digits[0] if digits else 1,
                dtick=1 if len(digits) <= 10 else 5,
                gridcolor=theme["grid_color"],
                zeroline=False
            ),
            yaxis=dict(
                title="Frequency Percentage (%)",
                gridcolor=theme["grid_color"],
                zeroline=False,
                ticksuffix="%"
            ),
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="right",
                x=1,
                bgcolor="rgba(0,0,0,0.3)"
            ),
            margin=dict(l=60, r=40, t=100, b=60),
            hovermode="closest"
        )

        return fig

    @classmethod
    def create_zscore_figure(
        cls,
        result: BenfordTestResult,
        dark_mode: bool = True
    ) -> go.Figure:
        """
        Render Z-Score variance chart pinpointing exact statistically anomalous digits.
        Displays +/- 1.96 (p<0.05) and +/- 2.58 (p<0.01) significance thresholds.
        """
        theme = cls.DARK_THEME if dark_mode else cls.LIGHT_THEME
        dists = result.distributions

        digits = [d.digit for d in dists]
        z_scores = [d.z_score for d in dists]

        colors = []
        for z in z_scores:
            if abs(z) >= 2.58:
                colors.append(theme["bar_critical_color"])
            elif abs(z) >= 1.96:
                colors.append(theme["bar_moderate_color"])
            else:
                colors.append(theme["bar_normal_color"])

        fig = go.Figure()

        fig.add_trace(
            go.Bar(
                x=digits,
                y=z_scores,
                name="Z-Score",
                marker=dict(color=colors),
                text=[f"{z:+.2f}" for z in z_scores],
                textposition="outside"
            )
        )

        # Reference threshold lines
        fig.add_hline(y=2.58, line_dash="dash", line_color="#ef4444", annotation_text="+2.58 (99% Critical)", annotation_position="top right")
        fig.add_hline(y=1.96, line_dash="dot", line_color="#f59e0b", annotation_text="+1.96 (95% Sig)", annotation_position="top right")
        fig.add_hline(y=-1.96, line_dash="dot", line_color="#f59e0b")
        fig.add_hline(y=-2.58, line_dash="dash", line_color="#ef4444")

        fig.update_layout(
            title="<b>Statistical Z-Score Significance by Digit</b>",
            paper_bgcolor=theme["paper_bgcolor"],
            plot_bgcolor=theme["plot_bgcolor"],
            font=dict(color=theme["font_color"], family="Inter, Segoe UI, sans-serif"),
            xaxis=dict(title="Digit", tickmode="linear", dtick=1, gridcolor=theme["grid_color"]),
            yaxis=dict(title="Z-Score Deviation", gridcolor=theme["grid_color"]),
            margin=dict(l=60, r=40, t=60, b=60),
            showlegend=False
        )

        return fig

    @classmethod
    def create_mad_gauge_figure(
        cls,
        result: BenfordTestResult,
        dark_mode: bool = True
    ) -> go.Figure:
        """
        Render speedometer gauge displaying Mark Nigrini's Mean Absolute Deviation rating.
        """
        theme = cls.DARK_THEME if dark_mode else cls.LIGHT_THEME
        mad_val = result.mad

        # Calibrate Nigrini MAD benchmarks according to test type
        if result.test_type == "second_digit":
            c_close, c_acc, c_marg, max_range = 0.008, 0.010, 0.012, 0.024
            fmt = ".4f"
        elif result.test_type == "first_two_digits":
            c_close, c_acc, c_marg, max_range = 0.0012, 0.0018, 0.0022, 0.0050
            fmt = ".5f"
        else:
            c_close, c_acc, c_marg, max_range = 0.006, 0.012, 0.015, 0.030
            fmt = ".4f"

        upper_bound = max(max_range, mad_val * 1.25)

        fig = go.Figure(
            go.Indicator(
                mode="gauge+number",
                value=mad_val,
                number=dict(valueformat=fmt, font=dict(color=theme["font_color"], size=36)),
                title=dict(
                    text=f"<b>Nigrini MAD Index</b><br><span style='font-size:14px;color:#94a3b8'>{result.conformity_status}</span>",
                    font=dict(color=theme["font_color"], size=16)
                ),
                gauge=dict(
                    axis=dict(range=[0, upper_bound], tickformat=fmt, tickcolor=theme["font_color"]),
                    bar=dict(color="#ffffff", thickness=0.3),
                    bgcolor="rgba(0,0,0,0)",
                    steps=[
                        {"range": [0.000, c_close], "color": "#10b981"},   # Close Conformity
                        {"range": [c_close, c_acc], "color": "#3b82f6"},   # Acceptable
                        {"range": [c_acc, c_marg], "color": "#f59e0b"},    # Marginal
                        {"range": [c_marg, upper_bound], "color": "#ef4444"} # Non-Conforming
                    ],
                    threshold=dict(
                        line=dict(color="#ffffff", width=4),
                        thickness=0.75,
                        value=mad_val
                    )
                )
            )
        )

        fig.update_layout(
            paper_bgcolor=theme["paper_bgcolor"],
            plot_bgcolor=theme["plot_bgcolor"],
            font=dict(color=theme["font_color"], family="Inter, Segoe UI, sans-serif"),
            margin=dict(l=40, r=40, t=60, b=40),
            height=280
        )

        return fig

    @classmethod
    def create_threshold_cliff_figure(
        cls,
        threshold_reports: List[Dict[str, Any]],
        dark_mode: bool = True
    ) -> go.Figure:
        """
        Grouped bar chart illustrating the dramatic cliff between transactions
        just below tender thresholds (danger zone) vs just above (post zone).
        """
        theme = cls.DARK_THEME if dark_mode else cls.LIGHT_THEME

        names = [r["rule_name"].split("(")[0].strip() for r in threshold_reports]
        danger_counts = [r["danger_count"] for r in threshold_reports]
        post_counts = [r["post_count"] for r in threshold_reports]

        fig = go.Figure()

        fig.add_trace(
            go.Bar(
                x=names,
                y=danger_counts,
                name="Danger Zone (90-99% of Ceiling)",
                marker=dict(color="#ef4444"),
                text=[f"{c:,}" for c in danger_counts],
                textposition="outside"
            )
        )

        fig.add_trace(
            go.Bar(
                x=names,
                y=post_counts,
                name="Post-Threshold Buffer (100-110%)",
                marker=dict(color="#3b82f6"),
                text=[f"{c:,}" for c in post_counts],
                textposition="outside"
            )
        )

        fig.update_layout(
            title="<b>Statutory Tender Threshold Evasion (Artificial Cliff Effect)</b>",
            barmode="group",
            paper_bgcolor=theme["paper_bgcolor"],
            plot_bgcolor=theme["plot_bgcolor"],
            font=dict(color=theme["font_color"], family="Inter, Segoe UI, sans-serif"),
            xaxis=dict(title="Statutory Procurement Tier", gridcolor=theme["grid_color"]),
            yaxis=dict(title="Transaction Count", gridcolor=theme["grid_color"]),
            legend=dict(orientation="h", y=1.1, x=0),
            margin=dict(l=60, r=40, t=80, b=60)
        )

        return fig

    @classmethod
    def to_json(cls, fig: go.Figure) -> Dict[str, Any]:
        """Serialize figure to Plotly JSON format for frontend web consumers."""
        return json.loads(fig.to_json())

    @classmethod
    def to_html(cls, fig: go.Figure, full_html: bool = False) -> str:
        """Export figure as standalone embeddable HTML string."""
        return fig.to_html(full_html=full_html, include_plotlyjs="cdn")
