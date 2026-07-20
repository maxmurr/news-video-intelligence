<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes: APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- opensrc:start -->

## Source Code Reference

Source code for dependencies is available in `opensrc/` for deeper understanding of implementation details.

See `opensrc/sources.json` for the list of available packages and their versions.

Use this source code when you need to understand how a package works internally, not just its types/interface.

### Fetching Additional Source Code

To fetch source code for a package or repository you need to understand, run:

```bash
npx opensrc <package>           # npm package (e.g., npx opensrc zod)
npx opensrc pypi:<package>      # Python package (e.g., npx opensrc pypi:requests)
npx opensrc crates:<package>    # Rust crate (e.g., npx opensrc crates:serde)
npx opensrc <owner>/<repo>      # GitHub repo (e.g., npx opensrc vercel/ai)
```

<!-- opensrc:end -->

## Cursor Cloud specific instructions

Single Next.js 16 app ("Broadcast Desk"): upload a news MP4, an AI pipeline extracts transcript/stories/headlines/frames, then chat grounded in the footage. Standard scripts live in `package.json` (`dev`, `lint`, `typecheck`, `test`, `build`, `db:*`).

- Dependencies are refreshed on startup by the update script (`pnpm install`). `ffmpeg`/`ffprobe` are required by the media pipeline (`lib/video.ts`) and are already present in the base image.
- Local DB is SQLite via libsql/drizzle at `./sqlite.db` (gitignored, so absent on a fresh VM). Run `pnpm db:push` once before running the app to create/sync the schema. Not needed for `pnpm test` (tests bind mock repositories via `NODE_ENV=test` in the DI modules, so no DB or AI key is required).
- The AI pipeline and chat use the Vercel AI Gateway (`ai` SDK, Google Gemini models in `lib/models.ts`) and require the `AI_GATEWAY_API_KEY` secret. Without it, upload + broadcast library listing still work, but the pipeline fails at the transcribe stage with `GatewayAuthenticationError` and the broadcast page shows "Analysis failed". `pnpm evals` also needs this key.
- Uploaded videos land in `public/uploads/`, extracted frames in `public/frames/` (both gitignored). The pipeline is orchestrated in-process by the `workflow` package via `app/api/videos` and `app/api/pipeline`; no separate worker process is needed for `pnpm dev`.
