# Data Sources

## Research checklist

Each candidate source must be checked with a real call against these points. Raw responses go in [raw-responses/](raw-responses/). Nothing is taken from memory or from AI output without a stored response that backs it up.

| # | Check | Why | Decision |
| --- | --- | --- | --- |
| 1 | Free, with no key or registration? | Zero-config run. For market data, a key or registration means markets are dropped | [D-008](../05-decisions/decision-log.md#d-008-free-sources-keyless-where-possible-verified-by-a-real-call), [D-009](../05-decisions/decision-log.md#d-009-zero-config-local-run), [D-016](../05-decisions/decision-log.md#d-016-drop-markets-if-they-need-a-key-or-registration) |
| 2 | **Which categories does it actually offer?** (event types, sections, feeds, codes) Record the exact values seen in the response, not the ones in the docs | Users pick from these. There is no fixed list | [D-013](../05-decisions/decision-log.md#d-013-categories-come-from-the-sources-not-a-fixed-list) |
| 3 | **How much does it publish per category?** (events per day, measured from real responses over a period) | There is no filter, so a category that floods users rules the source out | [D-018](../05-decisions/decision-log.md#d-018-no-importance-filter-the-source-decides) |
| 4 | Is there a stable unique ID per event? | Deduplication | [D-005](../05-decisions/decision-log.md#d-005-deduplicate-events-and-notifications) |
| 5 | Push (stream, SSE, webhook) or polling only? | Push is built only where verified | [D-003](../05-decisions/decision-log.md#d-003-push-where-supported-polling-otherwise), [D-017](../05-decisions/decision-log.md#d-017-accepted-ai-recommendations) |
| 6 | Rate limits and terms of use | Is automated use allowed, and how often can we poll? | [D-008](../05-decisions/decision-log.md#d-008-free-sources-keyless-where-possible-verified-by-a-real-call) |

## How this was done

- **Fetched:** 2026-10-02, about 13:58–14:10 UTC, with [fetch-samples.sh](../scripts/fetch-samples.sh). Every response is saved byte for byte in [raw-responses/](raw-responses/), next to a `.meta.txt` holding the URL, fetch time, HTTP status and headers. Error responses are saved too, as the evidence for rejecting a source.
- **Measured:** with [analyse-samples.py](../scripts/analyse-samples.py), which reads only the saved files and makes no network calls. Its output is in [sample-analysis.txt](sample-analysis.txt). Every number below comes from that output.
- **Limitation:** volume comes from **one snapshot per source**. For JSON feeds with a fixed window (USGS, EONET), a snapshot gives a real rate. For RSS, it only shows how many items fall in the last 24 h or 7 d, and a feed holds a fixed number of items (NPR 10, BBC 21–61, UN 30). Where nearly every item is under 24 h old, the true rate may be higher than shown. Polling over several days would give firmer numbers. That has **not** been done.
- **Terms:** saved under [raw-responses/terms/](raw-responses/terms/). Quotes are from those files.

## Candidates

| Source | Kind | Key or registration? | Result | Evidence |
| --- | --- | --- | --- | --- |
| USGS earthquake GeoJSON feeds | disasters | none | **200** | [usgs/](raw-responses/usgs/) |
| GDACS (event list API, RSS) | disasters | none | **200** | [gdacs/](raw-responses/gdacs/) |
| NASA EONET v3 | disasters | none | **200** | [eonet/](raw-responses/eonet/) |
| NWS alerts (api.weather.gov) | disasters | none | 200, but US only and 1.8 MB per poll | [rejected/nws-alerts-active.geojson](raw-responses/rejected/nws-alerts-active.geojson) |
| ReliefWeb API v2 | disasters | **approved appname** | **403**: "You are not using an approved appname" | [rejected/reliefweb-403.json](raw-responses/rejected/reliefweb-403.json) |
| BBC News RSS | news | none | **200** | [bbc/](raw-responses/bbc/) |
| UN News RSS | news | none | **200** (some bodies gzip-compressed, see below) | [un-news/](raw-responses/un-news/) |
| NPR topic RSS | news | none | **200**; unknown ID gives 404 | [npr/](raw-responses/npr/) |
| Al Jazeera RSS | news | none | 200 | [aljazeera/](raw-responses/aljazeera/) |
| GDELT DOC API | news | none | **429** twice: "Please limit requests to one every 5 seconds". One earlier probe in this session returned 200 (not saved) | [gdelt/](raw-responses/gdelt/) |
| Guardian Open Platform, `api-key=test` | news | **key** | **401** Unauthorized: the public test key no longer works | [rejected/guardian-test-key-401.json](raw-responses/rejected/guardian-test-key-401.json) |
| CoinGecko public API | markets | none | **200** | [coingecko/](raw-responses/coingecko/) |
| Coinbase Exchange public API | markets | none | **200** | [coinbase/](raw-responses/coinbase/) |
| Binance public API | markets | none | **200** from here; geo-blocking elsewhere is *unverified* | [binance/](raw-responses/binance/) |
| Frankfurter (ECB rates) | markets | none | **200** at `api.frankfurter.dev`; the old `api.frankfurter.app` returns 301 | [frankfurter/](raw-responses/frankfurter/) |
| Stooq CSV quotes | markets | – | **404** | [rejected/stooq-404.html](raw-responses/rejected/stooq-404.html) |

## Category inventory

These are the exact values seen in the stored responses. The labels are suggestions for the UI.

### USGS: the category is the feed

The documented feed names are Significant, M4.5+, M2.5+, M1.0+ and All, each for the past hour, day, 7 days or 30 days ([usgs-geojson-feed-docs.html](raw-responses/terms/usgs-geojson-feed-docs.html): "Updated every minute"). `properties.type` also varies: `earthquake`, `quarry blast`, `explosion` (in [all_day](raw-responses/usgs/all_day.geojson)).

| Feed (stored file) | Events | Rate | Suggested label |
| --- | --- | --- | --- |
| significant_month | 8 in 30 d | **0.3/day** | Significant earthquakes |
| 4.5_month | 521 in 30 d | 17.4/day | Earthquakes M4.5+ |
| 2.5_week | 323 in 7 d | 46/day | – |
| all_day | 215 in 1 d | 215/day (includes quarry blasts and explosions) | – |

### GDACS: `eventtype` × `alertlevel`

- `eventtype` values: `EQ`, `TC`, `FL`, `VO`, `DR`, `WF`. Suggested labels: earthquake, tropical cyclone, flood, volcano, drought, wildfire.
- `alertlevel` values: `Green`, `Orange`, `Red`.
- The two endpoints publish **different sets**:
  - **Event list API, no parameters:** only Orange and Red (70 Orange, 18 Red). In the last 365 days: 84 events, about **0.23/day** across all types (EQ 23, FL 19, TC 16, WF 15, DR 5, VO 6). In the last 30 days: 3.
  - **RSS:** mostly Green. 196 items in 30 days (6.5/day), of which Green wildfires are 167 (5.6/day). In the last 7 days, Green wildfires ran at 18.1/day.

### EONET: `categories[].id`

`drought`, `dustHaze`, `earthquakes`, `floods`, `landslides`, `manmade`, `seaLakeIce`, `severeStorms`, `snow`, `tempExtremes`, `volcanoes`, `waterColor`, `wildfires` ([categories.json](raw-responses/eonet/categories.json)).

The last 30 days ([events-all-30d.json](raw-responses/eonet/events-all-30d.json)) held 866 events: wildfires 780 (26/day), floods 57, severeStorms 18, seaLakeIce 11. **761 of the 866 cite GDACS as their source.**

### BBC: the category is the section feed

The feed directory ([rss-directory.html](raw-responses/bbc/rss-directory.html)) lists top stories, world (plus africa, asia, europe, latin_america, middle_east and us_and_canada), uk, business, politics, health, education, science_and_environment, technology, entertainment_and_arts, and the England, Scotland, Wales and Northern Ireland feeds.

| Feed | Items | Last 24 h | Last 7 d |
| --- | --- | --- | --- |
| top-stories | 29 | 28 | 28 |
| world | 30 | 25 | 30 |
| business | 52 | 21 | 36 |
| politics | 61 | 12 | 46 |
| science_and_environment | 42 | 10 | 28 |
| technology | 21 | 2 | 15 |
| health | 51 | 2 | 18 |

### UN News: topic and region feeds

The directory page returns **403** ([rss-directory-403.html](raw-responses/un-news/rss-directory-403.html)), so the slugs were found by trial. Each one below is stored in [un-news/](raw-responses/un-news/) with 30 items:
- topics: `climate-change`, `humanitarian-aid`, `peace-and-security`, `economic-development`, `health`, `human-rights`, `women`, `law-and-crime-prevention`, `migrants-and-refugees`, `un-affairs`, `sdgs`, `culture-and-education`;
- regions: `africa`, `americas`, `asia-pacific`, `middle-east`, `europe`.

**This list may be incomplete.** It holds only the slugs that were tried.

Volume: `all` has 30 items in the last 7 d (about 4/day). Topic and region feeds run from 0 to 16 items in 7 d: un-affairs 16, peace-and-security 14, humanitarian-aid 8, africa 7, middle-east 7, health 4, human-rights 4, asia-pacific 4. Culture-and-education and europe had 0.

### NPR: numeric topic IDs

`1001` News, `1002` Home Page Top Stories, `1003` National, `1004` World, `1006` Business, `1007` Science, `1019` Technology, `1025` Environment, `1128` Health. These are the names from each feed's `<title>`, all stored in [npr/](raw-responses/npr/). An unknown ID returns 404. Each feed holds only 10 items. News, Home Page Top Stories and National each had all 10 in the last 24 h, so their true rate is at least 10/day. World: 3. Business: 6. Health: 3.

### Al Jazeera: one feed

All 25 items were published in the last 24 h (an earlier probe measured a 0.2-day span, about 150/day). `<category>` values mix content types with topics: `News`, `Sport`, `Features`, `Opinions`, `Show Types`.

### Markets: no categories, no events

Every market response is a **price snapshot**, not an event: [simple-price](raw-responses/coingecko/simple-price.json) (`usd`, `usd_24h_change`, `last_updated_at`), [Coinbase stats](raw-responses/coinbase/btc-usd-stats.json) (`open`, `last`, …), [Binance 24hr](raw-responses/binance/btcusdt-24hr.json) (`priceChangePercent`, …) and [Frankfurter](raw-responses/frankfurter/latest.json) (`date`, `rates`). None has an event ID or a category.

## Where the event fields really are

These are the fields of the common event format (D-017). Paths were checked against the stored files. "–" means the source doesn't have the field.

| Field | USGS (GeoJSON feature) | GDACS event list (GeoJSON feature) | GDACS RSS `<item>` | BBC / UN / NPR RSS `<item>` |
| --- | --- | --- | --- | --- |
| External ID | `id` (e.g. `ci41342111`); all network IDs in `properties.ids` (`,ci41342111,`) | `properties.eventtype` + `properties.eventid`; `properties.episodeid` changes on updates | `guid` (e.g. `FL1104169`, eventtype + eventid); `gdacs:episodeid` | `guid` (BBC: URL plus `#0`; UN: permalink; NPR: same as `link`) |
| Category | the feed polled | `properties.eventtype` | `gdacs:eventtype` | the feed polled |
| Title | `properties.title` | `properties.name` | `title` | `title` |
| Time | `properties.time` (epoch ms); `properties.updated` | `properties.fromdate` (no time zone); `properties.datemodified` | `pubDate`, `gdacs:fromdate`, `gdacs:datemodified` | `pubDate` (UN: always 12:00:00, so date only) |
| Location | `properties.place` (text); `geometry.coordinates` = [lon, lat, depth] | `properties.country`, `properties.iso3`, `geometry` | `gdacs:country`, `georss:point` = "lat lon" | – |
| Severity | `properties.mag` + `magType`; `properties.alert` (PAGER, null for 478 of 521 M4.5+) | `properties.alertlevel`, `properties.severitydata.severitytext` | `gdacs:alertlevel`, `gdacs:severity` (text, plus a `value` attribute) | – |
| Link | `properties.url` | `properties.url.report` | `link` | `link` (BBC appends `?at_medium=RSS&at_campaign=rss`) |

## Comparison

| Source | Free, no key | Stable ID | Push | Terms (quoted from stored files) | Verdict |
| --- | --- | --- | --- | --- | --- |
| USGS | yes | yes, see notes on `ids` | no: "Updated every minute", so poll | "USGS-authored or produced data and information are considered to be in the U.S. Public Domain" | **use: significant feed** |
| GDACS event list | yes | yes (eventtype + eventid) | no | No reuse restriction found. "GDACS services are not meant to substitute nor to override any official information or alert message" and "notifications … are automatic … not reviewed by human experts" | **use: default list (Orange/Red)** |
| GDACS RSS | yes | yes | no | as above | no: mostly Green alerts, 5.6–18/day |
| EONET | yes | `id` (e.g. `EONET_24511`) | no | docs mention no key or rate limit | no: 88 % re-published GDACS events (cross-source dedup is under Later); wildfires 26/day |
| BBC | yes | `guid` | no hub link | "We encourage the use of BBC News feeds as part of a website … attribution text should read 'BBC News' … You may not use any BBC logo" | **use** |
| UN News | yes | `guid` | no hub link | "for the User's personal, non-commercial use, without any right to resell or redistribute" | **use** (fine for a demo, not for a product) |
| NPR | yes | `guid` | no hub link | "personal, noncommercial use only" | backup for UN News |
| Al Jazeera | yes | `guid` | no | not checked | no: about 150/day, mixes sport and opinion |
| GDELT | yes | URL | no | not checked | no: rate-limited (429 twice), multilingual article firehose, not events |
| Guardian | no (key) | – | – | – | no: D-008 |
| ReliefWeb | no (appname approval) | – | – | – | no: registration |
| CoinGecko / Coinbase / Binance / Frankfurter | yes | – | Coinbase and Binance have websockets (*unverified*, not called) | CoinGecko's terms page returned 403 to a script: *unverified* | **see "Markets" below** |

## What was different from what I expected

1. **Markets are keyless, but they aren't events.** I expected D-016 (key or registration) to decide markets. It doesn't: four keyless sources work. The real problem is D-018. A price feed never "publishes" a market movement. Turning prices into movements needs a threshold the system chooses (for example ±5 % in 24 h), and that is exactly the system-level importance filter D-018 rejects. It is also event detection, which the assumptions exclude. **Markets need your decision** (see below).
2. **GDACS's two endpoints publish different things.** The RSS is mostly Green alerts, dominated by wildfires. The event list API returns only Orange and Red by default. Using the event list is not a filter we add: it is the set the source publishes by default, the "curated alert feed instead of a raw one" that D-018's own note describes. Its date parameters behaved inconsistently: `fromDate`/`toDate` returned 11 events, while `fromdate`/`todate` with the other filters returned 100 (apparently a cap), going back to 2022. So the app should call the default list with no parameters.
3. **EONET is mostly GDACS again.** 761 of its 866 events in 30 days cite GDACS as their source. Using both would cause the cross-source duplicates that were just moved to Later.
4. **Some disaster items are forecasts.** GDACS and EONET each had 2 events dated **after** the fetch time (GloFAS flood forecasts, e.g. "On 05/10/2026, a flood started in Thailand", published 2026-10-02). The app should treat these as "forecast", not as "happened".
5. **The same USGS earthquake can carry several network IDs.** 26 of 521 M4.5+ events list more than one in `properties.ids`. If the preferred `id` changes when another network becomes authoritative, a single-ID dedup would miss it. That is *unverified*: one snapshot can't show an ID changing. The safe approach is to match on any ID in `properties.ids`.
6. **UN News dates have no time.** Every `pubDate` is 12:00:00. New items have to be detected by `guid`, not by time.
7. **BBC section feeds aren't chronological.** Business includes items from 2026-06-30, and top stories one from 2025-04-30. Only `guid` tells what is new. BBC GUIDs end in `#0`. If that suffix changes when a story is updated, an update would look like a new item. That is *unverified*.
8. **One story appears in several feeds of the same source:** 8 of 278 BBC GUIDs, 131 of 369 UN GUIDs, 16 of 63 NPR GUIDs. *Correction from M6:* the BBC count is too low. BBC GUID suffixes differ for the same article (`#0` vs `#2`), so by article URL **34** BBC articles appear more than once in the stored feeds (R-020). Event dedup should key on source + guid, not feed + guid. Otherwise a user subscribed to two sections gets the same story twice.
9. **UN News sent gzip without being asked.** Several bodies came back gzip-compressed even though curl sent no `Accept-Encoding`. I first counted `<item` in the compressed bytes and **wrongly concluded** that the health, culture-and-education and americas feeds were empty. Re-checking with decompression showed 30 items in each. The analysis script now decompresses, and the fetch script notes it.
10. **Things that no longer work:** the Guardian "test" key returns 401, ReliefWeb needs an approved appname, Frankfurter moved domains, and Stooq's CSV URL returns 404.
11. **No push anywhere among the usable sources.** None of the RSS feeds has a WebSub hub link, and USGS, GDACS and EONET are poll-only. This answers Q4: push (D-003) won't be built for any chosen source.

## Choice

**Decided** in [D-024](../05-decisions/decision-log.md#d-024-market-movements-via-bbc-business-no-price-feeds) (markets via BBC Business), [D-025](../05-decisions/decision-log.md#d-025-final-data-sources) (sources: as recommended below, BBC kept, USGS significant only) and [D-026](../05-decisions/decision-log.md#d-026-govslack-not-supported) (GovSlack not supported). The recommendation is kept below as written.

### Recommendation

| Kind | Source | Categories offered to users | Approx. volume | Poll |
| --- | --- | --- | --- | --- |
| Disasters | **USGS significant feed** (`significant_hour` or `_day`) | Significant earthquakes | 0.3/day | every 1–5 min |
| Disasters | **GDACS event list**, default (Orange/Red) | Earthquake, Tropical cyclone, Flood, Volcano, Drought, Wildfire | about 0.23/day in total | every 5–15 min |
| News | **BBC News RSS** | Top stories, World, Business, Politics, Science & environment, Technology, Health (more on request) | 2–28/day per section | every 5 min |
| News | **UN News RSS** | e.g. Peace and security, Humanitarian aid, Climate change, Health, plus regions | 0–2/day per topic | every 15 min |
| Markets | **none as price feeds** (see below) | – | – | – |

Why:
- USGS and GDACS cover the brief's "natural disasters" with curated, low-volume feeds. That fits D-018 without any threshold of ours.
- BBC is the only news source whose terms explicitly allow use on a website. UN News adds a low-volume, humanitarian angle.
- USGS earthquakes may also appear in GDACS as EQ (cross-source, under Later). The README should say so.

### Questions put to the author (answered in D-024 to D-026)

1. **Markets.** These are keyless, so D-016 doesn't drop them, but they conflict with D-018. My recommendation is (a).
   - (a) Drop market price feeds and cover "market movements" through BBC Business: editorial, so the source decides. Name the gap in the README.
   - (b) Make one D-018 exception: a fixed, documented movement rule on one keyless source (e.g. Coinbase BTC-USD ±5 % in 24 h). This adds event detection and a threshold we have to justify.
   - (c) Drop markets entirely.
2. **BBC volume.** Top stories and World run at about 25/day. Is that acceptable? D-018 says a source that floods users is replaced, but the user opts into each section. NPR is the lower-volume fallback (about 10/day for News).
3. **USGS M4.5+** (17/day): offer it as a second category, or keep Significant only (my recommendation).
4. **GovSlack vs D-022.** Slack's webhook doc says GovSlack apps use "the slack-gov.com domain instead of the slack.com domain". D-022's `hooks.slack.com`-only rule excludes them. Recommendation: keep D-022 as it is and note the gap.

## Q5: Slack OAuth redirect on localhost

The source is Slack's OAuth guide, [installing-with-oauth.html](raw-responses/slack-docs/installing-with-oauth.html) (https://docs.slack.dev/authentication/installing-with-oauth/):

> "The redirect_uri must use HTTPS. Alternatively, you can configure a Redirect URL in the App Management page under OAuth & Permissions. A Redirect URL must also use HTTPS."

- **`http://localhost` is not allowed.** The page doesn't mention localhost, so whether Slack accepts `https://localhost` is *unverified*.
- **Workaround for the README:** serve the app's OAuth callback over HTTPS locally with a self-signed certificate, and register `https://localhost:<port>/…` as the Redirect URL.
  - The docs describe the redirect as where Slack "will send the user back to", which suggests a browser redirect, so Slack's servers wouldn't need to reach the machine. That is an *inference*, not stated in the docs.
  - If Slack rejects `https://localhost`, the fallback is an HTTPS tunnel to the local app.
  - Either way, reviewers without a Slack app use webhook paste (D-021).
- **Still to do:** the author's real test in M8 (D-023) settles whether `https://localhost` is accepted.

The webhook doc ([incoming-webhooks.html](raw-responses/slack-docs/incoming-webhooks.html)) confirms the URL shape `https://hooks.slack.com/services/T…/B…/X…` behind D-022. It also lists errors that should not be retried: `invalid_payload`, `channel_is_archived`, `no_service`, `action_prohibited`. That matters for M7.

## Verification

- Raw responses: [raw-responses/](raw-responses/). Re-fetch with `bash process/scripts/fetch-samples.sh`; that overwrites the files.
- Numbers: `python3 process/scripts/analyse-samples.py`. Its output at commit time is [sample-analysis.txt](sample-analysis.txt).
