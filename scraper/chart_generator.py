"""
Auto-generate styled charts for Telegram posts.
Dark theme with Tradeora branding.
"""

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np

# Tradeora chart theme
DARK_BG = "#1a1a2e"
PLOT_BG = "#16213e"
TEXT_COLOR = "#e0e0e0"
GRID_COLOR = "#2a2a4a"
LINE_COLOR = "#4da6ff"
HIGHLIGHT_COLOR = "#ff4444"
WATERMARK_COLOR = "#333355"


def generate_chart(
    title: str,
    subtitle: str,
    x_labels: list[str],
    y_values: list[float],
    source: str,
    output_path: str,
    chart_type: str = "line",
    highlight_last: bool = True,
    y_format: str = "number",  # "number", "percent", "currency"
) -> str:
    """
    Generate a styled chart and save to output_path.
    Returns the output_path.
    """
    fig, ax = plt.subplots(figsize=(8, 5), dpi=100)

    # Dark theme
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(PLOT_BG)
    ax.tick_params(colors=TEXT_COLOR, labelsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(GRID_COLOR)
    ax.spines["bottom"].set_color(GRID_COLOR)
    ax.grid(axis="y", color=GRID_COLOR, linewidth=0.5, alpha=0.5)

    x = np.arange(len(x_labels))

    if chart_type == "bar":
        bars = ax.bar(x, y_values, color=LINE_COLOR, width=0.6)
        if highlight_last and len(bars) > 0:
            bars[-1].set_color(HIGHLIGHT_COLOR)
    else:
        ax.plot(x, y_values, color=LINE_COLOR, linewidth=2)
        ax.fill_between(x, y_values, alpha=0.1, color=LINE_COLOR)
        if highlight_last and len(y_values) > 0:
            ax.plot(len(y_values) - 1, y_values[-1], "o", color=HIGHLIGHT_COLOR, markersize=8, zorder=5)
            # Red box around last value
            ax.annotate(
                f"{y_values[-1]:.1f}" if y_format == "number" else f"{y_values[-1]:.1f}%",
                xy=(len(y_values) - 1, y_values[-1]),
                xytext=(10, 10), textcoords="offset points",
                fontsize=10, color=HIGHLIGHT_COLOR, fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.3", facecolor=HIGHLIGHT_COLOR, alpha=0.2, edgecolor=HIGHLIGHT_COLOR),
            )

    # Labels
    ax.set_xticks(x)
    ax.set_xticklabels(x_labels, rotation=0 if len(x_labels) <= 12 else 45, ha="center")

    # Y-axis formatting
    if y_format == "percent":
        ax.yaxis.set_major_formatter(mticker.PercentFormatter())
    elif y_format == "currency":
        ax.yaxis.set_major_formatter(mticker.StrMethodFormatter("${x:,.0f}"))

    # Title and subtitle
    fig.text(0.05, 0.95, title, fontsize=14, fontweight="bold", color=TEXT_COLOR,
             transform=fig.transFigure, va="top")
    fig.text(0.05, 0.90, subtitle, fontsize=10, color="#888888",
             transform=fig.transFigure, va="top")

    # Source + watermark
    fig.text(0.05, 0.02, f"Source: {source}", fontsize=8, color="#666666",
             transform=fig.transFigure)
    fig.text(0.95, 0.02, "tradeora.com", fontsize=8, color=WATERMARK_COLOR,
             transform=fig.transFigure, ha="right")
    fig.text(0.5, 0.5, "TRADEORA", fontsize=40, color=WATERMARK_COLOR,
             transform=fig.transFigure, ha="center", va="center", alpha=0.15, fontweight="bold")

    plt.tight_layout(rect=[0, 0.05, 1, 0.88])
    plt.savefig(output_path, facecolor=fig.get_facecolor(), bbox_inches="tight", dpi=100)
    plt.close(fig)

    return output_path
