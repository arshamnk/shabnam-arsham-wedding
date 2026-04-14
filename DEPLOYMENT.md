# Deployment

This site is still deployed with GitHub Pages:

- Live URL: `https://arshamnk.github.io/shabnam-arsham-wedding/`
- Repository: `https://github.com/arshamnk/shabnam-arsham-wedding`
- Pages source: `main` branch, repository root (`/`)

## Before You Push

The site now depends on Firebase Auth and Firestore.

Make sure you have already:

1. Filled in [app-config.js](/home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding/app-config.js).
2. Enabled Email/Password auth in Firebase.
3. Added `arshamnk.github.io` as an authorized domain.
4. Deployed [firestore.rules](/home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding/firestore.rules).
5. Either listed your admin email in `appConfig.adminEmails` or created an admin document in the `admins` collection for your verified account.

If you change the admin capabilities later, remember to republish the Firestore rules. The admin delete, donation-record, website-based admin-grant, and website-based user-removal features rely on the latest rules being live.

## Push Changes

```bash
cd /home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding
git status --short
git diff
git add index.html styles.css script.js app-config.js firestore.rules firebase.json package.json README.md DEPLOYMENT.md
git commit -m "Add verified guest login and protected RSVP flow"
git push origin main
```

GitHub Pages will rebuild automatically after the push.

## Verify The Deployment

Check the latest Pages build:

```bash
gh api repos/arshamnk/shabnam-arsham-wedding/pages/builds/latest
```

You want:

- `"status":"built"`
- `"commit":"<sha>"` matching the change you pushed

## Quick Live Smoke Test

1. Open the site.
2. Create a guest account.
3. Confirm the verification email arrives.
4. Click the email link, return to the site, and use `Refresh Access`.
5. Confirm:
   - non-admin users see the RSVP form and protected bank details
   - admin users see the RSVP dashboard
   - an RSVP saved from one browser appears in the admin dashboard from another
