# Flow Workspace — Multi-Account Browser Profile & Video Job Manager

> Production-grade desktop application for managing multiple isolated Google browser profiles, persistent Chromium sessions, and automated workflow queues.

---

## 🌟 Key Architecture & Highlights (Phase 1–4)

1. **Persistent Browser Profiles**:
   - Each Google account receives its own completely isolated profile directory (`app-data/profiles/acct_<id>/`).
   - Zero profile sharing and zero cookie leakage between accounts.
   - Enforces single-instance locks per account profile.

2. **Manual & Secure Google Login Flow**:
   - Never collects or stores plaintext passwords, MFA secrets, or authentication cookies.
   - Launches a visible Chromium window directly to Google Sign-In.
   - The user completes login, 2FA, and verification manually in the browser.
   - Safe identity detection detects authentication completion and resolves the active Google identity.

3. **Authoritative Account State Machine**:
   - `NEW` $\to$ `CONNECTING` $\to$ `CONNECTED` $\to$ `OPEN` $\to$ `PAUSED` $\to$ `ERROR` $\to$ `RECONNECT_REQUIRED` $\to$ `REMOVED`.

4. **Security Model**:
   - Electron `contextIsolation: true`, `nodeIntegration: false`.
   - Strict preload bridge (`window.flowWorkspace`).
   - Renderer has zero direct access to Playwright, filesystem paths, or shell commands.
   - Path traversal protection and input sanitization on all account operations.

5. **Local Persistence**:
   - SQLite (`sql.js`) database for accounts, profile metadata, settings, and activity logs.

6. **Modern Dark SaaS UI**:
   - Built with React 18, TypeScript, TailwindCSS, and Zustand.
   - Glassmorphism design system, real-time activity stream, and live account cards with action controls (Open, Connect, Close, Pause/Resume, Logs, Remove).

---

## 🚀 Quickstart & Development

### 1. Install Dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Run Tests
```bash
npm test
```

### 3. Type Check & Build
```bash
npm run typecheck
npm run compile:main
npm run compile:preload
npm run build
```

### 4. Run the Desktop App in Development Mode
```bash
npm run app:dev
```

---

## 📁 Project Structure

```
Flow Mk Studio/
├── src/
│   ├── main/
│   │   ├── index.ts                # Electron window & app lifecycle
│   │   ├── database/db.ts          # SQLite database layer
│   │   ├── security/paths.ts       # Path sanitization & profile bounds
│   │   ├── logging/logger.ts       # Structured audit logger & IPC emitter
│   │   ├── managers/
│   │   │   ├── ProfileManager.ts   # Directory isolation & locks
│   │   │   ├── BrowserManager.ts   # Playwright Chromium persistent sessions
│   │   │   └── AccountManager.ts   # State machine & login detection
│   │   └── ipc/                    # Type-safe IPC channels
│   ├── preload/
│   │   ├── api.ts                  # Secure API bridge implementation
│   │   └── index.ts                # contextBridge exposure
│   ├── renderer/
│   │   ├── App.tsx                 # Main application layout
│   │   ├── components/             # Layout, Account cards, Modals, Badges
│   │   ├── pages/                  # Dashboard, Accounts, Projects, Queue, Activity, Settings
│   │   └── stores/                 # Zustand stores (accounts, activity, settings)
│   └── shared/types/               # Shared TypeScript interfaces
├── tests/
│   ├── unit/profileManager.test.ts
│   ├── unit/accountStateMachine.test.ts
│   └── integration/browserIsolation.test.ts
└── app-data/                       # Local SQLite DB and persistent profiles
```

---

## 🧪 Verified Test Suite

- ✅ **Profile Isolation**: Multiple accounts maintain distinct, non-overlapping user data directories.
- ✅ **Single Instance Lock**: Prevents duplicate browser processes from corrupting the same profile.
- ✅ **Path Traversal Guards**: Rejects invalid path traversal attempts in account IDs.
- ✅ **State Transitions**: Full validation of account states (`NEW`, `CONNECTING`, `CONNECTED`, `PAUSED`, `REMOVED`).
- ✅ **Session Persistence**: Verifies that authenticated persistent cookies persist across browser restarts without leaking to other profiles.
