"""Raw-data contract checks for FreshRetailNet-50K train.parquet."""

from pathlib import Path

import pyarrow.parquet as pq
import pytest

RAW = Path(__file__).resolve().parents[1] / "data" / "train.parquet"
REQUIRED = {
    "city_id",
    "store_id",
    "product_id",
    "dt",
    "sale_amount",
    "hours_sale",
    "stock_hour6_22_cnt",
    "hours_stock_status",
    "discount",
}


@pytest.fixture(scope="module")
def raw():
    return pq.ParquetFile(RAW)


@pytest.fixture(scope="module")
def frame(raw):
    table = raw.read(
        columns=["store_id", "product_id", "dt", "sale_amount", "stock_hour6_22_cnt"]
    )
    return table.to_pandas()


def test_required_fields_present(raw):
    assert REQUIRED <= set(raw.schema_arrow.names)


def test_no_duplicate_shelf_days(frame):
    duplicated = frame.duplicated(["store_id", "product_id", "dt"])
    assert not duplicated.any(), f"{int(duplicated.sum())} duplicate shelf-days"


def test_no_negative_sales(frame):
    negative = frame.sale_amount < 0
    assert not negative.any(), f"{int(negative.sum())} negative sale rows"


def test_required_fields_not_null(frame):
    counts = {column: int(frame[column].isna().sum()) for column in frame.columns}
    assert not any(counts.values()), counts


def test_date_range_about_90_days(frame):
    days = frame.dt.nunique()
    assert 85 <= days <= 95, f"{days} days"


def test_hourly_flags_are_binary_and_complete(raw):
    total = raw.num_row_groups
    for group in (0, total // 2, total - 1):
        table = raw.read_row_group(
            group, columns=["hours_stock_status", "hours_sale", "stock_hour6_22_cnt"]
        )
        statuses = table.column("hours_stock_status").to_pylist()
        sales = table.column("hours_sale").to_pylist()
        counts = table.column("stock_hour6_22_cnt").to_pylist()
        for status, hourly, count in zip(statuses, sales, counts):
            assert len(status) == 24 and len(hourly) == 24
            assert set(status) <= {0, 1}
            assert sum(status[6:22]) == count, (
                f"row group {group}: stock_hour6_22_cnt {count} "
                f"!= sum of hours 6-22 {sum(status[6:22])}"
            )
