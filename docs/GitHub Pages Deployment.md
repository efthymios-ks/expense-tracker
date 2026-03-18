# GitHub Pages Deployment

The deploy pipeline (`deploy.yml`) triggers on every push to `master`. It injects secrets into `src/config.js` before uploading the `src/` folder as a GitHub Pages artifact.

## How it works

`src/config.js` contains placeholder tokens:

```js
window.CONFIG = {
  SPREADSHEET_ID: "%%SPREADSHEET_ID%%",
  GOOGLE_CLIENT_ID: "%%GOOGLE_CLIENT_ID%%",
  ALLOWED_EMAILS: "%%ALLOWED_EMAILS%%".split(",").map((e) => e.trim()),
};
```

The pipeline replaces each `%%TOKEN%%` with the corresponding GitHub secret using `sed` before deploying. The file is never committed with real values.

## Required secrets

Set these in **GitHub → repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Where to find it | Example |
|---|---|---|
| `SPREADSHEET_ID` | Google Sheets URL between `/d/` and `/edit` | `1YMIlSlGmdQ55QAh...` |
| `GOOGLE_CLIENT_ID` | Google Cloud → APIs & Services → Credentials → your OAuth client | `662277135955-opt...apps.googleusercontent.com` |
| `ALLOWED_EMAILS` | Comma-separated list of emails allowed to log in | `user@gmail.com,other@gmail.com` |

## Enable GitHub Pages

1. Go to **repo → Settings → Pages**
2. Under **Source**, select **GitHub Actions**
3. Push to `master` — the workflow deploys automatically

## Local development

Use `src/config.local.js` for local values. It is gitignored so real credentials are never committed.
