# Director Title Card Intro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved cinematic Director's Title Card + Match Cut intro for the existing static portfolio.

**Architecture:** Keep the site static and progressively enhanced. `motion.js` injects decorative intro DOM and coordinates the reveal; `style.css` owns all visual treatment and reduced-motion behavior; `index.html` only updates cache-busting versions.

**Tech Stack:** HTML, CSS custom properties, vanilla JavaScript, GSAP/ScrollTrigger when available, Python local static server for preview.

---

## File Structure

- Modify `motion.js`: replace the current simple intro markup/timeline with the richer title-card sequence and hero reveal hooks.
- Modify `style.css`: add director-title-card intro layers, grain, guide lines, shutter wipe, hero light sweep, responsive behavior, and reduced-motion overrides.
- Modify `index.html`: bump `style.css` and `motion.js` query strings to force GitHub Pages cache refresh.
- No new runtime dependency or generated image asset is required; the aesthetic is achievable with CSS gradients, masks, and existing GSAP.

### Task 1: Static Regression Check

**Files:**
- Test: shell command only

- [ ] **Step 1: Run failing static check**

```bash
node - <<'NODE'
const fs = require('fs');
const checks = [
  ['motion.js', 'intro__beam'],
  ['motion.js', 'intro__wipe'],
  ['motion.js', 'hero-ready'],
  ['style.css', '.intro__grain'],
  ['style.css', '.intro__frame'],
  ['style.css', '.hero__card::before'],
  ['index.html', 'style.css?v=motion4'],
  ['index.html', 'motion.js?v=motion4'],
];
const missing = checks.filter(([file, token]) => !fs.readFileSync(file, 'utf8').includes(token));
if (missing.length) {
  console.error('Missing cinematic intro hooks:');
  for (const [file, token] of missing) console.error(`${file}: ${token}`);
  process.exit(1);
}
console.log('cinematic intro hooks present');
NODE
```

Expected: FAIL listing the missing hooks.

### Task 2: Implement Intro Markup And Timeline

**Files:**
- Modify: `motion.js`

- [ ] **Step 1: Replace intro injected HTML**

Add decorative layers: `intro__grain`, `intro__beam`, `intro__frame`, `intro__wipe`, title words/chars, count line, and status copy.

- [ ] **Step 2: Update GSAP timeline**

Sequence: reveal frame/tag, light beam sweep, stagger title characters, fill progress, add `hero-ready`, remove `intro-active`, animate content out, and wipe the intro upward.

- [ ] **Step 3: Preserve fallbacks**

Keep reduced-motion instant load, non-GSAP timed wipe, and hard timeout.

### Task 3: Implement Intro And Hero Styling

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Add title-card CSS**

Style dark film surface, grain, amber light leaks, guide frame, large title typography, progress line, and wipe layer.

- [ ] **Step 2: Add match-cut hero CSS**

Add `html.gsap-on.hero-ready` states and a portrait light sweep through `.hero__card::before`.

- [ ] **Step 3: Add responsive and reduced-motion rules**

Keep intro legible on mobile and ensure reduced-motion hides all intro-only layers.

### Task 4: Cache Bust And Verify

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Bump static asset versions**

Change `style.css?v=motion3` and `motion.js?v=motion3` to `motion4`.

- [ ] **Step 2: Run static check**

Rerun the Task 1 command. Expected: PASS.

- [ ] **Step 3: Run local preview**

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`, verify the intro clears and the hero renders.

- [ ] **Step 4: Browser QA**

Check desktop and mobile viewports, console errors/warnings, screenshot evidence, and the primary flow `app loads -> intro clears -> hero is visible -> Selected work anchor works`.
