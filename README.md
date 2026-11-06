# Study Hub MVP

A course project that brings scattered study materials into one easy-to-use interface, with content tailored to a course and professor.

**Status:** Prototype on the `merge-study-tool` branch, not yet merged or deployed. Built: landing page, a course page for each ECON 351x section (Hill and Kaplan) with its own exams and topics, click-to-start topic briefs, the AI study tool (`/study/`), the Prof. AI tutor (`/prof-ai/` and a side panel on the study tool), and a site-wide style switch (USC / Lockin). Not built: hand-written topic guides, saved progress, accounts. The AI features have not been tested against the live API on the deployed site yet.  
**Working name:** Study Hub (team can rename).  
**Course / section:** TODO  
**Team:** TODO  
**Timeline:** About 2 weeks.  
**Demo / submission date:** TODO

## Problem

Students struggle to find consistent study material in one place across different teachers, courses, and platforms. Reviewing a topic often means switching between lecture materials, assignments, and outside resources.

## Our pick: product scope

This scope follows the **“Our Pick”** row of the team's brainstorming poster.

| Selected feature | Intended behavior | Owner | Status |
| --- | --- | --- | --- |
| Professor-specific content | Show study content relevant to the selected course and professor. | TODO | Planned |
| Compressible study guide per topic | Let students expand topic details and collapse them into a compact overview. | TODO | Planned |
| References to materials in different places | Attach source links to the relevant topic so students can return to original materials. | TODO | Planned |
| Pointers to other resources | Offer related resources for further explanation or practice. | TODO | Planned |
| User-friendly interface | Make courses, topics, guides, and resources easy to find and navigate, organized with tabs. | TODO | Planned |

The poster's **“Scale It”** row is how we narrow this down for a 2-week build:

- Build for specific classes the team is taking, not every course.
- Embed professor personalization into the curriculum interface.
- Reference past lessons from the original course materials.
- Point students to other online resources.
- Organize content with tabs.

**Interpretation to confirm:** “Compressible” is initially treated as expandable/collapsible topic guides. The team should decide whether it also means shortening summaries or hiding material once a student has mastered a topic, an idea from the poster's “Steal the Magic” row.

Professor-specific content means alignment with the professor's course materials and emphasis. How that content is prepared—manually, with AI assistance, or both—is a team decision.

## Current experience

