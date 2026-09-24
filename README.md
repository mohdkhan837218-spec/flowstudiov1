# Google Flow Studio V2 🎬

> High-Performance, Multi-Account Parallel AI Video Generation & Studio Orchestration Engine for Google Flow (Veo & Nano Banana models).

---

## 🌟 Key Features

* **Multi-Account Parallel Orchestration**: Rotate through pooled Google accounts seamlessly with live credit tracking (150 Credits/account).
* **Sliding Window Burst Concurrency**: Generate multiple video scenes simultaneously with real-time progress monitoring.
* **Intelligent Bulk Prompt Parser**:
  * Automatically detects `#0-00`, `Scene 1:`, numbered prompts, paragraphs, and dividers.
  * Formats and cleans prompt text with one click.
  * Atomic insertion engine prevents `@` mention focus hijacking.
* **Dual View Accounts Manager**: Bento Card View + Data Table View with checkbox selection, live credit sync, and 1-click email copy.
* **Failed & Recovery Queue**: Auto-detects safety policy flags, server drops, and timeouts with 1-click re-queueing to ready accounts.
* **Generation History & Gallery**: Real-time video player with local folder preview and direct export.
* **Native Anti-Detection**: Profile separation, clean lock release, and humanized input cadence.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* Google Chrome installed

### Installation

1. Clone the repository:
```bash
git clone <YOUR_REPOSITORY_URL>
cd flowstudiov1-main
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```
*Or double-click `start_flow_studio.bat` on Windows.*

---

## 🛠️ Tech Stack
* **Framework**: Electron.js
* **Automation Engine**: Puppeteer-Core + Chrome DevTools Protocol (CDP)
* **Database**: SQLite (sql.js with atomic persistence)
* **Frontend**: Vanilla HTML5, CSS3 (Modern Glassmorphism & Cyberpunk Luxe Dark Mode), JavaScript (ES2022)
* **Media Processing**: FFmpeg Service
