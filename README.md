# Frog Dev UI

```code
pnpm install
pnpm dev
```

Head to <http://localhost:5173>

## parse old-style channel URLs

```sh
curl 'https://all-channels.artlu.workers.dev' | jq '[.result.channels.[] | select(.url|startswith("https://warpcast.com/~/channel/") | not) | {id,url}]' > legacy-channels.json
```