1. On the landing page, pick a class: ECON 351x with Matthew Hill or with Erin Kaplan.
2. The course page lists that professor's topics, grouped by exam (13 topics each, over three exams; Kaplan's Exam 3 is in finals week).
3. Click a topic. The study tool opens and builds a session (topic notes, practice questions, review notes) from that topic's short brief, with no upload needed.
4. Or open the study tool and upload your own PDF, Word or text files.
5. Ask Prof. AI (its own page, or the "Ask Prof. AI" side panel on the study tool) to explain a topic or quiz you, in that professor's framing.
6. Follow the "Straight from the source" links on each course page to the original slides and practice sets in Google Drive.
7. Use the Style switch in the header to change the whole site between **USC** (cardinal and gold, the Study Hub look) and **Lockin** (plain white, the study tool's own look). The choice is remembered in the browser.

The original plan below (expandable topic guides with per-topic source references and related resources) is only partly covered: topics link to briefs and AI sessions rather than hand-written guides.

## MVP acceptance checklist

- [x] A student can select the demo course and see its professor.
- [x] The displayed guides match that course and professor (each section has its own exams, topics and briefs).
- [ ] Each demo topic has a readable study guide.
- [ ] Topic details can be expanded and collapsed.
- [ ] Each demo guide includes clearly labeled source references.
- [ ] Each demo topic offers relevant additional resources.
- [ ] Links open the intended materials.
- [ ] The main flow is understandable without a walkthrough.
- [ ] Missing content and unavailable resources have clear messages.
- [ ] A teammate can follow the setup instructions and run the demo.

These are proposed implementation checks for the selected features; the team can refine them.

## Scope boundaries

The other poster rows capture brainstorming ideas rather than committed MVP requirements. The team marked them “fade”: too impractical for a 2-week build. Two of them have since been added: an AI professor chatbot (Prof. AI) and practice-question generation (the study tool and Prof. AI's quiz mode). Exam prediction, audio review, a past-student help network, and class reviews or study tips from past students remain out of scope.

## Course materials

Source materials (slides, practice problems, past exams, answer keys, cheat sheets) live in the shared Google Drive folder **[study hub data folder](https://drive.google.com/drive/folders/1fYUtWDLXRGBEBOnFxGWrpoUGts9ep14p)**, not in this repository. The folder is shared with the USC domain; sign in with your usc.edu account.

| Folder | Course / professor | Contents |
| --- | --- | --- |
| [econ351-Matthew Hill](https://drive.google.com/drive/folders/1ICWety-MQo4NQYHWIzczCpawQ5uNzLqm) | ECON 351x, Matthew Hill | `slides`, `test1`, `test2`, `test3` (question banks, answer keys, topic lists, cheat sheets) |
| [Econ-Kaplin](https://drive.google.com/drive/folders/1XSvLsIzexQNP-rN0mX--7BVF1C9Bi1M3) | ECON 351x, Erin Kaplan (the folder name misspells it) | `slides`, `practice problems`, `practice exams` |

Do not commit the course files themselves (PDF, PPTX, DOCX) to git. These materials belong to the professors and include exam answers, so keep them in the Drive folder and reference them from topic guides by link.

`public/materials/` holds a short Study Hub–written brief for each course-page topic (key ideas, formulas and a worked example, condensed from the topic lists and course notes, not copied slides). Clicking a topic sends its brief to the study tool, which builds the session. Ch 12 and 13 of Kaplan's course have no slides in Drive yet, so their briefs are general overviews.

## Team and responsibilities

Add one row per teammate. Claim an area and link the issue or pull request where you are working.

| Name / GitHub handle | Responsibility | Current task | Issue / PR |
| --- | --- | --- | --- |
| TODO | TODO | TODO | TODO |
| TODO | TODO | TODO | TODO |
| TODO | TODO | TODO | TODO |
| TODO | TODO | TODO | TODO |

Suggested areas: interface/design, course content, data/backend, integration/testing. These are options, not assigned roles.

## Technical decisions

| Decision | Team choice | Notes / owner |
| --- | --- | --- |
| Frontend | Plain HTML/CSS/JS, no framework | Two site-wide styles: USC (cardinal/gold, Libre Caslon Text + Inter; `styles.css`) and Lockin (`classic.css`, `study/styles.css`), switched by `theme.js` |
| Backend, if needed | One Node API (`api/study.js` + `lib/`) | Calls the OpenAI API; key stays on the server |
| Content storage | Static files in `public/materials/` | One brief per topic plus `topics.json`; course files stay in Drive |
| Manual vs. AI-assisted content | Both | Briefs are written summaries; sessions and Prof. AI answers are AI-generated from them |
| Hosting | Vercel | Deploys from `main`; `vercel.json` sets the build and security headers |
| Authentication, if needed | Shared access code | `APP_ACCESS_CODE` gates the AI features; no student accounts |
| How professor-specific content is selected | By page | Each course page links its own topics; Prof. AI takes `?prof=hill` or `?prof=kaplan` |
| How guide compression works | TODO | |

### Proposed content structure

Use this as a discussion starting point, independent of the eventual tech stack:

- **Course:** title, course identifier, professor, description.
- **Topic:** course, title, short overview, detailed study guide.
- **Source reference:** topic, title, URL or file location, source type, optional page or section.
- **Related resource:** topic, title, URL, short explanation of why it helps.

## Content template

Copy this section for each demo topic, or move the completed entries into the chosen content store.

### Topic: TODO

- **Course:** TODO
- **Professor:** TODO
- **Learning objective:** TODO
- **Short overview:** TODO
- **Detailed guide:** TODO
- **Original materials:** TODO — include title, location/link, and page/section where relevant.
- **Related resources:** TODO — include link and why it is useful.
- **Prepared / reviewed by:** TODO

## Getting started

The site is static HTML and CSS plus one small Node API for the study tool:

- `public/index.html` is the landing page and `public/courses/` holds the two course pages. `public/styles.css` is the USC style, `public/classic.css` the Lockin overrides, and `public/theme.js` / `theme.css` the header style switch.
- `public/study/` is the study tool (upload files → topic notes, practice questions, review notes). `autostart.js` starts a session when a course page links to `/study/?topic=<id>`; `hub.css` gives the tool the USC style.
- `public/materials/` holds the topic briefs and `topics.json`, which maps each topic id to its brief.
- `public/prof-ai/` is the Prof. AI tutor page. `profs.js` holds each professor's course outline, and `sidebar.js` / `sidebar.css` add it as a side panel on the study tool.
- `api/study.js` handles both tools (study sessions, plus `tutor-chat` and `tutor-quiz` for Prof. AI) and uses `lib/` to talk to the OpenAI API.
- `server.mjs` serves `public/` and the API locally. On Vercel, `vercel.json` builds `public/` into `dist/` and deploys `api/study.js` as a function.

Clone the repository:

```bash
git clone https://github.com/YGMssMGY/study-hub-mvp.git
cd study-hub-mvp
```

For a private repository, teammates need repository access and GitHub authentication before cloning.

Fill in the following once the stack is chosen:

- **Prerequisites and versions:** Node.js 22. (Pages only: Python 3 is enough, but the study tool's AI features need Node.)
- **Install command:** None; there are no dependencies.
- **Environment variables:** copy `.env.example` to `.env.local` and fill in `OPENAI_API_KEY` (`OPENAI_MODEL` defaults to `gpt-4.1-mini`). On Vercel set `OPENAI_API_KEY`, `APP_ACCESS_CODE` (required) and `APP_SECRET` (recommended) under Settings → Environment Variables, then redeploy. Never commit keys or paste them into chats or issues.
- **Development command:** `npm start`, then visit http://127.0.0.1:3000. Pages only: `python3 -m http.server 8000 --directory public`.
- **Test command:** `npm test`
- **Build / deployment command:** `npm run build`. Import the repo in Vercel with the root directory left as the repo root; `vercel.json` handles the rest.

## How we contribute

1. Add your name and claim a responsibility in the team table.
2. Create an issue describing the task and what “done” means.
3. Create a branch, such as `docs/team-plan` or `feature/topic-guides`.
4. Make a focused change and update relevant documentation.
5. Open a pull request with a short description and verification notes.
6. Ask a teammate to review before merging.

Keep open decisions marked **TODO** until the team agrees.

## Milestones

| Milestone | Deliverable | Owner | Target date |
| --- | --- | --- | --- |
| Define | Confirm scope, demo course, team roles, and stack | TODO | TODO |
| Design | Sketch the course → topic → guide flow | TODO | TODO |
| Build | Implement the selected features with sample content | TODO | TODO |
| Integrate | Connect the full flow and check references | TODO | TODO |
| Demo | Verify setup, rehearse the demo, and document limitations | TODO | TODO |

## Demo plan

- **Demo course and professor:** TODO
- **Demo topics:** TODO
- **Presenter(s):** TODO
- **Demo link / recording:** TODO
- **Known limitations:** the AI features need the server and an access code (the Python preview shows pages only); Kaplan's Ch 12 and 13 briefs are general overviews until slides are in Drive; Prof. AI ignores uploaded images; no saved progress or accounts.

Suggested walkthrough: choose the course, open a topic, expand and collapse its guide, visit an original source, and open a related resource.

## Open questions

- Which professor's section of ECON 351x (Hill or Kaplan) do we demo first?
- Is the shared access code enough, or do we need per-student sign-in before sharing the site widely?
- Does “compressible” mean collapse/expand, shorter summaries, mastery-based hiding, or a combination?
- Who will prepare and check the study content?
- Which source formats do we need for the MVP?
- Do we need saved progress or accounts for the course demo?
- What are the course submission requirements and deadline?

## Project links

- Course materials: [study hub data folder](https://drive.google.com/drive/folders/1fYUtWDLXRGBEBOnFxGWrpoUGts9ep14p) (Google Drive)
- Design / wireframes: TODO
- Task board: TODO
- Course rubric: TODO
- Shared team notes: TODO
