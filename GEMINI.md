# ==============================================================================
# FLOW STUDIO V2: MASTER KNOWLEDGE & AUTONOMOUS SELF-HEALING PROTOCOL
# ==============================================================================

## 🎯 1. PROJECT ARCHITECTURE MAP
Google Flow Studio V2 is an Electron.js Multi-Profile Desktop Automation & Concurrent Engine for Google Flow / Veo Video Generation.

- `main.js`: Electron Main Process (IPC registry, Window lifecycle, Worker pool orchestration).
- `preload.js`: Secure context bridge (`window.electronAPI`).
- `renderer/`:
  - `index.html`: Dashboard UI (Accounts, Prompts, Logs, Gallery, Settings).
  - `style.css`: Modern Glassmorphism styling, layout, theme tokens.
  - `app.js`: Frontend state, event listeners, real-time log rendering, IPC calls.
- `engine/`:
  - `flowAutomation.js`: Puppeteer-core automation for Google Flow / Veo (DOM interaction, prompts, downloads).
  - `workerPool.js`: Concurrent multi-account worker management.
  - `accountStore.js`: Persistent Chrome profiles, cookies, proxies, credits.
  - `profileDetector.js`: Real Chrome executable & profile discovery.
  - `ffmpegService.js` & `wm.js`: Video processing & watermark cleaner.
  - `db.js`: SQLite (`sql.js`) persistent storage.

---

## 🔁 2. DEEP REAL-WORLD TESTING & SELF-HEALING LOOP (NON-NEGOTIABLE)

When asked to test, fix, or verify any feature or webpage:

### Rule 1: Real Action, Never Guessing
- NEVER just look at the code and assume "it should work" or give a premature answer.
- You MUST actively go to the real webpage or run the real app.
- Use `browser_subagent` and `chrome-devtools` to launch the actual page, click buttons, and inspect live DOM elements.

### Rule 2: Full-Stack Inspection (Khol ke Patakna)
- **Frontend Deep Inspection:** Inspect the real live DOM elements, element hierarchy, computed styles, event listeners, and JavaScript console errors.
- **Backend & IPC Deep Inspection:** Check terminal output, IPC responses, network requests, and Puppeteer logs.

### Rule 3: The Autonomous Fix-and-Verify Loop
1. **Reproduce:** Trigger the action on the real webpage/app to see the exact error live.
2. **Diagnose:** Trace the root cause in both frontend and backend.
3. **Fix:** Apply the surgical code fix.
4. **Re-Test:** Go BACK to the real page/app and re-run the exact test.
5. **Loop Until Flawless:** If any error remains or unexpected behavior occurs, repeat the fix-test cycle. ONLY declare complete when the real test succeeds without any console or backend errors.

---

## 🎨 3. VISUAL & DESIGN SUPERPOWERS (MODERN-WEB-GUIDANCE)
- Ultra-modern Glassmorphism: Frosted glass panels (`backdrop-filter: blur(16px)`), subtle neon borders, deep obsidian/slate backgrounds.
- Micro-animations: Pulsing worker status, smooth progress bars, interactive button feedback.
- Clean typography: Refined fonts, high readability, zero amateur or generic look.

---

## 🛡️ 4. ZERO BREAKAGE RULE
- Always inspect existing code before editing.
- Never break existing IPC handlers in `main.js`, `preload.js`, and `app.js`.
- Make changes incrementally, step-by-step.
