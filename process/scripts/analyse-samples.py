#!/usr/bin/env python3
"""Analyse the stored raw responses for M3 (data source research).

Usage:  python3 process/scripts/analyse-samples.py > process/03-research/sample-analysis.txt

Reads only files saved by fetch-samples.sh in process/03-research/raw-responses/.
Makes no network calls, so every number here can be re-derived from the stored evidence.
"Now" is each file's fetched_at (from its .meta.txt), not the time this script runs.
"""
import collections
import email.utils
import gzip
import json
import os
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

RAW = os.path.join(os.path.dirname(__file__), '..', '03-research', 'raw-responses')
G = '{http://www.gdacs.org}'


def path(rel):
    return os.path.join(RAW, rel)


def read_bytes(rel):
    # Some bodies were sent gzip-compressed without being asked for (UN News via Fastly).
    data = open(path(rel), 'rb').read()
    return gzip.decompress(data) if data[:2] == b'\x1f\x8b' else data


def fetched_at(rel):
    with open(path(rel) + '.meta.txt') as f:
        m = re.search(r'^fetched_at: (\S+)', f.read(), re.M)
    return datetime.strptime(m.group(1), '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)


def ms(t):
    return datetime.fromtimestamp(t / 1000, timezone.utc)


def per_day(n, days):
    return f'{n / days:.1f}/day' if days else 'n/a'


def section(title):
    print(f'\n## {title}\n')


# ---------------------------------------------------------------- USGS
section('USGS earthquakes (GeoJSON summary feeds)')
for name, days in [('significant_month', 30), ('4.5_month', 30), ('2.5_week', 7), ('all_day', 1)]:
    rel = f'usgs/{name}.geojson'
    d = json.load(open(path(rel)))
    feats = d['features']
    times = [ms(f['properties']['time']) for f in feats]
    span = (max(times) - min(times)).total_seconds() / 86400 if len(times) > 1 else 0
    types = collections.Counter(f['properties']['type'] for f in feats)
    alerts = collections.Counter(f['properties']['alert'] for f in feats)
    multi_ids = sum(1 for f in feats if f['properties']['ids'].strip(',').count(',') > 0)
    reviewed = collections.Counter(f['properties']['status'] for f in feats)
    print(f'{name}: metadata.count={d["metadata"]["count"]}, features={len(feats)}, '
          f'nominal window {days} d -> {per_day(len(feats), days)}; observed span {span:.1f} d')
    print(f'  properties.type: {dict(types)}')
    print(f'  properties.alert (PAGER): {dict(alerts)}')
    print(f'  properties.status: {dict(reviewed)}')
    print(f'  features with more than one network id in properties.ids: {multi_ids}')
    if name == 'all_day':
        lag = [(f['properties']['updated'] - f['properties']['time']) / 60000 for f in feats]
        print(f'  updated - time (minutes): min {min(lag):.0f}, median {sorted(lag)[len(lag)//2]:.0f}, max {max(lag):.0f}')
        print(f'  sample id: {feats[0]["id"]}, properties.ids: {feats[0]["properties"]["ids"]}')

# ---------------------------------------------------------------- GDACS
section('GDACS (event list API and RSS)')
rel = 'gdacs/eventlist-default.json'
d = json.load(open(path(rel)))
feats = d['features']
now = fetched_at(rel)
print(f'eventlist SEARCH (no parameters): {len(feats)} features, fetched {now:%Y-%m-%d %H:%M}Z')
print(f'  properties.eventtype: {dict(collections.Counter(f["properties"]["eventtype"] for f in feats))}')
print(f'  properties.alertlevel: {dict(collections.Counter(f["properties"]["alertlevel"] for f in feats))}')
print(f'  properties.iscurrent: {dict(collections.Counter(f["properties"]["iscurrent"] for f in feats))}')
fd = sorted(f['properties']['fromdate'] for f in feats)
print(f'  properties.fromdate range: {fd[0]} .. {fd[-1]}')
for window in (30, 90, 365):
    recent = [f['properties'] for f in feats
              if datetime.fromisoformat(f['properties']['fromdate']).replace(tzinfo=timezone.utc) >= now - timedelta(days=window)]
    by = collections.Counter(p['eventtype'] for p in recent)
    print(f'  fromdate in last {window} d: {len(recent)} events ({per_day(len(recent), window)}), by eventtype {dict(sorted(by.items()))}')

rel = 'gdacs/rss.xml'
root = ET.parse(path(rel)).getroot()
items = root.findall('.//item')
now = fetched_at(rel)
rows = []
for it in items:
    pub = email.utils.parsedate_to_datetime(it.findtext('pubDate'))
    frm = email.utils.parsedate_to_datetime(it.findtext(G + 'fromdate'))
    rows.append((it.findtext(G + 'eventtype'), it.findtext(G + 'alertlevel'), pub, frm,
                 it.findtext('guid'), it.findtext(G + 'episodeid')))
pubs = [r[2] for r in rows]
print(f'\nrss.xml: {len(items)} items, pubDate {min(pubs):%Y-%m-%d} .. {max(pubs):%Y-%m-%d}')
for window in (7, 30):
    recent = [r for r in rows if r[2] >= now - timedelta(days=window)]
    by = collections.Counter((r[0], r[1]) for r in recent)
    print(f'  pubDate in last {window} d: {len(recent)} items ({per_day(len(recent), window)})')
    for (t, lvl), n in sorted(by.items()):
        print(f'    {t} {lvl}: {n} ({per_day(n, window)})')
future = [r for r in rows if r[3] > now]
print(f'  items whose gdacs:fromdate is after the fetch time (forecasts): {len(future)}')
guids = collections.Counter(r[4] for r in rows)
print(f'  duplicate guids within the feed: {sum(1 for g, n in guids.items() if n > 1)}')
print(f'  sample guid: {rows[0][4]} (eventtype + eventid; episodeid {rows[0][5]} is separate)')

# ---------------------------------------------------------------- EONET
section('NASA EONET (v3)')
cats = json.load(open(path('eonet/categories.json')))['categories']
print('categories.json: ' + ', '.join(f'{c["id"]} ("{c["title"]}")' for c in cats))
rel = 'eonet/events-all-30d.json'
d = json.load(open(path(rel)))
evs = d['events']
now = fetched_at(rel)
print(f'\nevents?status=all&days=30: {len(evs)} events')
by_cat = collections.Counter(c['id'] for e in evs for c in e['categories'])
for c, n in by_cat.most_common():
    print(f'  {c}: {n} ({per_day(n, 30)})')
by_src = collections.Counter(s['id'] for e in evs for s in e['sources'])
print(f'  sources[].id: {dict(by_src.most_common(10))}')
future = sum(1 for e in evs if any(datetime.fromisoformat(g['date'].replace('Z', '+00:00')) > now for g in e['geometry']))
print(f'  events with a geometry date after the fetch time: {future}')
closed_future = sum(1 for e in evs if e['closed'] and datetime.fromisoformat(e['closed'].replace('Z', '+00:00')) > now)
print(f'  events whose "closed" date is after the fetch time: {closed_future}')
geoms = [len(e['geometry']) for e in evs]
print(f'  geometry points per event: min {min(geoms)}, max {max(geoms)}')

# ---------------------------------------------------------------- RSS news
section('News RSS feeds')


def rss_items(rel):
    root = ET.fromstring(read_bytes(rel))
    out = []
    for it in root.findall('.//item'):
        pd = it.findtext('pubDate')
        out.append({
            'guid': it.findtext('guid'),
            'link': it.findtext('link'),
            'pub': email.utils.parsedate_to_datetime(pd) if pd else None,
            'cats': [c.text for c in it.findall('category')],
        })
    return out


feeds = {
    'bbc': ['world', 'business', 'science_and_environment', 'technology', 'health', 'politics', 'top-stories'],
    'un-news': ['all', 'topic-climate-change', 'topic-humanitarian-aid', 'topic-peace-and-security',
                'topic-economic-development', 'topic-health', 'topic-human-rights', 'topic-women',
                'topic-law-and-crime-prevention', 'topic-migrants-and-refugees', 'topic-un-affairs', 'topic-sdgs',
                'topic-culture-and-education', 'region-africa', 'region-americas', 'region-asia-pacific',
                'region-middle-east', 'region-europe'],
    'npr': ['1001-news', '1002-home-top-stories', '1003-national', '1004-world', '1006-business', '1007-science',
            '1019-technology', '1025-environment', '1128-health'],
    'aljazeera': ['all'],
}
for src, names in feeds.items():
    print(f'{src}:')
    seen = collections.defaultdict(set)
    for n in names:
        rel = f'{src}/{n}.rss'
        items = rss_items(rel)
        now = fetched_at(rel)
        pubs = [i['pub'] for i in items if i['pub']]
        last1 = sum(1 for p in pubs if p >= now - timedelta(days=1))
        last7 = sum(1 for p in pubs if p >= now - timedelta(days=7))
        oldest = f'{min(pubs):%Y-%m-%d}' if pubs else '-'
        times = collections.Counter(p.strftime('%H:%M:%S') for p in pubs)
        noon = times.get('12:00:00', 0)
        print(f'  {n}: {len(items)} items, last 24 h {last1}, last 7 d {last7}, oldest {oldest}'
              + (f', pubDate 12:00:00 on {noon}/{len(pubs)}' if noon > len(pubs) / 2 else ''))
        for i in items:
            seen[i['guid']].add(n)
        if src == 'aljazeera':
            print(f'    <category>: {dict(collections.Counter(c for i in items for c in i["cats"]))}')
    shared = sum(1 for g, fs in seen.items() if len(fs) > 1)
    print(f'  guids appearing in more than one {src} feed: {shared} of {len(seen)}')

# ---------------------------------------------------------------- Markets
section('Market data (snapshots, not events)')
for rel in ['coingecko/simple-price.json', 'coinbase/btc-usd-stats.json', 'coinbase/btc-usd-ticker.json',
            'binance/btcusdt-24hr.json', 'frankfurter/latest.json']:
    d = json.load(open(path(rel)))
    keys = list(d.keys()) if isinstance(d, dict) else list(d[0].keys())
    print(f'{rel}: top-level keys {keys}')
print('None of these responses contains an event list, an event id, or a category. Each is a price snapshot.')
