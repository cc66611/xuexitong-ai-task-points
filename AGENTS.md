# Repository instructions

- This is the task-point-only derivative of xuexitong-ai-assistant. Read `docs/AGENT_GUIDE.md`, `docs/USER_GUIDE.md`, and `NOTICE.md` before changing behavior.
- Preserve current local settings and user changes. Never commit or package `src/local/`, `local/`, credentials, real course data, logs, `output/`, `artifacts/`, or `node_modules/`.
- Keep task-point-only mode enforced in every generated userscript. Completed tasks take priority; no full-score retries. Do not replace task markers with title heuristics.
- Do not remove answer validation or overwrite manual work to suppress errors. Keep visible educational images, shared composite context, and exact control mappings.
- Use `npm run build`, `npm test`, and targeted browser checks. Verify the user's actual installed version and read-only preview before claiming a real-page issue is fixed. Do not submit coursework for testing.
- Update `package.json.taskPointsVersion` and `src/release.json.localVersion` together. Preserve upstream provenance and third-party licenses; do not invent a project-wide license.
- `README.md` is intentionally short. Detailed instructions belong in the two guides. Keep the archived upstream documents available as reference.
