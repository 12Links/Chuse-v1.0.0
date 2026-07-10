# 12 Links Engineering Workflow

Welcome to the Chuse App repository. This document outlines the standard development workflow, branching strategy, and code review process for the engineering team. 

Following these guidelines ensures our codebase remains stable, our commit history remains readable, and our releases go smoothly.

## 1. Branching Strategy

We use a structured branching model to keep work organized. Never commit directly to the `main` or `develop` branches.

* **`main`**: The production-ready state of the app. Code only enters this branch via tested, approved Pull Requests.
* **`develop`**: The active integration branch. All feature branches are merged here first for testing before a production release.

### Branch Naming Conventions
When creating a new branch, use the following format: `<type>/<ticket-number>-<short-description>`

* **Features:** `feature/CHUSE-123-user-login`
* **Bug Fixes:** `bugfix/CHUSE-124-crash-on-launch`
* **Hotfixes (Urgent production fixes):** `hotfix/CHUSE-125-payment-gateway-down`
* **Chores/Maintenance:** `chore/update-dependencies`

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

## 3. Pull Request (PR) Process

When your feature or bug fix is complete, follow these steps to get it merged:

1. **Pull the latest `develop`:** Ensure your branch is up to date with the latest integration branch to resolve any merge conflicts locally.
2. **Run Tests & Linters:** Ensure the app builds successfully and passes all local linting and testing checks.
3. **Open the PR:** Target the `develop` branch (or `main` if it's a hotfix). 
4. **Fill out the PR Template:** Provide a clear summary of what was changed, how it was tested, and link the relevant issue/ticket number.
5. **Request a Review:** Assign at least one other developer to review your code. 
6. **Address Feedback:** If the reviewer requests changes, make them and push the updates to your branch.
7. **Merge:** Once approved and all CI/CD checks pass, the PR can be merged using the "Squash and merge" option to keep the commit history clean.

## 4. Code Quality & Formatting

* **No commented-out code:** Do not leave large blocks of commented-out code. Let Git track the history.
* **Remove console logs:** Ensure all debugging `console.log()` or `print` statements are removed before opening a PR.
* **Keep PRs small:** Try to limit Pull Requests to a single feature or bug fix. Large PRs are difficult to review and prone to bugs.