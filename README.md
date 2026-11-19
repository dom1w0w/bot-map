# Live Bot Map

A live, animated map of Dom's bots. The page is static (GitHub Pages, `main` branch). The live data comes from `status.json` on the **`feed`** branch. A refresher loop on Dom's Grok Bot box publishes it.

- Map: https://dom1w0w.github.io/bot-map/ · List view: https://dom1w0w.github.io/bot-map/list.html
- Feed: https://raw.githubusercontent.com/dom1w0w/bot-map/feed/status.json

## How it stays live
- **Box refresher** (`/workspace/bot-map/refresher.py`) runs every 90s. It rebuilds `status.json` from bot profiles and from message *timestamps and sender type only*. It never includes message text. It pushes to the `feed` branch only when the data changed, and at least every 10 min as a heartbeat.
- The `feed` branch is not the Pages source, so feed pushes don't trigger Pages builds.
- The page re-fetches the feed every 60s and animates any changes. `raw.githubusercontent.com` caches for up to ~5 min, so the **LIVE badge shows the feed's real age** (based on `generatedAt`). Normal lag is ~1.5–6.5 min (90s refresh + raw CDN cache, which ignores query strings). It turns amber after 7 min and red/STALE after 15 min.

## Restart the refresher (on the box)
```bash
cd /workspace/bot-map && nohup python3 refresher.py >> refresher.log 2>&1 & echo $! > refresher.pid
```
Stop it: `kill $(cat /workspace/bot-map/refresher.pid)` · Logs: `tail -f /workspace/bot-map/refresher.log`

## Regroup bots
Edit `clusters.json` in this repo. It maps agent ids to cluster keys, and any unmapped or new bot lands in **Other**. Then sync it to the box copy at `/workspace/bot-map/site/clusters.json` (`git -C /workspace/bot-map/site pull`). The next refresh picks it up.

## Privacy
`status.json` holds only: display name, cluster, a cleaned first-sentence role (links, emails and paths are stripped), last-active time, 24h event count, a generic "doing now" label, and a list of recent event timestamps with their kind (reply/message). No message content, prompts, URLs, emails or secrets. Pages carry `noindex` and `robots.txt` disallows all crawling.
