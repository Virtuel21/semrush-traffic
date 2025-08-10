import argparse
import os
import pandas as pd
import matplotlib.pyplot as plt
from urllib.parse import urlparse

# Default CTR curve for positions 1-10 (approximate values)
DEFAULT_CTR = {
    1: 0.30,
    2: 0.15,
    3: 0.10,
    4: 0.07,
    5: 0.05,
    6: 0.04,
    7: 0.03,
    8: 0.02,
    9: 0.015,
    10: 0.01
}


def extract_cocon(url: str) -> str:
    """Extract a simple semantic group (cocon) from the URL.

    This takes the first path segment after the domain. If no path exists,
    the domain itself is returned.
    """
    if not isinstance(url, str) or not url:
        return "unknown"
    try:
        parsed = urlparse(url)
        path = parsed.path.strip("/")
        if not path:
            return parsed.netloc
        return path.split("/")[0]
    except Exception:
        return "unknown"


def estimate_incremental_traffic(df: pd.DataFrame, improvement: int, ctr_multiplier: float) -> pd.DataFrame:
    """Estimate new traffic and incremental traffic after position & CTR improvements."""
    df = df.copy()
    df["Search Volume"] = df["Search Volume"].fillna(0)
    df["Position"] = df["Position"].fillna(100)

    # Current estimated traffic using CTR curve
    df["current_ctr"] = df["Position"].map(DEFAULT_CTR).fillna(0.005)
    df["current_estimated_traffic"] = df["Search Volume"] * df["current_ctr"]

    # Apply position improvement
    df["new_position"] = (df["Position"] - improvement).clip(lower=1)
    df["new_ctr"] = df["new_position"].map(DEFAULT_CTR).fillna(0.005)
    df["new_ctr"] *= ctr_multiplier
    df["new_estimated_traffic"] = df["Search Volume"] * df["new_ctr"]

    df["incremental_traffic"] = df["new_estimated_traffic"] - df["current_estimated_traffic"]

    # Add cocon column
    df["Cocon"] = df["URL"].apply(extract_cocon)
    return df


def plot_incremental_by_cocon(df: pd.DataFrame, output: str):
    grouped = df.groupby("Cocon")["incremental_traffic"].sum().sort_values(ascending=False)
    plt.figure(figsize=(10, 6))
    grouped.plot(kind="bar")
    plt.ylabel("Incremental Traffic")
    plt.title("Incremental Traffic by Semantic Cocon")
    plt.tight_layout()
    plt.savefig(output)
    plt.close()


def main():
    parser = argparse.ArgumentParser(description="Estimate incremental traffic from Semrush export.")
    parser.add_argument("excel", help="Path to Semrush Excel export")
    parser.add_argument("--improvement", type=int, default=1, help="Number of positions gained for each keyword")
    parser.add_argument("--ctr-multiplier", type=float, default=1.0, help="Multiplier applied to CTR after optimization")
    parser.add_argument("--chart", default="incremental_traffic.png", help="Path to save bar chart of incremental traffic")

    args = parser.parse_args()

    df = pd.read_excel(args.excel)
    result = estimate_incremental_traffic(df, args.improvement, args.ctr_multiplier)

    plot_incremental_by_cocon(result, args.chart)

    summary = result.groupby("Cocon")["incremental_traffic"].sum().reset_index()
    print(summary.sort_values("incremental_traffic", ascending=False))
    result.to_csv("traffic_estimates.csv", index=False)
    print("Detailed estimates saved to traffic_estimates.csv")
    print(f"Chart saved to {args.chart}")


if __name__ == "__main__":
    main()
