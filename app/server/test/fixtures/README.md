# Test fixtures

Real responses copied from `process/03-research/raw-responses/` (fetched 2026-10-02 by `process/scripts/fetch-samples.sh`).
Copied byte for byte, except the UN News feeds that were stored gzip-compressed (`topic-health`, `topic-economic-development`, `topic-culture-and-education`, `region-americas`, `region-europe`), which are decompressed here (`gunzip -c`).

| Fixture | Source file | sha256 of fixture |
| --- | --- | --- |
| `bbc/business.rss` | `bbc/business.rss` | `9c47c9d7b3f88d23…` |
| `bbc/health.rss` | `bbc/health.rss` | `86b1e701ec0ae051…` |
| `bbc/politics.rss` | `bbc/politics.rss` | `c28f1efb042e62ba…` |
| `bbc/science_and_environment.rss` | `bbc/science_and_environment.rss` | `a64e1756e320d94b…` |
| `bbc/technology.rss` | `bbc/technology.rss` | `e05e24a6f96031f6…` |
| `bbc/top-stories.rss` | `bbc/business.rss` | `bbc/business.rss` | `9c47c9d7b3f88d23…` |
| `bbc/top-stories.rss` | `719119e92f47419c…` |
| `bbc/world.rss` | `bbc/world.rss` | `788cecdf6ec13679…` |
| `gdacs/eventlist-default.json` | `gdacs/eventlist-default.json` | `a3e19f2016c56011…` |
| `un-news/topic-climate-change.rss` | `un-news/topic-climate-change.rss` | `b9bf9b018a5bab6c…` |
| `un-news/topic-health.rss` | `un-news/topic-health.rss` | `0c203f42c92f807a…` |
| `un-news/topic-humanitarian-aid.rss` | `un-news/topic-humanitarian-aid.rss` | `58bca1245662e48e…` |
| `un-news/region-africa.rss` | `un-news/region-africa.rss` | `45380ace3f7befe2…` |
| `un-news/region-americas.rss` | `un-news/region-americas.rss` | `452662109d658452…` |
| `un-news/region-asia-pacific.rss` | `un-news/region-asia-pacific.rss` | `45c77b59733b2bbe…` |
| `un-news/region-europe.rss` | `un-news/region-europe.rss` | `66ee6ac9ce3c8a08…` |
| `un-news/region-middle-east.rss` | `un-news/region-middle-east.rss` | `d8eff23ab7b6cd2e…` |
| `un-news/topic-culture-and-education.rss` | `un-news/topic-culture-and-education.rss` | `c8214fc1dacf4c98…` |
| `un-news/topic-economic-development.rss` | `un-news/topic-economic-development.rss` | `37dcd0721ec16760…` |
| `un-news/topic-human-rights.rss` | `un-news/topic-human-rights.rss` | `d0e6a7474a9eec5e…` |
| `un-news/topic-law-and-crime-prevention.rss` | `un-news/topic-law-and-crime-prevention.rss` | `0abfbb11a45b2a47…` |
| `un-news/topic-migrants-and-refugees.rss` | `un-news/topic-migrants-and-refugees.rss` | `c5cec360b9213a67…` |
| `un-news/topic-peace-and-security.rss` | `un-news/topic-peace-and-security.rss` | `ea3ffe6b9384a6a6…` |
| `un-news/topic-sdgs.rss` | `un-news/topic-sdgs.rss` | `2ba47dea4e8c138f…` |
| `un-news/topic-un-affairs.rss` | `un-news/topic-un-affairs.rss` | `46af79b517edb21c…` |
| `un-news/topic-women.rss` | `un-news/topic-women.rss` | `60b94e330515635f…` |
| `usgs/significant_day.geojson` | `usgs/significant_day.geojson` | `13fbffbb95323152…` |
| `usgs/significant_month.geojson` | `usgs/significant_month.geojson` | `a7361e305006f462…` |
