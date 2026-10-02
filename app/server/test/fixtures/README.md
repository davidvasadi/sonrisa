# Test fixtures

Real responses copied from `process/03-research/raw-responses/` (fetched 2026-10-02 by `process/scripts/fetch-samples.sh`).
Copied byte for byte, except `un-news/topic-health.rss`, which was stored gzip-compressed and is decompressed here (`gunzip -c`).

| Fixture | Source file | sha256 of fixture |
| --- | --- | --- |
| `bbc/business.rss` | `bbc/business.rss` | `9c47c9d7b3f88d23…` |
| `bbc/top-stories.rss` | `bbc/business.rss` | `bbc/business.rss` | `9c47c9d7b3f88d23…` |
| `bbc/top-stories.rss` | `719119e92f47419c…` |
| `bbc/world.rss` | `bbc/world.rss` | `788cecdf6ec13679…` |
| `gdacs/eventlist-default.json` | `gdacs/eventlist-default.json` | `a3e19f2016c56011…` |
| `un-news/topic-climate-change.rss` | `un-news/topic-climate-change.rss` | `b9bf9b018a5bab6c…` |
| `un-news/topic-health.rss` | `un-news/topic-health.rss` | `0c203f42c92f807a…` |
| `un-news/topic-humanitarian-aid.rss` | `un-news/topic-humanitarian-aid.rss` | `58bca1245662e48e…` |
| `usgs/significant_day.geojson` | `usgs/significant_day.geojson` | `13fbffbb95323152…` |
| `usgs/significant_month.geojson` | `usgs/significant_month.geojson` | `a7361e305006f462…` |
