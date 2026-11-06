# Your GitHub → Vercel setup

The code is in `/Users/davidxu/Documents/cspractice/study-tool`. Start by opening that folder in VS Code. The AI key is in the hidden `.env.local` file and is excluded by `.gitignore`.

The existing private [Sites website](https://study-desk-davidxu.davd919319.chatgpt.site) now runs live uploads and AI grading, including written sample answers. Its API key is stored as a hosted secret, and ChatGPT sign-in controls access. No study access code is needed there. The Vercel steps below are for hosting your own copy from GitHub.

## 1. Create an empty GitHub repository

1. Sign in at [GitHub](https://github.com/new).
2. Name the repository `study-tool` (or a name you prefer).
3. Choose **Private** while you’re developing it. You can make it public later.
4. Leave **Add a README**, **.gitignore**, and **license** unchecked, because this folder already contains project files.
5. Click **Create repository** and keep the page open. Copy the HTTPS URL, such as `https://github.com/YOUR_USERNAME/study-tool.git`.

## 2. Sign in from your terminal

The GitHub CLI is already installed on this Mac, but its existing login needs refreshing. In the VS Code terminal, run:

```sh
gh auth login --hostname github.com --git-protocol https --web
```

Follow the browser sign-in instructions. If asked to configure Git authentication, choose yes. Never use your OpenAI API key as a GitHub password.

## 3. Upload the project

The preview workflow has already initialized this folder as a Git repository. Run each command in order:

```sh
cd /Users/davidxu/Documents/cspractice/study-tool
git status --short
git check-ignore .env.local
```

The last command should print `.env.local`. This confirms Git will exclude the key file. Now commit the code:

```sh
git add .
git commit -m "Create study tool prototype"
```

If Git says there is nothing to commit, that is fine: the preview workflow already saved the latest source. If Git asks for your identity, set your name and GitHub email locally for this repository and retry the commit:

```sh
git config user.name "Your Name"
git config user.email "YOUR_GITHUB_EMAIL"
```

Add your own GitHub repository as a remote named `github`, replacing the example URL:

```sh
git remote add github https://github.com/YOUR_USERNAME/study-tool.git
git push -u github main
```

If you already added a `github` remote, update it with `git remote set-url github YOUR_REPOSITORY_URL` instead. Refresh the GitHub page: `public`, `api`, `lib`, `README.md`, and `vercel.json` should be visible. `.env.local` should **not** be visible.

## 4. Host the working website on Vercel

1. Sign in to [Vercel](https://vercel.com/new) using GitHub.
2. Choose **Import Git Repository**, select your repository, and click **Import**.
3. Use **Other** as the framework preset. Keep the root directory as the repository root. If you uploaded a containing folder instead, set the root to `study-tool`.
4. The included `vercel.json` supplies the build command `npm run build`, output directory `dist`, API duration, and headers. No dependencies need installing.
5. Open **Environment Variables** before deploying and add:

| Variable | Value |
| --- | --- |
| `OPENAI_API_KEY` | Your API key from `.env.local`. Paste just the value. |
| `OPENAI_MODEL` | `gpt-4.1-mini` (or a compatible model your project supports). |
| `APP_ACCESS_CODE` | A private code you choose for prototype testers. Required to unlock the deployed AI endpoint. |
| `APP_SECRET` | Recommended: a long random secret, kept stable so study backups keep working. |

To generate an app secret in a terminal, run `openssl rand -hex 32` and paste the result into Vercel. You do not need to send it in chat or commit it.

6. Click **Deploy**. Open the deployment URL when Vercel reports success.
7. Open **Settings** in the website, enter your `APP_ACCESS_CODE`, and save.
8. Try a small PDF or text file. Real AI will work once your API project has available credits.

Vercel hosts both the page and `/api/study`. GitHub Pages alone cannot run this backend. No Supabase project is needed for this version.

## 5. Publish future changes

```sh
git add .
git commit -m "Describe your change"
git push github main
```

Vercel will build and deploy new pushes automatically. After changing environment variables in Vercel, redeploy to apply them.

## Troubleshooting

- **Can’t see `.env.local`:** VS Code → Cmd+P → paste the full file path. In Finder, Cmd+Shift+. toggles hidden files.
- **AI credits error:** Check [OpenAI API billing](https://platform.openai.com/settings/organization/billing/overview). A `credit_balance_exhausted` message comes from the API account’s available credits, rather than the website.
- **AI works locally but not online:** Set the same variables in Vercel and redeploy. Enter the tester code in the website’s Settings.
- **Uploaded deck is too large:** Export selected slides as a smaller PDF. The current combined limit is 3 MB.
- **Old backup can’t be verified:** Keep `APP_SECRET` stable across local and deployed environments, or start a new study session.
- **Build fails:** Confirm the project root contains `package.json`, `scripts`, `public`, `api`, and `lib`, then use Node.js 22.
- **Changes don’t appear:** Check the latest Vercel deployment status and refresh the deployed URL.

Official references: [GitHub: adding local code](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github), [Vercel Git deployments](https://vercel.com/docs/git), [Vercel environment variables](https://vercel.com/docs/environment-variables).
