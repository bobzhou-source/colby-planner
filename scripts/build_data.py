#!/usr/bin/env python3
"""
Build script: merges colby course CSV + requirements JSON into a single data.json
for the frontend to consume.

Usage:
    python scripts/build_data.py

Outputs:
    frontend/public/data.json
"""

import csv
import json
import re
from pathlib import Path

PREREQ_RE = re.compile(r'[A-Z]{2,4}\s+\d+[A-Z]?')

ROOT = Path(__file__).parent.parent
CSV_PATH = ROOT.parent / "Downloads" / "colby_full_courses_Academic_Units_2026-05-06T04-39-00-236Z.csv"
REQ_PATH = ROOT.parent / "colby_requirements_grok.json"
OUT_PATH = ROOT / "frontend" / "public" / "data.json"


def parse_credits(credits_str: str) -> float:
    """Extract numeric credits from strings like '4 Credits' or '3 - 4 Credits'."""
    if not credits_str:
        return 0.0
    # Find all numbers
    nums = re.findall(r"(\d+(?:\.\d+)?)", credits_str)
    if not nums:
        return 0.0
    # If range, take max
    return max(float(n) for n in nums)


def parse_terms(terms_str: str) -> list[str]:
    """Convert 'Fall Semester; Jan Plan; Spring Semester' to ['fall', 'jan_plan', 'spring']."""
    if not terms_str:
        return []
    mapping = {
        "fall semester": "fall",
        "jan plan": "jan_plan",
        "spring semester": "spring",
        "summer semester": "summer",
    }
    result = []
    for part in terms_str.lower().split(";"):
        part = part.strip()
        if part in mapping:
            result.append(mapping[part])
    return result


def parse_distributions(raw_overview: str) -> list[str]:
    """Extract distribution tags like 'Natural Sciences', 'Arts' from Course Tags."""
    if not raw_overview:
        return []
    try:
        data = json.loads(raw_overview)
        for item in data:
            if item.get('label') == 'Course Tags' and item.get('value'):
                tags = []
                for tag in item['value'].split(';'):
                    tag = tag.strip()
                    if tag.startswith('Distribution ::'):
                        dist = tag.replace('Distribution ::', '').strip()
                        # Normalize diversity tags
                        if dist.startswith('Diversity'):
                            tags.append('Diversity')
                        else:
                            tags.append(dist)
                    elif tag == 'First-Year Course':
                        tags.append('W1')
                return tags
    except (json.JSONDecodeError, TypeError):
        pass
    return []


def parse_prerequisites(raw_overview: str) -> list[str]:
    """Extract prerequisite course IDs from rawOverviewFields JSON."""
    if not raw_overview:
        return []
    try:
        data = json.loads(raw_overview)
        for item in data:
            if item.get('label') == 'Eligibility' and item.get('value'):
                val = item['value']
                # Only parse if it mentions completed courses
                if 'completed' in val.lower():
                    matches = PREREQ_RE.findall(val)
                    # Normalize to canonical ID format
                    return [m.strip() for m in matches]
    except (json.JSONDecodeError, TypeError):
        pass
    return []


def parse_status(status_str: str) -> str:
    """Normalize course status."""
    if not status_str:
        return "active"
    s = status_str.lower()
    if "catalog_only" in s or "never_observed" in s:
        return "catalog_only"
    if "historical" in s and "published" not in s:
        return "historical"
    if "new_or_future" in s:
        return "new"
    return "active"


def build_catalog() -> dict:
    """Read CSV and build catalog.courses object."""
    courses = {}
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            subject = row.get("subject", "").strip()
            number = row.get("courseNumber", "").strip()
            if not subject or not number:
                continue

            course_id = f"{subject} {number}"
            title = row.get("title", "").strip()
            credits = parse_credits(row.get("credits", ""))
            terms = parse_terms(row.get("typicalPeriodsOffered", ""))
            status = parse_status(row.get("courseStatus", ""))
            dept = row.get("courseOwner", "").strip()
            formats = row.get("instructionalFormats", "").strip()

            prereqs = parse_prerequisites(row.get("rawOverviewFields", ""))
            dists = parse_distributions(row.get("rawOverviewFields", ""))
            courses[course_id] = {
                "id": course_id,
                "subject": subject,
                "number": number,
                "title": title,
                "credits": credits,
                "prerequisites": prereqs,
                "attributes": dists,
                "distributions": dists,
                "offered_terms": terms,
                "status": status,
                "department": dept,
                "instructional_format": formats,
            }

    return {"courses": courses}


def main():
    print(f"Reading requirements from {REQ_PATH}")
    with open(REQ_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Reading CSV from {CSV_PATH}")
    catalog = build_catalog()
    print(f"  Built catalog with {len(catalog['courses'])} courses")

    # Add synthetic graduation requirements program
    graduation_program = {
        "id": "colby_graduation",
        "name": "Colby Graduation Requirements",
        "degree_type": "major",
        "total": {"count": 128, "unit": "credit_hours"},
        "rules": [
            {"id": "w1", "name": "First-Year Writing", "type": "minimum_attribute", "minimum_count": 1, "attribute": "W1", "note": "One first-year writing course"},
            {"id": "language", "name": "Foreign Language", "type": "minimum_attribute", "minimum_count": 3, "attribute": "Language", "note": "Up to three language courses (proficiency may reduce this)"},
            {"id": "arts", "name": "Arts", "type": "minimum_attribute", "minimum_count": 1, "attribute": "Arts", "note": "One arts course"},
            {"id": "historical", "name": "Historical Studies", "type": "minimum_attribute", "minimum_count": 1, "attribute": "Historical Studies", "note": "One historical studies course"},
            {"id": "literature", "name": "Literature", "type": "minimum_attribute", "minimum_count": 1, "attribute": "Literature", "note": "One literature course"},
            {"id": "quantitative", "name": "Quantitative Reasoning", "type": "minimum_attribute", "minimum_count": 1, "attribute": "Quantitative Reasoning", "note": "One quantitative reasoning course"},
            {"id": "natural_sciences", "name": "Natural Sciences", "type": "minimum_attribute", "minimum_count": 2, "attribute": "Natural Sciences", "note": "Two natural science courses (one with lab)"},
            {"id": "social_sciences", "name": "Social Sciences", "type": "minimum_attribute", "minimum_count": 1, "attribute": "Social Sciences", "note": "One social science course"},
            {"id": "diversity", "name": "Diversity", "type": "minimum_attribute", "minimum_count": 2, "attribute": "Diversity", "note": "Two diversity courses (US and/or International)"},
            {"id": "jan_plan", "name": "January Program", "type": "minimum_attribute", "minimum_count": 3, "attribute": "Jan Plan", "note": "Three Jan Plan courses (two if graduating in 6 semesters or fewer)"},
        ],
        "concentrations": None,
    }

    # Merge catalog into data
    data["catalog"] = catalog
    data["programs"].insert(0, graduation_program)

    # Ensure OUT_PATH directory exists
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    size_mb = OUT_PATH.stat().st_size / 1024 / 1024
    print(f"Wrote {OUT_PATH} ({size_mb:.2f} MB)")
    print(f"  Programs: {len(data.get('programs', []))}")
    print(f"  Courses: {len(data['catalog']['courses'])}")


if __name__ == "__main__":
    main()
