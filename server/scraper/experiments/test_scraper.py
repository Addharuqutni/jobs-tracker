"""Tests for Python scraper engine — common utilities and HTML parsers.

Run: python -m pytest test_scraper.py -v
From: server/scraper/experiments/
"""
from __future__ import annotations

import json
import time
from unittest.mock import patch

import pytest

from common import Job, build_url, canonical_linkedin_url, clean, emit, valid_jobs
from parsers import parse_jobstreet, parse_linkedin


# ---------------------------------------------------------------------------
# common.clean
# ---------------------------------------------------------------------------
class TestClean:
    def test_strips_whitespace(self):
        assert clean("  hello  ") == "hello"

    def test_collapses_internal_whitespace(self):
        assert clean("a   b\n\tc") == "a b c"

    def test_returns_none_for_none(self):
        assert clean(None) is None

    def test_returns_none_for_empty(self):
        assert clean("   ") is None

    def test_returns_none_for_blank(self):
        assert clean("") is None


# ---------------------------------------------------------------------------
# common.build_url
# ---------------------------------------------------------------------------
class TestBuildUrl:
    def test_jobstreet_page_0(self):
        url = build_url("jobstreet", "react developer", 0)
        assert url == "https://id.jobstreet.com/id/react-developer-jobs?page=1"

    def test_jobstreet_page_2(self):
        url = build_url("jobstreet", "  React Developer  ", 2)
        assert "page=3" in url

    def test_linkedin_page_0(self):
        url = build_url("linkedin", "react developer", 0)
        assert "linkedin.com" in url
        assert "start=0" in url
        assert "geoId=102478259" in url

    def test_linkedin_page_1(self):
        url = build_url("linkedin", "python", 1)
        assert "start=10" in url

    def test_jobstreet_special_chars(self):
        url = build_url("jobstreet", "c++ developer", 0)
        # Should not crash; URL-encodes special chars
        assert "jobstreet.com" in url


# ---------------------------------------------------------------------------
# common.canonical_linkedin_url
# ---------------------------------------------------------------------------
class TestCanonicalLinkedinUrl:
    def test_with_job_id(self):
        result = canonical_linkedin_url("12345", "https://linkedin.com/jobs/view/some-slug")
        assert result == "https://www.linkedin.com/jobs/view/12345"

    def test_without_job_id_fallback_href(self):
        href = "https://linkedin.com/jobs/view/slug-12345"
        assert canonical_linkedin_url(None, href) == href

    def test_both_none(self):
        assert canonical_linkedin_url(None, None) is None


# ---------------------------------------------------------------------------
# common.valid_jobs
# ---------------------------------------------------------------------------
class TestValidJobs:
    def _job(self, **kwargs) -> Job:
        defaults = dict(
            title="Dev", company="Co", location="Jakarta",
            url="https://example.com/1", salary=None,
            source="jobstreet", jobId="j1", postedAt=None,
        )
        defaults.update(kwargs)
        return Job(**defaults)

    def test_filters_no_title(self):
        jobs = [self._job(title=None)]
        assert valid_jobs(jobs) == []

    def test_filters_no_url(self):
        jobs = [self._job(url=None)]
        assert valid_jobs(jobs) == []

    def test_deduplicates_by_job_id(self):
        j1 = self._job(jobId="100")
        j2 = self._job(jobId="100", title="Different")
        result = valid_jobs([j1, j2])
        assert len(result) == 1
        assert result[0].title == "Dev"

    def test_deduplicates_by_url_when_no_job_id(self):
        j1 = self._job(jobId=None, url="https://a.com/1")
        j2 = self._job(jobId=None, url="https://a.com/1", title="Other")
        assert len(valid_jobs([j1, j2])) == 1

    def test_keeps_unique_jobs(self):
        j1 = self._job(jobId="1", url="https://a.com/1")
        j2 = self._job(jobId="2", url="https://a.com/2")
        assert len(valid_jobs([j1, j2])) == 2

    def test_empty_list(self):
        assert valid_jobs([]) == []

    def test_whitespace_title_filtered(self):
        jobs = [self._job(title="   ")]
        assert valid_jobs(jobs) == []


