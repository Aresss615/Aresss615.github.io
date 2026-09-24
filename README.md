# johnchrisley.dev

Portfolio of **John Chrisley Delos Santos**, freelance software developer (PH).

"Kinetic Editorial": light paper, giant display type, one orange accent. Hand-written
HTML, CSS and vanilla JavaScript. No framework, no build step, no third-party scripts.

## Stack
- Semantic HTML5, one page (`index.html`)
- CSS custom-property design system (`style.css`)
- Vanilla JS (`script.js`, < 8 KB): IntersectionObserver reveals, rolling-word hook,
  sticky stacking case cards. Transform and opacity only; honors `prefers-reduced-motion`.
- Fonts: Bricolage Grotesque · Inter · JetBrains Mono

## Deploy
Served from **hammok** (`nginx:alpine` in `/srv/apps/portfolio`) behind a Cloudflare
tunnel. `hammok-deploy@portfolio.timer` pulls `main` from GitHub every minute, so
`git push` is the deploy.

## Local preview
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Checks
```bash
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tests/verify.js           # full suite
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tests/verify.js --no-external --shots /tmp/shots
```
