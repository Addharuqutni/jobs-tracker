from __future__ import annotations

import re

from bs4 import BeautifulSoup

from common import Job, canonical_linkedin_url, clean


def parse_html(source: str, html: str) -> list[Job]:
    return parse_jobstreet(html) if source == "jobstreet" else parse_linkedin(html)


def parse_jobstreet(html: str) -> list[Job]:
    soup = BeautifulSoup(html, "lxml")
    jobs: list[Job] = []
    for card in soup.select('article[data-automation="normalJob"]'):
        title = card.select_one('a[data-automation="jobTitle"]')
        company = card.select_one('a[data-automation="jobCompany"]')
        location = card.select_one('a[data-automation="jobLocation"]')
        salary = card.select_one('[data-automation="jobSalary"] span')
        job_id = card.get("data-job-id")
        href = title.get("href") if title else None
        url = f"https://id.jobstreet.com{href}" if href and href.startswith("/") else href
        time_tag = card.select_one("time")
        posted_at = time_tag.get("datetime") if time_tag else None
        jobs.append(Job(
            title=clean(title.get_text(" ") if title else None),
            company=clean(company.get_text(" ") if company else None),
            location=clean(location.get_text(" ") if location else None),
            url=url,
            salary=clean(salary.get_text(" ") if salary else None),
            source="jobstreet",
            jobId=str(job_id) if job_id else None,
            postedAt=posted_at,
        ))
    return jobs


def parse_linkedin(html: str) -> list[Job]:
    soup = BeautifulSoup(html, "lxml")
    jobs: list[Job] = []
    for card in soup.select("li:has(div.job-search-card)"):
        root = card.select_one("div.job-search-card")
        title = card.select_one("h3.base-search-card__title")
        company = card.select_one("h4.base-search-card__subtitle")
        location = card.select_one("span.job-search-card__location")
        href_node = card.select_one("a.base-card__full-link")
        time_tag = card.select_one("time")
        posted_at = time_tag.get("datetime") if time_tag else None
        urn = root.get("data-entity-urn", "") if root else ""
        match = re.search(r"urn:li:jobPosting:(\d+)", str(urn))
        job_id = match.group(1) if match else None
        href = href_node.get("href") if href_node else None
        jobs.append(Job(
            title=clean(title.get_text(" ") if title else None),
            company=clean(company.get_text(" ") if company else None),
            location=clean(location.get_text(" ") if location else None),
            url=canonical_linkedin_url(job_id, str(href) if href else None),
            salary=None,
            source="linkedin",
            jobId=job_id,
            postedAt=posted_at,
        ))
    return jobs
