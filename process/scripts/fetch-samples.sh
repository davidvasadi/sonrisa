#!/usr/bin/env bash
# Fetch raw API responses for M3 data source research.
#
# Usage:  bash process/scripts/fetch-samples.sh          fetch everything
#         bash process/scripts/fetch-samples.sh terms    fetch only lines whose dir or name is "terms"
#
# For every line in SAMPLES below, saves into process/03-research/raw-responses/<dir>/:
#   <name>             the response body, byte for byte as received
#   <name>.meta.txt    URL, fetch time (UTC), HTTP status, and response headers
# Nothing is parsed or trimmed here; analysis reads these files afterwards.
# Error responses (403, 401, 404, 429) are saved too: they are evidence for rejecting a source.
# Some servers (news.un.org via Fastly) send gzip even when curl does not ask for it.
# The body is still saved as received; analyse-samples.py decompresses it (see the content-encoding header).

set -u
cd "$(dirname "$0")/../.."
OUT=process/03-research/raw-responses
UA="sonrisa-research/0.1 (take-home demo; local research script)"

# dir  name  url
SAMPLES=$(cat <<'EOF'
usgs significant_month.geojson https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson
usgs 4.5_month.geojson https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson
usgs 2.5_week.geojson https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson
usgs all_day.geojson https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
usgs significant_day.geojson https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson
gdacs eventlist-default.json https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH
gdacs rss.xml https://www.gdacs.org/xml/rss.xml
eonet categories.json https://eonet.gsfc.nasa.gov/api/v3/categories
eonet events-all-30d.json https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=30
bbc world.rss https://feeds.bbci.co.uk/news/world/rss.xml
bbc business.rss https://feeds.bbci.co.uk/news/business/rss.xml
bbc science_and_environment.rss https://feeds.bbci.co.uk/news/science_and_environment/rss.xml
bbc technology.rss https://feeds.bbci.co.uk/news/technology/rss.xml
bbc health.rss https://feeds.bbci.co.uk/news/health/rss.xml
bbc politics.rss https://feeds.bbci.co.uk/news/politics/rss.xml
bbc top-stories.rss https://feeds.bbci.co.uk/news/rss.xml
bbc rss-directory.html https://www.bbc.co.uk/news/10628494
un-news all.rss https://news.un.org/feed/subscribe/en/news/all/rss.xml
un-news topic-climate-change.rss https://news.un.org/feed/subscribe/en/news/topic/climate-change/feed/rss.xml
un-news topic-humanitarian-aid.rss https://news.un.org/feed/subscribe/en/news/topic/humanitarian-aid/feed/rss.xml
un-news topic-peace-and-security.rss https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml
un-news topic-economic-development.rss https://news.un.org/feed/subscribe/en/news/topic/economic-development/feed/rss.xml
un-news topic-health.rss https://news.un.org/feed/subscribe/en/news/topic/health/feed/rss.xml
un-news topic-human-rights.rss https://news.un.org/feed/subscribe/en/news/topic/human-rights/feed/rss.xml
un-news topic-women.rss https://news.un.org/feed/subscribe/en/news/topic/women/feed/rss.xml
un-news topic-law-and-crime-prevention.rss https://news.un.org/feed/subscribe/en/news/topic/law-and-crime-prevention/feed/rss.xml
un-news topic-migrants-and-refugees.rss https://news.un.org/feed/subscribe/en/news/topic/migrants-and-refugees/feed/rss.xml
un-news topic-un-affairs.rss https://news.un.org/feed/subscribe/en/news/topic/un-affairs/feed/rss.xml
un-news topic-sdgs.rss https://news.un.org/feed/subscribe/en/news/topic/sdgs/feed/rss.xml
un-news topic-culture-and-education.rss https://news.un.org/feed/subscribe/en/news/topic/culture-and-education/feed/rss.xml
un-news region-africa.rss https://news.un.org/feed/subscribe/en/news/region/africa/feed/rss.xml
un-news region-americas.rss https://news.un.org/feed/subscribe/en/news/region/americas/feed/rss.xml
un-news region-asia-pacific.rss https://news.un.org/feed/subscribe/en/news/region/asia-pacific/feed/rss.xml
un-news region-middle-east.rss https://news.un.org/feed/subscribe/en/news/region/middle-east/feed/rss.xml
un-news region-europe.rss https://news.un.org/feed/subscribe/en/news/region/europe/feed/rss.xml
un-news rss-directory-403.html https://news.un.org/en/rss-feeds
npr 1001-news.rss https://feeds.npr.org/1001/rss.xml
npr 1004-world.rss https://feeds.npr.org/1004/rss.xml
npr 1006-business.rss https://feeds.npr.org/1006/rss.xml
npr 1007-science.rss https://feeds.npr.org/1007/rss.xml
npr 1025-environment.rss https://feeds.npr.org/1025/rss.xml
npr 1002-home-top-stories.rss https://feeds.npr.org/1002/rss.xml
npr 1003-national.rss https://feeds.npr.org/1003/rss.xml
npr 1019-technology.rss https://feeds.npr.org/1019/rss.xml
npr 1128-health.rss https://feeds.npr.org/1128/rss.xml
npr 9999999-invalid-404.rss https://feeds.npr.org/9999999/rss.xml
aljazeera all.rss https://www.aljazeera.com/xml/rss/all.xml
gdelt artlist-english-24h.json https://api.gdeltproject.org/api/v2/doc/doc?query=sourcelang:english&mode=artlist&format=json&maxrecords=250&timespan=24h
coingecko simple-price.json https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true
coingecko markets-top10.json https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=10&page=1
coinbase btc-usd-stats.json https://api.exchange.coinbase.com/products/BTC-USD/stats
coinbase btc-usd-ticker.json https://api.exchange.coinbase.com/products/BTC-USD/ticker
binance btcusdt-24hr.json https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT
frankfurter latest.json https://api.frankfurter.dev/v1/latest
frankfurter old-domain-301.html https://api.frankfurter.app/latest
rejected reliefweb-403.json https://api.reliefweb.int/v2/disasters?appname=sonrisa
rejected guardian-test-key-401.json https://content.guardianapis.com/search?api-key=test
rejected stooq-404.html https://stooq.com/q/l/?s=^spx&f=sd2t2ohlcv&h&e=csv
rejected nws-alerts-active.geojson https://api.weather.gov/alerts/active
slack-docs installing-with-oauth.html https://docs.slack.dev/authentication/installing-with-oauth/
slack-docs incoming-webhooks.html https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
slack-docs formatting-message-text.html https://docs.slack.dev/messaging/formatting-message-text/
nodemailer-docs smtp.html https://nodemailer.com/smtp
nodemailer-docs message.html https://nodemailer.com/message
terms usgs-copyrights-and-credits.html https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits
terms usgs-geojson-feed-docs.html https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
terms gdacs-term-of-use.html https://www.gdacs.org/About/termofuse.aspx
terms eonet-api-docs-v3.html https://eonet.gsfc.nasa.gov/docs/v3
terms un-terms-of-use.html https://www.un.org/en/about-us/terms-of-use
terms npr-terms-of-use.html https://www.npr.org/about-npr/179876898/terms-of-use
terms coingecko-api-terms.html https://www.coingecko.com/en/api_terms
EOF
)

ONLY="${1:-}"
while read -r dir name url; do
  [ -z "$dir" ] && continue
  [ -n "$ONLY" ] && [ "$dir" != "$ONLY" ] && [ "$name" != "$ONLY" ] && continue
  mkdir -p "$OUT/$dir"
  headers=$(mktemp)
  status=$(curl -s -A "$UA" -m 60 -D "$headers" -o "$OUT/$dir/$name" -w '%{http_code}' "$url")
  {
    echo "url: $url"
    echo "fetched_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "http_status: $status"
    echo "user_agent: $UA"
    echo
    tr -d '\r' < "$headers"
  } > "$OUT/$dir/$name.meta.txt"
  rm -f "$headers"
  echo "$status $(wc -c < "$OUT/$dir/$name" | tr -d ' ') $dir/$name"
  # GDELT allows about one request every 5 seconds; be polite to everyone.
  sleep 6
done <<< "$SAMPLES"
