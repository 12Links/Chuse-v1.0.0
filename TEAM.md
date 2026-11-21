# Chuse Engineering Team & Branching Guide

This document outlines team assignments, dedicated group branches, and the Pull Request (PR) review process for the **Chuse** project.

All team members work within their assigned group branches. All PRs target `main` and must be reviewed and merged by **Jacky Mpoka (@Jackyphuti)**.

---

## 👥 Team Structure & Assignments

| Group | Slot | Team Member | GitHub Handle | Dedicated Branch | Primary Focus / Notes |
|---|---|---|---|---|---|
| **1. Data & Scrapers** | 1 of 2 | Tebello Mohohoma | [@Mat6577](https://github.com/Mat6577) | `group/1-data-scrapers` | Architecting the core scraping logic and normalizing all the stores products |
| **1. Data & Scrapers** | 2 of 2 | Sello Aphane | [@SelloAphanee](https://github.com/SelloAphanee) | `group/1-data-scrapers` | Store catalog scraping, scrapers maintenance & pricing pipelines |
| **2. Backend, Optimizer & AI** | 1 of 2 | Nkosinathi Ngwenya | [@NuttyHack](https://github.com/NuttyHack) | `group/2-backend-optimizer-ai` | Architecting the core intelligence engine |
| **2. Backend, Optimizer & AI** | 2 of 2 | Lesego Mageza | [@lesego432](https://github.com/lesego432) | `group/2-backend-optimizer-ai` | Backend API, basket split optimizer & AI integration |
| **3. Core Shopping UI** | 1 of 2 | Savuzwa Mpayipheli | [@savuzwampayipheli](https://github.com/savuzwampayipheli) | `group/3-core-shopping-ui` | Design and develop the user-facing shopping interface of Chuse |
| **3. Core Shopping UI** | 2 of 2 | Jacky Mpoka | [@Jackyphuti](https://github.com/Jackyphuti) | `group/3-core-shopping-ui` | Design, UI polish pass & Lead Reviewer |
| **4. Mobile, Auth & Platform Lead** | 1 of 1 | Lwandiso George | [@Lwandiso1234](https://github.com/Lwandiso1234) | `group/4-mobile-auth-platform` | Auth & onboarding flows, Capacitor Android/iOS builds, barcode scanning, and PR/merge coordination |

---

## 🚀 How to Work in Your Group Branch

### 1. Fetch and Checkout Your Branch
```bash
# Fetch all remote branches from GitHub
git fetch origin

# Checkout your group branch:
# Group 1:
git checkout group/1-data-scrapers

# Group 2:
git checkout group/2-backend-optimizer-ai

# Group 3:
git checkout group/3-core-shopping-ui

# Group 4:
git checkout group/4-mobile-auth-platform
```

### 2. Developing Features
You can either commit directly to your group branch, or create a feature branch off your group branch:
```bash
# Example feature branch off group branch:
git checkout -b feature/woolies-scraper-update group/1-data-scrapers
```

### 3. Submitting Pull Requests (PRs)
1. Push your work to GitHub:
   ```bash
   git push -u origin group/<your-group-branch>
   ```
2. Open a Pull Request on GitHub:
   - **Base branch:** `main`
   - **Compare branch:** `group/<your-group-branch>` (or your feature branch)
3. **Assign Reviewer:** Assign **Jacky Mpoka (@Jackyphuti)** as the reviewer.
4. Once reviewed and approved by Jacky, the PR will be merged into `main`.

---

## 🛡️ Review & Merge Policy
- **No direct commits to `main`**: All code enters `main` exclusively through approved Pull Requests.
- **Lead Reviewer**: **Jacky Mpoka (@Jackyphuti)** reviews all incoming code, verifies build integrity (`npm run build`), and executes merges.
