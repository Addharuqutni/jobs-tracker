from __future__ import annotations

import time

from playwright.sync_api import sync_playwright

from common import USER_AGENT, build_url, emit, ensure_robots_allowed, parse_args
from parsers import parse_html


def main() -> None:
    args = parse_args("playwright")
    started = time.perf_counter()
    jobs = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(channel="chrome", headless=True)
            context = browser.new_context(user_agent=USER_AGENT, locale="id-ID")
            page_handle = context.new_page()
            for page in range(args.pages):
                url = build_url(args.source, args.keyword, page)
                ensure_robots_allowed(url, args.timeout)
                page_handle.goto(
                    url,
                    wait_until="domcontentloaded",
                    timeout=args.timeout * 1000,
                )
                selector = 'article[data-automation="normalJob"]' if args.source == "jobstreet" else "div.job-search-card"
                try:
                    page_handle.wait_for_selector(selector, state="attached", timeout=min(args.timeout, 10) * 1000)
                except Exception:
                    pass
                page_jobs = parse_html(args.source, page_handle.content())
                if not page_jobs:
                    raise RuntimeError(
                        f"No jobs found; final URL={page_handle.url}; title={page_handle.title()}"
                    )
                jobs.extend(page_jobs)
            context.close()
            browser.close()
        emit("playwright", args.source, started, jobs)
    except Exception as error:
        emit("playwright", args.source, started, jobs, str(error))


if __name__ == "__main__":
    main()
