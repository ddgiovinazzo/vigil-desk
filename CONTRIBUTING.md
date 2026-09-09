# Contributing to VigilDesk — Engineering & Team Workflow

Thank you for your interest in contributing to **VigilDesk**! We maintain high engineering standards to ensure code quality, test reliability, and production safety across our autonomous agent and multi-tenant RAG services.

Please follow these guidelines when developing, opening pull requests, and contributing.

---

## Repository Setup & Standards
- **Branch Protection:** Production-ready code lives on `main`. Direct pushes to `main` are disabled; all changes require an approved pull request.
- **Clean Configuration:** Secrets and API keys must **never** be committed. Use `.env.example` as a template for local environment variables.
- **Documentation:** Documentation and architecture specifications (`docs/`, `README.md`) must be kept up to date alongside functional changes.

## Branching Strategy — GitHub Flow
We adopt a lightweight, trunk-based GitHub Flow:

```
main                 ← Production-ready, protected
 └─ feature/<name>   ← Short-lived branch per feature or bug fix
```

- Branch names should reflect the work: `feature/multi-tenant-sync`, `fix/kb-routing-classifier`, `chore/add-ci`.
- Keep branches small and short-lived (merge within 1–2 days) to avoid divergence and merge conflicts.
- Rebase or merge `main` into your feature branch regularly.

## Commit Conventions
We strictly follow [Conventional Commits](https://www.conventionalcommits.org/) to maintain a clean, semantic changelog:

```bash
feat: add dynamic tenant branding and color extraction
fix: correct query expansion logic in routing classifier
chore: update GitHub Actions CI pipeline
docs: document agent evaluation benchmark methodology
test: add test coverage for agent tool execution guardrails
refactor: isolate model generation behind unified LLM provider interface
```

*Rule of thumb:* Keep commits focused and atomic. If a commit message requires the word "and," consider splitting it into two commits.

## Pull Request Workflow
1. **Use the PR Template:** Fill out the checklist and description in `.github/PULL_REQUEST_TEMPLATE.md`.
2. **Atomic Changes:** Keep PRs concise and focused (ideally < 400 lines changed) to ensure thorough and efficient code reviews.
3. **Automated Checks:** All CI workflows (backend tests, frontend tests, linting, type checks) must pass before merging.
4. **Code Review Standards:**
   - Reviewers verify architecture alignment, security (no credentials or insecure evals), test coverage, and edge cases.
   - PR discussions should be constructive, specific, and actionable.
5. **Issue Linking:** Link related issues using GitHub keywords (e.g., `Closes #42`).

## Continuous Integration & Testing
- **CI Pipeline:** Automated GitHub Actions workflows run on every pull request to execute `pytest` and `vitest`.
- **Hermetic Unit Tests:** CI does not require a live AnythingLLM or local Ollama instance. External services and model responses are mocked or stubbed.
- **Backend Tests:** Verify tool functions, argument schema validation, and agent loop termination/guardrails (`pytest server/tests`).
- **Frontend Tests:** Ensure UI components, state management, and accessibility standards pass (`npm test` in `client/`).

## Definition of Done
A task or pull request is considered complete when:
- [x] Code passes all automated CI checks (unit tests, linting, build).
- [x] Code is reviewed and approved by at least one peer.
- [x] Verified locally with no regressions introduced.
- [x] Relevant tests and documentation are included.
- [x] Zero secrets or unintended configuration committed.

## Quick Branching Workflow
```bash
# Start a new feature or fix
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: your concise commit message"
git push -u origin feature/your-feature-name

# Open PR, pass CI, merge, and clean up
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```