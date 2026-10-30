#!/usr/bin/env python3
"""Build a small, attributed RSS headline cache for static GitHub Pages."""

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import urllib.request
import xml.etree.ElementTree as ET


FEEDS = (
    ("Global Voices", "World", "https://globalvoices.org/feed/"),
    ("EFF", "Technology", "https://www.eff.org/rss/updates.xml"),
    ("NASA", "Science", "https://www.nasa.gov/news-release/feed/"),
    ("The Guardian", "World", "https://www.theguardian.com/world/rss"),
    ("BBC News", "World", "https://feeds.bbci.co.uk/news/rss.xml"),
    ("NPR", "US & World", "https://feeds.npr.org/1001/rss.xml"),
)
MAX_PER_SOURCE = 18
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "news.json"


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_data(self, value):
        self.parts.append(value)


def clean_text(raw, limit=1000):
    parser = PlainText()
    parser.feed(unescape(raw or ""))
    value = re.sub(r"\s+", " ", " ".join(parser.parts)).strip()
    return value[:limit].rstrip()


def published_at(value):
    if not value:
        return ""
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
    except (ValueError, TypeError, OverflowError):
        return ""


def collect_feed(name, category, url):
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "JordanHardeeNewsReader/1.0 (+https://jordanhardee.com)",
            "Accept": "application/rss+xml, application/xml, text/xml",
        },
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        xml_data = response.read(3_000_000)
    root = ET.fromstring(xml_data)
    items = root.findall(".//item")
    result = []
    for item in items[:MAX_PER_SOURCE]:
        title = clean_text(item.findtext("title"), 260)
        link = (item.findtext("link") or "").strip()
        if not title or not link.startswith("https://"):
            continue
        result.append({
            "source": name,
            "category": category,
            "title": title,
            "url": link,
            "summary": clean_text(item.findtext("description"), 340),
            "published": published_at(item.findtext("pubDate")),
        })
    return result


def main():
    stories = []
    failures = []
    for name, category, url in FEEDS:
        try:
            articles = collect_feed(name, category, url)
            if not articles:
                raise ValueError("feed returned no usable articles")
            stories.extend(articles)
            print(f"{name}: {len(articles)} articles")
        except (OSError, ET.ParseError, ValueError) as error:
            failures.append(name)
            print(f"{name}: unavailable ({type(error).__name__})")

    if not stories:
        raise SystemExit("All news feeds failed; keeping the previous Pages deployment")

    stories.sort(key=lambda item: item["published"], reverse=True)
    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "stories": stories,
        "unavailableSources": failures,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(stories)} articles to {OUTPUT}")


if __name__ == "__main__":
    main()
