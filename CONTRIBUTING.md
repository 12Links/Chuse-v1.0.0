# 12 Links Engineering Workflow & Team Branching

Welcome to the Chuse App repository. This document outlines the standard development workflow, group branching strategy, and code review process for the engineering team. 

Following these guidelines ensures our codebase remains stable, our commit history remains readable, and our releases go smoothly.

---

## 1. Team Groups & Branching Strategy

Each team has a dedicated group branch on GitHub. Refer to [TEAM.md](TEAM.md) for full team roster details.

* **`main`**: The production-ready state of the app. Code only enters this branch via reviewed, approved Pull Requests merged by **Jacky Mpoka (@Jackyphuti)**.
* **`group/1-data-scrapers`**: Group 1 (Tebello Mohohoma & Sello Aphane)
* **`group/2-backend-optimizer-ai`**: Group 2 (Nkosinathi Ngwenya & Lesego Mageza)
* **`group/3-core-shopping-ui`**: Group 3 (Savuzwa Mpayipheli & Jacky Mpoka)
* **`group/4-mobile-auth-platform`**: Group 4 (Lwandiso George)

### Feature Branch Naming Conventions
When branching off your group branch, use the format: `group/<group-number>/<short-description>` or `feature/<member>/<feature-name>`

* **Features:** `feature/mat6577/woolies-scrapers`
* **Bug Fixes:** `bugfix/cart-realtime-sync`
* **Chores:** `chore/update-dependencies`

---

## 2. Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard. This makes it easy to read the project history and automate release notes. 

Structure your commits like this: `type: short description`

* `feat:` A new feature (e.g., `feat: add Google OAuth login`)
* `fix:` A bug fix (e.g., `fix: resolve memory leak on home screen`)
* `docs:` Documentation changes only (e.g., `docs: update setup instructions in README`)
* `style:` Formatting, missing semi-colons, etc; no code change
* `refactor:` Code changes that neither fix a bug nor add a feature
* `test:` Adding missing tests or correcting existing tests
* `chore:` Updating build tasks, package manager configs, etc.

---

## 3. Pull Request (PR) & Review Process

All code must be merged via Pull Requests reviewed by **Jacky Mpoka (@Jackyphuti)**:

1. **Pull the latest `main`:** Ensure your group/feature branch is up to date with `main` to resolve any merge conflicts locally:
   ```bash
   git pull origin main
   ```
2. **Run Tests & Builds:** Verify the app builds cleanly with zero errors:
   ```bash
   npm run build
   ```
3. **Open the PR:** Target the `main` branch on GitHub.
4. **Assign Reviewer:** Set `@Jackyphuti` as the reviewer on GitHub.
5. **Address Feedback:** If changes or revisions are requested, commit to your branch and update the PR.
6. **Merge:** Once approved, Jacky will merge the PR into `main`.

---

## 4. Code Quality & Formatting

* **No commented-out code:** Do not leave large blocks of commented-out code. Let Git track the history.
* **Remove console logs:** Ensure all debugging `console.log()` or `print` statements are removed before opening a PR.
* **Keep PRs small & focused:** Limit Pull Requests to clear, modular milestones. Large monolithic PRs are difficult to review and prone to merge conflicts.