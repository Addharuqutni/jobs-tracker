from __future__ import annotations

import time

import scrapy
from scrapy.crawler import CrawlerProcess

from common import USER_AGENT, build_url, emit, ensure_robots_allowed, parse_args
from parsers import parse_html


def main() -> None:
    args = parse_args("scrapy")
    started = time.perf_counter()
    jobs = []
    errors: list[str] = []

    try:
        ensure_robots_allowed(build_url(args.source, args.keyword, 0), args.timeout)
    except Exception as error:
        emit("scrapy", args.source, started, jobs, str(error))
        return

    class BenchmarkSpider(scrapy.Spider):
        name = "benchmark"
        custom_settings = {
            "LOG_ENABLED": False,
            "ROBOTSTXT_OBEY": True,
            "DOWNLOAD_DELAY": 1,
            "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
            "USER_AGENT": USER_AGENT,
            "HTTPERROR_ALLOW_ALL": True,
        }

        def start_requests(self):
            for page in range(args.pages):
                yield scrapy.Request(
                    build_url(args.source, args.keyword, page),
                    callback=self.parse_page,
                    errback=self.on_error,
                    cb_kwargs={"page": page},
                )

        def parse_page(self, response, page: int):
            if not 200 <= response.status < 300:
                errors.append(f"HTTP {response.status}")
                return
            page_jobs = parse_html(args.source, response.text)
            if not page_jobs:
                errors.append(f"HTTP {response.status}: no valid jobs parsed")
                return
            jobs.extend(page_jobs)

        def on_error(self, failure):
            errors.append(str(failure.value))

    process = CrawlerProcess(settings={"TWISTED_REACTOR": "twisted.internet.asyncioreactor.AsyncioSelectorReactor"})
    try:
        process.crawl(BenchmarkSpider)
        process.start()
        emit("scrapy", args.source, started, jobs, "; ".join(errors) or None)
    except Exception as error:
        emit("scrapy", args.source, started, jobs, str(error))


if __name__ == "__main__":
    main()
