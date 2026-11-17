"""Download FreshRetailNet-50K once and record its identity as source.json."""

import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "study" / "data"
ARTIFACTS = ROOT / "study" / "artifacts"
URL = "https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K/resolve/main/data/train.parquet"
TARGET = DATA / "train.parquet"
SOURCE = ARTIFACTS / "source.json"
CHUNK = 8 * 1024 * 1024


def sha256_of(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(CHUNK), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download():
    part = TARGET.with_suffix(".parquet.part")
    request = urllib.request.Request(URL, headers={"User-Agent": "outpost-study"})
    digest = hashlib.sha256()
    size = 0
    with urllib.request.urlopen(request) as response, part.open("wb") as out:
        total = int(response.headers.get("Content-Length") or 0)
        milestone = 0
        while True:
            chunk = response.read(CHUNK)
            if not chunk:
                break
            out.write(chunk)
            digest.update(chunk)
            size += len(chunk)
            if total and size * 10 // total > milestone:
                milestone = size * 10 // total
                print(f"  {milestone * 10}% ({size:,} / {total:,} bytes)")
    part.replace(TARGET)
    return digest.hexdigest(), size


def stats(path):
    metadata = pq.ParquetFile(path).metadata
    table = pq.read_table(path, columns=["city_id", "store_id", "product_id"])
    pairs = table.select(["store_id", "product_id"]).to_pandas().drop_duplicates()
    return {
        "rows": metadata.num_rows,
        "series": int(len(pairs)),
        "stores": int(len(table.column("store_id").unique())),
        "cities": int(len(table.column("city_id").unique())),
    }


def main():
    DATA.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    checksum = size = None
    if TARGET.exists():
        checksum = sha256_of(TARGET)
        size = TARGET.stat().st_size
        if SOURCE.exists():
            recorded = json.loads(SOURCE.read_text(encoding="utf-8"))
            if checksum == recorded.get("sha256"):
                summarize(size, checksum, stats(TARGET))
                print("already downloaded; checksum matches source.json")
                return
            print("existing file does not match the recorded checksum; downloading again")
            checksum = size = None

    if checksum is None:
        checksum, size = download()
    counts = stats(TARGET)
    record = {
        "url": URL,
        "file": "study/data/train.parquet",
        "size_bytes": size,
        "sha256": checksum,
        "downloaded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "dataset": "FreshRetailNet-50K",
        "license": "CC BY 4.0",
        "credit": "Dingdong and the 2025 paper",
        "note": "Publishes no upstream checksum; the first SHA-256 becomes the reference.",
        **counts,
    }
    SOURCE.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    summarize(size, checksum, counts)
    print("recorded study/artifacts/source.json")


def summarize(size, checksum, counts):
    print(f"rows: {counts['rows']:,}")
    print(f"series: {counts['series']:,}")
    print(f"stores: {counts['stores']:,}")
    print(f"cities: {counts['cities']:,}")
    print(f"size: {size / 1e6:.1f} MB")
    print(f"sha256: {checksum}")


if __name__ == "__main__":
    main()