# ---------------------------------------------------------------------------
# common.emit
# ---------------------------------------------------------------------------
class TestEmit:
    def test_success_output(self, capsys):
        jobs = [Job("Dev", "Co", "JKT", "https://x.com/1", None, "jobstreet", "1", "2026-07-10")]
        emit("beautifulsoup", "jobstreet", time.perf_counter() - 1, jobs)
        output = capsys.readouterr().out.strip()
        payload = json.loads(output)
        assert payload["tool"] == "beautifulsoup"
        assert payload["source"] == "jobstreet"
        assert payload["status"] == "success"
        assert len(payload["jobs"]) == 1
        assert payload["metrics"]["valid"] == 1
        assert payload["error"] is None

    def test_error_output(self, capsys):
        emit("playwright", "linkedin", time.perf_counter(), [], "timeout")
        payload = json.loads(capsys.readouterr().out.strip())
        assert payload["status"] == "error"
        assert payload["error"] == "timeout"
        assert payload["jobs"] == []

    def test_empty_jobs_is_error(self, capsys):
        emit("beautifulsoup", "jobstreet", time.perf_counter(), [])
        payload = json.loads(capsys.readouterr().out.strip())
        assert payload["status"] == "error"
        assert "No valid" in payload["error"]

    def test_duration_positive(self, capsys):
        emit("beautifulsoup", "jobstreet", time.perf_counter() - 0.5,
             [Job("X", "Y", "Z", "https://x.com/1", None, "jobstreet", "1", None)])
        payload = json.loads(capsys.readouterr().out.strip())
        assert payload["durationMs"] > 0

    def test_completeness_metric(self, capsys):
        # All 6 fields filled
        job = Job("Dev", "Co", "JKT", "https://x.com/1", None, "jobstreet", "j1", "2026-07-10")
        emit("beautifulsoup", "jobstreet", time.perf_counter(), [job])
        payload = json.loads(capsys.readouterr().out.strip())
        # 5 of 6 fields are non-None (salary=None)
        assert 0 < payload["metrics"]["completeness"] <= 1.0


# ---------------------------------------------------------------------------
# parsers.parse_jobstreet
# ---------------------------------------------------------------------------
JOBSTREET_HTML = """
<html><body>
<article data-automation="normalJob" data-job-id="12345">
  <a data-automation="jobTitle" href="/id/job/12345">Senior React Developer</a>
  <a data-automation="jobCompany" href="/company/acme">Acme Corp</a>
  <a data-automation="jobLocation" href="/loc/jakarta">Jakarta Selatan</a>
  <div data-automation="jobSalary"><span>Rp 15.000.000 - 25.000.000</span></div>
  <time datetime="2026-07-10T08:00:00.000Z">10 Jul</time>
</article>
<article data-automation="normalJob" data-job-id="67890">
  <a data-automation="jobTitle" href="/id/job/67890">  Backend  Engineer  </a>
  <a data-automation="jobCompany" href="/company/xyz">XYZ Ltd</a>
  <a data-automation="jobLocation" href="/loc/bandung">Bandung</a>
  <time datetime="2026-07-11T09:00:00.000Z">11 Jul</time>
</article>
</body></html>
"""


class TestParseJobstreet:
    def test_parses_multiple_jobs(self):
        jobs = parse_jobstreet(JOBSTREET_HTML)
        assert len(jobs) == 2

    def test_extracts_fields(self):
        jobs = parse_jobstreet(JOBSTREET_HTML)
        j = jobs[0]
        assert j.title == "Senior React Developer"
        assert j.company == "Acme Corp"
        assert j.location == "Jakarta Selatan"
        assert j.salary == "Rp 15.000.000 - 25.000.000"
        assert j.source == "jobstreet"
        assert j.jobId == "12345"
        assert j.postedAt == "2026-07-10T08:00:00.000Z"

    def test_prepends_base_url(self):
        jobs = parse_jobstreet(JOBSTREET_HTML)
        assert jobs[0].url == "https://id.jobstreet.com/id/job/12345"

    def test_cleans_whitespace_in_title(self):
        jobs = parse_jobstreet(JOBSTREET_HTML)
        assert jobs[1].title == "Backend Engineer"

    def test_salary_none_when_missing(self):
        jobs = parse_jobstreet(JOBSTREET_HTML)
        assert jobs[1].salary is None

    def test_empty_html(self):
        assert parse_jobstreet("<html></html>") == []


