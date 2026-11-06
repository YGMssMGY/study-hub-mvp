# Prototype verification

Verified on November 5, 2026 (Pacific time).

- JavaScript syntax, static build, and portable Sites Worker build: passed.
- Automated behavioral tests: 21 passed, 0 failed.
- Live OpenAI analysis of a synthetic lecture file: passed; generated 3 topics and 11 initial questions.
- Live endpoint grading: accepted the correct multiple-choice option and rejected an incorrect option.
- Live AI grading: accepted a correct typed response.
- Live follow-up generation: passed; generated 5 additional questions for the requested concept.
- Live combined PDF and PPTX upload: accepted both files and generated 12 questions.
- Client responses omit the answer key and grading explanation until an answer is submitted.
- `.env.local` is ignored by Git. The API key was checked against tracked source without printing it; no key appeared in tracked source.
- The Sites website was upgraded to a live backend and published successfully with its API key stored as a hosted secret.
- Hosted endpoint verification passed: upload analysis generated 6 questions with structured chapter/section/concept notes and nested outlines.
- Hosted grading accepted a correct written answer and rejected an incorrect one. Written sample answers were also graded by AI.
- Hosted follow-up generation produced 5 additional questions for the requested concept.
- The backend uses standard Web Crypto and can still read encrypted study sessions from the previous Node crypto implementation.
- The layout uses a full-height notes document on the left and practice above to-do on the right, with equal-width columns, Arial, and larger bold panel titles.

The main live smoke test used text input, with a separate combined-upload check using small synthetic PDF and PPTX lecture files. Generated source labels and document coverage still need human review. The browser automation host was unavailable, so interactive visual QA could not be completed. Vercel configuration is included, but the user will create their own GitHub repository and Vercel deployment.

To repeat the automated checks, run `npm test`, `npm run build`, and `npm run build:sites`. To repeat the paid local integration check, start the local server, then run `node --env-file-if-exists=.env.local scripts/smoke-ai.mjs` in a second terminal.
