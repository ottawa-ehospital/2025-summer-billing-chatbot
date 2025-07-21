import csv
import json
import logging
import threading
import argparse
from pathlib import Path
from typing import Dict, Any

import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

API_BASE = "https://tysnx3mi2s.us-east-1.awsapprunner.com/table"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 5  # seconds


def send_post(url: str, payload: Dict[str, Any]):
    """Send a single POST request in a background thread and ignore timeouts."""

    def _task():
        try:
            requests.post(url, json=payload, headers=HEADERS, timeout=TIMEOUT)
            logging.info("POST to %s succeeded", url)
        except requests.exceptions.Timeout:
            # Intentionally ignore timeouts as per instructions
            logging.warning("Timeout ignored when POSTing to %s", url)
        except requests.exceptions.RequestException as exc:
            logging.error("Request to %s failed: %s", url, exc)

    threading.Thread(target=_task, daemon=True).start()


def upload_csv(table: str, csv_path: Path):
    url = f"{API_BASE}/{table}"
    if not csv_path.exists():
        raise FileNotFoundError(csv_path)

    with csv_path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        total = 0
        for row in reader:
            # Convert any empty strings -> None for cleaner JSON
            payload = {k: (v if v != "" else None) for k, v in row.items()}
            send_post(url, payload)
            total += 1
        logging.info("Queued %d rows for upload to %s", total, table)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Upload a CSV to the E-Hospital database via REST API.")
    parser.add_argument("table", help="Target table name, e.g. patient_feedback")
    parser.add_argument("csv", type=Path, help="Path to CSV file matching the table schema")
    args = parser.parse_args()

    try:
        upload_csv(args.table, args.csv)
        # Keep main thread alive to allow background threads to finish
        logging.info("Waiting for background uploads to finish…")
        for t in threading.enumerate():
            if t is not threading.current_thread():
                t.join()
        logging.info("Done.")
    except Exception as e:
        logging.error("Upload failed: %s", e) 