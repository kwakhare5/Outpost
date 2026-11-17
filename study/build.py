"""Build the shelf-day table with normalized empty flags."""

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "study" / "data" / "train.parquet"
OUT = ROOT / "study" / "data" / "shelf_day.parquet"
OPEN_BUCKETS = 16


def main():
    table = pq.read_table(RAW)
    count = table.column("stock_hour6_22_cnt")
    flag = pc.if_else(
        pc.is_null(count),
        pa.scalar("unknown"),
        pc.if_else(pc.greater(count, 0), pa.scalar("yes"), pa.scalar("no")),
    )
    table = table.append_column("empty_flag", flag)
    pq.write_table(table, OUT)

    rows = table.num_rows
    pairs = table.select(["store_id", "product_id"]).to_pandas().drop_duplicates()
    days = table.column("dt").unique()
    values = pc.value_counts(flag)
    shares = {row["values"]: row["counts"] for row in values.to_pylist()}
    stockout_hours = pc.sum(count).as_py()

    print(f"rows: {rows:,}")
    print(f"shelves: {len(pairs):,}")
    print(f"days: {len(days):,}")
    for label in ("yes", "no", "unknown"):
        share = shares.get(label, 0) / rows
        print(f"empty_flag {label}: {share:.1%}")
    print(f"stockout_hour_share: {stockout_hours / (rows * OPEN_BUCKETS):.1%} of open hours")
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
