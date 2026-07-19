from __future__ import annotations

import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support.ui import WebDriverWait

from common import USER_AGENT, build_url, emit, ensure_robots_allowed, parse_args
from parsers import parse_html


def main() -> None:
    args = parse_args("selenium")
    started = time.perf_counter()
    jobs = []
    driver = None
    try:
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument(f"--user-agent={USER_AGENT}")
        options.add_argument("--lang=id-ID")
        options.add_argument("--disable-gpu")
        driver = webdriver.Chrome(options=options)
        driver.set_page_load_timeout(args.timeout)
        selector = 'article[data-automation="normalJob"]' if args.source == "jobstreet" else "div.job-search-card"
        for page in range(args.pages):
            url = build_url(args.source, args.keyword, page)
            ensure_robots_allowed(url, args.timeout)
            driver.get(url)
            try:
                WebDriverWait(driver, min(args.timeout, 10)).until(
                    expected_conditions.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
            except Exception:
                pass
            page_jobs = parse_html(args.source, driver.page_source)
            if not page_jobs:
                raise RuntimeError(
                    f"No jobs found; final URL={driver.current_url}; title={driver.title}"
                )
            jobs.extend(page_jobs)
        emit("selenium", args.source, started, jobs)
    except Exception as error:
        emit("selenium", args.source, started, jobs, str(error))
    finally:
        if driver is not None:
            driver.quit()


if __name__ == "__main__":
    main()
