# Python Scraper Sidecar Experiment

Isolated benchmark only. Production scraper remains TypeScript.

The harness checks `robots.txt` before every live request. A disallowed target is
reported as an error and is not scraped.

## Setup

```powershell
python -m venv server/scraper/experiments/.venv
server/scraper/experiments/.venv/Scripts/python.exe -m pip install -r server/scraper/experiments/requirements.txt
```

Playwright and Selenium use installed Google Chrome. No browser download required.

## Contract

Every runner accepts:

```text
--source jobstreet|linkedin
--keyword "react developer"
--pages 1..5
--timeout 30
```

Every runner writes one JSON object to stdout. No database writes occur.

## Run

```powershell
npm run scrape:experiment:jobstreet
npm run scrape:experiment:linkedin

# Three-run median comparison
npm run scrape:experiment -- --source jobstreet --keyword "react developer" --pages 1 --runs 3
```

Reports are written to `server/scraper/experiments/reports/`.

## Initial Findings

Before uniform robots enforcement, a capability-only LinkedIn guest-endpoint run
returned 10 valid jobs per tool:

| Tool | Median duration (3 runs) | Valid jobs | Completeness |
|---|---:|---:|---:|
| Beautiful Soup | 730 ms | 10 | 100% |
| Selenium | 2,305 ms | 10 | 100% |
| Playwright | 3,213 ms | 10 | 100% |
| Scrapy | 511 ms | 0 | 0% |

That capability result must not be interpreted as permission to crawl. Current
compliant runs stop because LinkedIn disallows the guest endpoint in robots.txt.
JobStreet also blocks or disallows these generic Python transports in the current
environment. Production integration remains disabled.

## Tools

- Beautiful Soup: plain HTTP plus HTML parser.
- Scrapy: crawler transport plus shared HTML parser.
- Selenium: Chrome WebDriver plus shared HTML parser.
- Playwright: Chrome browser automation plus shared HTML parser.

Shared parsing keeps the benchmark focused on transport, rendering, blocking, and speed rather than selector differences.
