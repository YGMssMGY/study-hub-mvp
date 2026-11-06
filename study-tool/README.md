# Study tool

A subject-independent study page for a larger platform: material uploads, a topic checklist, tabbed practice, mastery tracking, and review notes. The interface has no logo or product branding; the subject title is centered above the workspace.

## Start here

1. Open this **study-tool** folder in VS Code (File → Open Folder).
2. Use Node.js 22 or later. No third-party packages are required.
3. Copy `.env.example` to `.env.local` if the local file does not already exist.
4. Set `OPENAI_API_KEY` in `.env.local`. Keep this file private.
5. In the project terminal, run `npm start` and open **http://127.0.0.1:3000**.

The local file has already been created for this checkout. In VS Code, **Cmd+P**, then `.env.local`, opens it even if Finder hides dotfiles. Restart the server after changing environment variables.

On this Mac, Node is bundled with ChatGPT, so this also runs without installing Node separately:

```sh
cd /Users/davidxu/Documents/cspractice/study-tool
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --env-file-if-exists=.env.local server.mjs
```

If port 3000 is already in use by the preview server, open that URL. Stop your own terminal server with Ctrl+C before restarting. If you install Node.js, use `npm start` normally.

## Try it

- Choose **Open sample** to inspect the study flow. Every written answer, including sample questions, is graded by AI and requires the server API key.
- For real AI, upload one to four PDF, PPTX, TXT, or Markdown files, up to **3 MB combined**.
- Answer multiple-choice questions or type free responses. Multiple choice is checked on the server; written answers use AI grading.
- Two different correctly answered questions mark a subtopic mastered. It leaves the checklist with a soft green highlight. Its notes and examples remain available.
- Generate more practice to focus on unfinished concepts. Once every concept is mastered, generation revisits the full set.
- Review notes appear after each completed problem. Incorrect answers add clarifications. Open completed examples from a note.
- Export notes as Markdown, or use Print / Save as PDF. Download/restore a JSON study backup in Settings.

The built-in Sites version runs a live backend with uploads, question generation, and AI grading. It uses a portable Worker built from the same backend as the local and Vercel versions. The Site remains private and uses its hosted secret; `.env.local` is only for local development. Each hosting origin has separate browser storage.

## Put it on GitHub and Vercel

Follow [SETUP.md](SETUP.md) for the exact steps. Upload the contents of **this folder**, not your entire cspractice folder. GitHub stores source; Vercel runs the website and its API. Supabase is not needed for the current browser-only prototype.

## Environment variables

| Name | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Required for real material analysis and written-answer grading. Server only. |
| `OPENAI_MODEL` | Defaults to `gpt-4.1-mini`; configurable for an account-supported model with file inputs and structured outputs. |
| `APP_ACCESS_CODE` | Required on Vercel. Choose a private tester code and enter it in the app’s Settings. This is a prototype gate, not user authentication. |
| `APP_SECRET` | Optional stable random secret used to encrypt study/answer tokens. Defaults to a derived API-key secret. Changing it (or the API key when no separate secret is configured) invalidates saved AI sessions. |
| `PORT` | Local server port; defaults to 3000. |

API usage is billed to the API project. A ChatGPT subscription is separate from API credits. If the service reports exhausted credits, fix API billing before testing uploads again.

## Architecture

```text
public/             Browser interface, state, sample data, responsive styles
api/study.js        Vercel-compatible server endpoint: analyze / grade / generate
lib/ai.mjs          OpenAI Responses API, strict JSON schemas, error handling
lib/study.mjs       Material analysis, grounded question generation, grading
lib/security.mjs    Upload validation, encrypted server tokens, access checks
lib/schema.mjs      Shared AI response contracts and runtime validation
server.mjs          Local static server using the same API handler
scripts/            Build, syntax checks, optional live AI smoke test
tests/              Automated behavioral tests
vercel.json         Vercel deployment and security headers
```

File bytes are sent inline to OpenAI; this app does not persist original uploads or call the OpenAI Files API. Requests use `store: false`. OpenAI’s own data handling still applies. Generated topics, notes, encrypted session tokens, typed drafts, and progress are saved in localStorage. The access code stays in sessionStorage. The API key is never sent to the browser or committed to Git. Review notes use a document layout: chapter → section → underlined concept → nested bullets, in Arial. Notes occupy the left half; practice and to-do share the right half.

Follow-up generation uses a sealed summary and topic notes from the initial analysis, not the full original document. Answer keys and rubrics are encrypted in opaque tokens so the backend can remain stateless. Multiple-choice keys do not appear in client JSON. This is a personal study tool rather than an exam platform; browser progress is user-controlled.

## Checks

```sh
npm test
npm run build
npm run build:sites
```

Tests cover upload validation, token tampering, hidden answer keys, multiple-choice grading, typed-answer API requests, schema validation, topic generation, mastery, and adaptive question ordering. The live smoke test uses synthetic lecture notes and makes several paid API requests:

`npm run build` creates static assets for Vercel (which deploys `api/study.js` separately). `npm run build:sites` embeds browser assets and the shared backend in `dist/server/index.js` for Sites. Never place an API key in either build output.

```sh
# Start the server first, then in a second terminal:
node --env-file-if-exists=.env.local scripts/smoke-ai.mjs
```

## Prototype boundaries

- No video processing, user accounts, cloud file storage, cross-device sync, or direct Google Docs / Word integration.
- PDF inputs include text and page images. PPTX inputs extract text; for diagrams or scanned slides, export them to PDF first.
- The 3 MB combined upload cap keeps inline base64 requests below Vercel’s 4.5 MB function limit. Larger uploads should use direct-to-storage uploads (for example, Supabase Storage) and a server processing job.
- The first study set is intentionally compact (up to six subtopics). Large materials should be split into chapters. A production version needs chunked ingestion, retrieval, and a durable question bank for comprehensive coverage.
- AI grading and source references need review. Source labels are model-provided and may be imperfect. Original problem screenshots are not captured; completed examples preserve the extracted prompt, answer, and feedback.
- The in-memory rate limit is best-effort per server instance. Before broad public access, replace the shared access code with authentication and add distributed rate limits and per-user usage budgets.

## References

- [OpenAI file inputs](https://developers.openai.com/api/docs/guides/file-inputs)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Vercel function limits](https://vercel.com/docs/functions/limitations)
