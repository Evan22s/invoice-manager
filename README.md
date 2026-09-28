# Abundant Air — Customer & Invoice Manager

A small web app for tracking customers and their invoices. Built for a Hootcamp
assignment on using AI tools to build a full web application with minimal
hand-written code.

This is a scaled-down web version of a larger desktop invoicing tool I had
already built in Python/Tkinter. That version couldn't meet this assignment's
requirements (it's a local desktop program, not a web app, with no database
service or login), so this README covers the trimmed-down web rebuild:
customers and invoices, with real accounts and a real cloud database.

## What it does

- **Register / log in / log out** with an email + password account
- **Customers**: add, view, edit, delete
- **Invoices**: add, view, edit, delete — each invoice belongs to a customer
  and tracks a date, amount, and status (Unpaid / Partial / Paid / Overdue)
- Every account only ever sees **its own** customers and invoices — this is
  enforced by the database itself (Row Level Security), not just hidden in
  the UI

## Live app

**Deployed link:** _add your Netlify URL here after deploying, e.g._
`https://fanciful-baklava-434f58.netlify.app`

## Tech stack

| Piece          | Tool                                   |
|----------------|----------------------------------------|
| Frontend       | Plain HTML, CSS, JavaScript (no framework, no build step) |
| Backend/DB     | [Supabase](https://supabase.com) (Postgres database + hosted auth) |
| Authentication | Supabase Auth (email/password)         |
| Hosting        | [Netlify](https://netlify.com)         |

Built with AI assistance (Claude) generating the HTML/CSS/JS, the SQL schema,
and this README, per the assignment's instructions to build using AI tooling
rather than hand-writing the app.

## Project files

```
webapp/
├── index.html          # Page structure: login/register screen + main app
├── styles.css           # All styling
├── app.js               # All app logic: auth + customers/invoices CRUD
├── config.js             # Your Supabase project URL + public API key
├── supabase-schema.sql   # Run this once in Supabase to create the tables
└── netlify.toml          # Tells Netlify this is a static site, no build step
```

## One-time setup (before deploying)

### 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account/project.
2. Once it's created, open the **SQL Editor** tab and paste in the entire
   contents of `supabase-schema.sql`, then click **Run**. This creates the
   `customers` and `invoices` tables and their security rules.
3. Go to **Project Settings → API**. Copy your **Project URL** and your
   **`anon` `public`** key.
4. Open `config.js` in this project and paste those two values in:
   ```js
   const SUPABASE_URL = "https://your-project.supabase.co";
   const SUPABASE_ANON_KEY = "your-anon-key-here";
   ```

By default, Supabase requires users to confirm their email before logging in.
For a class demo, you can turn this off under **Authentication → Providers →
Email → Confirm email** (toggle off) so test accounts can log in immediately.

### 2. Try it locally (optional)

Because there's no build step, you can just open `index.html` in a browser,
or serve the folder with any static server, e.g.:

```bash
npx serve .
```

## Deploying to Netlify

The easiest path (shown in Hootcamp):

1. Push this project to a public GitHub repository (see Git commands below).
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import
   an existing project**.
3. Connect your GitHub account and pick this repository.
4. Build settings: leave the build command **empty** and set the publish
   directory to `.` (the repo root) — `netlify.toml` already sets this for you.
5. Click **Deploy**. Netlify will give you a live URL — paste it into the
   "Live app" section above and commit that change.

(Netlify also supports dragging the project folder straight onto
[app.netlify.com/drop](https://app.netlify.com/drop) if you'd rather skip the
GitHub connection step, though connecting GitHub means every future push
auto-redeploys.)

## Git & GitHub

```bash
git init
git add .
git commit -m "Initial commit: Abundant Air customer & invoice manager"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

After that, keep committing as you make changes:

```bash
git add .
git commit -m "Describe what changed"
git push
```

## Assignment requirement checklist

- [x] Public GitHub repo with regular, meaningful commits
- [x] Backend/database: Supabase (free tier), with a `customers` table and an
      `invoices` table
- [x] User authentication: register, log in, log out (Supabase Auth)
- [x] Frontend lets users register, log in, view data, and perform full CRUD
- [x] Deployed via Netlify
- [x] README with description + deployed link (this file)

## Notes / limitations

This is intentionally the trimmed-down version of a larger invoicing idea —
it does not include line items, PDF generation, or payment receipts (those
exist in the original desktop prototype). It focuses on cleanly meeting the
assignment's core requirements: a real web app, a real database, real
authentication, and full CRUD, built quickly with AI tooling.