# ---------------------------------------------------------------------------
# parsers.parse_linkedin
# ---------------------------------------------------------------------------
LINKEDIN_HTML = """
<html><body>
<li>
  <div class="job-search-card" data-entity-urn="urn:li:jobPosting:999111">
    <h3 class="base-search-card__title">  Python  Developer  </h3>
    <h4 class="base-search-card__subtitle">TechCo</h4>
    <span class="job-search-card__location">Remote</span>
    <a class="base-card__full-link" href="https://linkedin.com/jobs/view/python-dev-999111">View</a>
    <time datetime="2026-07-09T12:00:00.000Z">9 Jul</time>
  </div>
</li>
<li>
  <div class="job-search-card" data-entity-urn="urn:li:jobPosting:999222">
    <h3 class="base-search-card__title">Java Dev</h3>
    <h4 class="base-search-card__subtitle">BigCo</h4>
    <span class="job-search-card__location">Jakarta</span>
    <a class="base-card__full-link" href="https://linkedin.com/jobs/view/java-dev-999222">View</a>
    <time datetime="2026-07-08T12:00:00.000Z">8 Jul</time>
  </div>
</li>
</body></html>
"""


class TestParseLinkedin:
    def test_parses_multiple_jobs(self):
        jobs = parse_linkedin(LINKEDIN_HTML)
        assert len(jobs) == 2

    def test_extracts_fields(self):
        jobs = parse_linkedin(LINKEDIN_HTML)
        j = jobs[0]
        assert j.title == "Python Developer"
        assert j.company == "TechCo"
        assert j.location == "Remote"
        assert j.source == "linkedin"
        assert j.jobId == "999111"
        assert j.postedAt == "2026-07-09T12:00:00.000Z"

    def test_canonical_url_uses_job_id(self):
        jobs = parse_linkedin(LINKEDIN_HTML)
        assert jobs[0].url == "https://www.linkedin.com/jobs/view/999111"

    def test_salary_always_none(self):
        jobs = parse_linkedin(LINKEDIN_HTML)
        assert all(j.salary is None for j in jobs)

    def test_cleans_whitespace(self):
        jobs = parse_linkedin(LINKEDIN_HTML)
        assert jobs[0].title == "Python Developer"

    def test_empty_html(self):
        assert parse_linkedin("<html></html>") == []

    def test_missing_urn(self):
        html = """
        <li><div class="job-search-card">
            <h3 class="base-search-card__title">Dev</h3>
            <h4 class="base-search-card__subtitle">Co</h4>
            <span class="job-search-card__location">JKT</span>
            <a class="base-card__full-link" href="https://linkedin.com/jobs/view/slug">V</a>
        </div></li>
        """
        jobs = parse_linkedin(html)
        assert len(jobs) == 1
        assert jobs[0].jobId is None
        # Falls back to href
        assert jobs[0].url == "https://linkedin.com/jobs/view/slug"


# ---------------------------------------------------------------------------
# Integration: parse -> validate pipeline
# ---------------------------------------------------------------------------
class TestParseAndValidate:
    def test_jobstreet_pipeline(self):
        raw = parse_jobstreet(JOBSTREET_HTML)
        valid = valid_jobs(raw)
        assert len(valid) == 2
        assert all(j.url for j in valid)

    def test_linkedin_pipeline(self):
        raw = parse_linkedin(LINKEDIN_HTML)
        valid = valid_jobs(raw)
        assert len(valid) == 2

    def test_duplicate_removal_across_sources(self):
        """Same job ID in same source gets deduped."""
        html_dup = JOBSTREET_HTML + JOBSTREET_HTML
        raw = parse_jobstreet(html_dup)
        valid = valid_jobs(raw)
        assert len(valid) == 2  # deduped from 4 to 2
