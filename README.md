# Study Hub MVP

A course project that brings scattered study materials into one easy-to-use interface, with content tailored to a course and professor.

**Status:** Planning / README scaffold. The application has not been implemented yet.  
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

## Proposed MVP experience

1. Select a course and professor.
2. Browse that course's topics.
3. Open a topic's study guide.
4. Expand or collapse its details.
5. Follow references to original course materials.
6. Open related resources when more help is needed.

Start with one of our classes and a small set of representative topics, then add the second class after the full flow works. Materials are ready for ECON 351 (Matthew Hill) and Econ (Kaplin); see [Course materials](#course-materials).

## MVP acceptance checklist

- [ ] A student can select the demo course and see its professor.
- [ ] The displayed guides match that course and professor.
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

The other poster rows capture brainstorming ideas rather than committed MVP requirements. The team marked them “fade”: too impractical for a 2-week build. An AI professor chatbot, practice-test generation, exam prediction, audio review, a past-student help network, and class reviews or study tips from past students are outside the initial scope unless the team explicitly adds them.

## Course materials

Source materials (slides, practice problems, past exams, answer keys, cheat sheets) live in the shared Google Drive folder **[study hub data folder](https://drive.google.com/drive/folders/1fYUtWDLXRGBEBOnFxGWrpoUGts9ep14p)**, not in this repository. The folder is shared with the USC domain; sign in with your usc.edu account.

| Folder | Course / professor | Contents |
| --- | --- | --- |
| [econ351-Matthew Hill](https://drive.google.com/drive/folders/1ICWety-MQo4NQYHWIzczCpawQ5uNzLqm) | ECON 351, Matthew Hill | `slides`, `test1`, `test2`, `test3` (question banks, answer keys, topic lists, cheat sheets) |
| [Econ-Kaplin](https://drive.google.com/drive/folders/1XSvLsIzexQNP-rN0mX--7BVF1C9Bi1M3) | Econ, Kaplin | `slides`, `practice problems`, `practice exams` |

Do not commit course files to git. These materials belong to the professors and include exam answers, so keep them in the Drive folder and reference them from topic guides by link.

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
| Frontend | TODO | |
| Backend, if needed | TODO | |
| Content storage | TODO | |
| Manual vs. AI-assisted content | TODO | |
| Hosting | TODO | |
| Authentication, if needed | TODO | |
| How professor-specific content is selected | TODO | |
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

There is no runnable application yet. This repository currently establishes the project scope and collaboration plan.

Clone the repository:

```bash
git clone https://github.com/YGMssMGY/study-hub-mvp.git
cd study-hub-mvp
```

For a private repository, teammates need repository access and GitHub authentication before cloning.

Fill in the following once the stack is chosen:

- **Prerequisites and versions:** TODO
- **Install command:** TODO
- **Environment variables:** TODO — document names and provide an example file without secrets.
- **Development command:** TODO
- **Test command:** TODO
- **Build / deployment command:** TODO

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
- **Known limitations:** TODO

Suggested walkthrough: choose the course, open a topic, expand and collapse its guide, visit an original source, and open a related resource.

## Open questions

- Which of our two classes (ECON 351 with Hill, or Econ with Kaplin) do we demo first?
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
