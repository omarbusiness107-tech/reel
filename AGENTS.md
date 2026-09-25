# NotebookLM Project Memory

This repository uses the NotebookLM notebook **Reel — Project Knowledge Base** (`03cc1bfa-6547-4f80-96b4-be709357a773`) through the installed NotebookLM MCP. Use the full ID for automated notebook-scoped calls.

NotebookLM is the persistent knowledge layer for stable project context. Before broad repository exploration for a substantial task:

1. Identify the contextual information needed.
2. Query the Reel NotebookLM knowledge base for that specific information.
3. Use the answer to identify likely relevant components and files.
4. Inspect those specific repository files.
5. Expand repository exploration only when necessary.

Do not scan large portions of the repository when the NotebookLM source set already provides sufficient architecture, product, historical, or code-navigation context.

Use NotebookLM primarily for architecture, product requirements, historical decisions, feature behavior, known issues, code navigation, external research, and project conventions. Use targeted prompts, for example: “How is recommendation generation structured, what files implement it, and what constraints exist around multi-word intent?”

Use the repository directly for current source code, exact function behavior, implementation-sensitive details, debugging, dependencies, tests, builds, runtime configuration, and verification of potentially stale NotebookLM information.

Priority rules:

- Current implementation truth: **Repository > NotebookLM > assumptions**.
- Historical decisions, documented requirements, and stable project context: **NotebookLM > rediscovering context from scratch**.
- Never modify implementation solely from a NotebookLM summary when exact current code behavior matters.

## Maintaining memory

The version-controlled sources live in `docs/project-memory/` and are the canonical input to NotebookLM. After a substantial change, update only the affected source when it changes architecture, product behavior, major dependencies/APIs, recommendation behavior, important file responsibilities, decisions, or known issues. Do not rebuild every memory source for a small edit.

- Architecture change → `ARCHITECTURE.md`
- Important file move/responsibility change → `CODE_MAP.md`
- Product behavior change → `PRODUCT_SPEC.md`
- Meaningful decision → `DECISIONS.md`
- Resolved/new issue → `KNOWN_ISSUES.md`

Every project-memory document needs accurate freshness metadata. Never include `.env` contents, API keys, tokens, credentials, private keys, cookies, or passwords in these files or in NotebookLM.
