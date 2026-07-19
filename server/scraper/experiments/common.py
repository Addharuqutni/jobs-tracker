from __future__ import annotations

import argparse
import json
import re
import time
from dataclasses import asdict, dataclass
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)

SourceName = str  # "jobstreet" | "linkedin"


@dataclass(frozen=True)
class Job:
    title: str | None
    company: str | None
    location: str | None
    url: str | None
    salary: str | None
    source: str
    jobId: str | None
    postedAt: str | None = None


def parse_args(tool: str) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=f"{tool} scraper experiment")
    parser.add_argument("--source", choices=("jobstreet", "linkedin"), default="jobstreet")
    parser.add_argument("--keyword", default="react developer")
    parser.add_argument("--pages", type=int, default=1)
    parser.add_argument("--timeout", type=int, default=30)
    args = parser.parse_args()
    if not 1 <= args.pages <= 5:
        parser.error("--pages must be between 1 and 5")
    return args


def ensure_robots_allowed(url: str, timeout: int) -> None:
    """Raise PermissionError when robots.txt explicitly disallows the URL.

    Unreachable robots.txt (network/HTTP errors) is treated as allow-all (RFC 9309).
    """
    parts = urlsplit(url)
    robots_url = f"{parts.scheme}://{parts.netloc}/robots.txt"
    parser = RobotFileParser()
    parser.set_url(robots_url)
    try:
        request = Request(robots_url, headers={"User-Agent": USER_AGENT})
        with urlopen(request, timeout=timeout) as response:
            parser.parse(response.read().decode("utf-8", errors="replace").splitlines())
    except (HTTPError, URLError, TimeoutError, OSError):
        return
    if not parser.can_fetch(USER_AGENT, url):
        raise PermissionError(f"robots.txt disallows {url}")


def build_url(source: SourceName, keyword: str, page: int) -> str:
    if source == "jobstreet":
        slug = quote(keyword.strip().lower().replace(" ", "-"), safe="-")
        return f"https://id.jobstreet.com/id/{slug}-jobs?page={page + 1}"
    params = urlencode({"keywords": keyword.strip(), "geoId": "102478259", "start": page * 10})
    return f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?{params}"


def clean(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = re.sub(r"\s+", " ", value).strip()
    return normalized or None


def canonical_linkedin_url(job_id: str | None, href: str | None) -> str | None:
    if job_id:
        return f"https://www.linkedin.com/jobs/view/{job_id}"
    return href


def valid_jobs(jobs: Iterable[Job]) -> list[Job]:
    result: list[Job] = []
    seen: set[str] = set()
    for job in jobs:
        key = f"{job.source}:{job.jobId}" if job.jobId else (job.url or "")
        if not key or key in seen or not clean(job.title) or not job.url:
            continue
        seen.add(key)
        result.append(job)
    return result


def emit(
    tool: str,
    source: str,
    started: float,
    jobs: Iterable[Job],
    error: str | None = None,
) -> None:
    valid = valid_jobs(jobs)
    fields = ("title", "company", "location", "url", "jobId", "postedAt")
    complete = sum(
        1 for job in valid for field in fields if getattr(job, field) not in (None, "")
    )
    denominator = len(valid) * len(fields)
    payload: dict[str, Any] = {
        "tool": tool,
        "source": source,
        "status": "error" if error or not valid else "success",
        "durationMs": round((time.perf_counter() - started) * 1000, 2),
        "jobs": [asdict(job) for job in valid],
        "metrics": {
            "valid": len(valid),
            "unique": len(valid),
            "completeness": round(complete / denominator, 4) if denominator else 0,
        },
        "error": error or ("No valid jobs parsed" if not valid else None),
    }
    print(json.dumps(payload, ensure_ascii=True, separators=(",", ":")))
