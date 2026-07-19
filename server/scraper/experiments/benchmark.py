from __future__ import annotations

import argparse
import json
import statistics
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
RUNNERS = {
    "beautifulsoup": "beautifulsoup_runner.py",
    "scrapy": "scrapy_runner.py",
    "selenium": "selenium_runner.py",
    "playwright": "playwright_runner.py",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare Python scraping tools")
    parser.add_argument("--source", choices=("jobstreet", "linkedin"), default="jobstreet")
    parser.add_argument("--keyword", default="react developer")
    parser.add_argument("--pages", type=int, default=1)
    parser.add_argument("--runs", type=int, default=1)
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--tools", default=",".join(RUNNERS))
    args = parser.parse_args()

    requested = [tool.strip() for tool in args.tools.split(",") if tool.strip()]
    unknown = [tool for tool in requested if tool not in RUNNERS]
    if unknown or not requested:
        parser.error(f"Unknown or empty tool selection: {', '.join(unknown) or 'none'}")
    if not 1 <= args.pages <= 5:
        parser.error("--pages must be between 1 and 5")
    selected = requested
    results: list[dict[str, Any]] = []
    for tool in selected:
        for run in range(max(1, args.runs)):
            command = [
                sys.executable,
                str(ROOT / RUNNERS[tool]),
                "--source", args.source,
                "--keyword", args.keyword,
                "--pages", str(args.pages),
                "--timeout", str(args.timeout),
            ]
            wall_started = time.perf_counter()
            try:
                completed = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
            except subprocess.TimeoutExpired:
                results.append({
                    "tool": tool,
                    "source": args.source,
                    "status": "error",
                    "durationMs": round((time.perf_counter() - wall_started) * 1000, 2),
                    "jobs": [],
                    "metrics": {"valid": 0, "unique": 0, "completeness": 0},
                    "error": "Runner timed out after 180 seconds",
                    "run": run + 1,
                })
                continue
            lines = [line for line in completed.stdout.splitlines() if line.strip().startswith("{")]
            if not lines:
                payload = {
                    "tool": tool,
                    "source": args.source,
                    "status": "error",
                    "durationMs": 0,
                    "jobs": [],
                    "metrics": {"valid": 0, "unique": 0, "completeness": 0},
                    "error": completed.stderr.strip() or "Runner produced no JSON",
                }
            elif completed.returncode != 0:
                payload = {
                    "tool": tool,
                    "source": args.source,
                    "status": "error",
                    "durationMs": round((time.perf_counter() - wall_started) * 1000, 2),
                    "jobs": [],
                    "metrics": {"valid": 0, "unique": 0, "completeness": 0},
                    "error": completed.stderr.strip() or f"Runner exited {completed.returncode}",
                }
            else:
                payload = json.loads(lines[-1])
                required = {"tool", "source", "status", "durationMs", "jobs", "metrics", "error"}
                if not required.issubset(payload) or payload["tool"] != tool or payload["source"] != args.source:
                    payload = {
                        "tool": tool,
                        "source": args.source,
                        "status": "error",
                        "durationMs": round((time.perf_counter() - wall_started) * 1000, 2),
                        "jobs": [],
                        "metrics": {"valid": 0, "unique": 0, "completeness": 0},
                        "error": "Runner returned invalid JSON contract",
                    }
            payload["wallDurationMs"] = round((time.perf_counter() - wall_started) * 1000, 2)
            payload["run"] = run + 1
            results.append(payload)

    summary = []
    for tool in selected:
        tool_results = [result for result in results if result["tool"] == tool]
        summary.append({
            "tool": tool,
            "successfulRuns": sum(result["status"] == "success" for result in tool_results),
            "medianDurationMs": statistics.median(result["durationMs"] for result in tool_results),
            "medianValid": statistics.median(result["metrics"]["valid"] for result in tool_results),
            "medianCompleteness": statistics.median(result["metrics"]["completeness"] for result in tool_results),
        })

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": args.source,
        "keyword": args.keyword,
        "pages": args.pages,
        "runs": args.runs,
        "summary": summary,
        "results": results,
    }
    reports = ROOT / "reports"
    reports.mkdir(exist_ok=True)
    output = reports / f"benchmark-{args.source}.json"
    output.write_text(json.dumps(report, indent=2, ensure_ascii=True), encoding="utf-8")
    print(json.dumps({"report": str(output), "summary": summary}, ensure_ascii=True))


if __name__ == "__main__":
    main()
