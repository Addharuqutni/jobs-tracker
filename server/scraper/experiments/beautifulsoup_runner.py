from __future__ import annotations

import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from common import USER_AGENT, Job, build_url, emit, ensure_robots_allowed, parse_args
from parsers import parse_html


def main() -> None:
    args = parse_args("beautifulsoup")
    started = time.perf_counter()
    jobs: list[Job] = []
    try:
        for page in range(args.pages):
            url = build_url(args.source, args.keyword, page)
            ensure_robots_allowed(url, args.timeout)
            request = Request(
                url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
                },
            )
            with urlopen(request, timeout=args.timeout) as response:
                html = response.read().decode("utf-8", errors="replace")
            page_jobs = parse_html(args.source, html)
            if not page_jobs:
                break
            jobs.extend(page_jobs)
        emit("beautifulsoup", args.source, started, jobs)
    except PermissionError as error:
        emit("beautifulsoup", args.source, started, jobs, str(error))
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        emit("beautifulsoup", args.source, started, jobs, str(error))
    except Exception as error:
        emit("beautifulsoup", args.source, started, jobs, str(error))


if __name__ == "__main__":
    main()
