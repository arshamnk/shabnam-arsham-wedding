# Deployment

This site is deployed with GitHub Pages.

- Live URL: `https://arshamnk.github.io/shabnam-arsham-wedding/`
- Repository: `https://github.com/arshamnk/shabnam-arsham-wedding`
- GitHub Pages source: `main` branch, repository root (`/`)

## How To Deploy Changes

1. Open the repo locally:

   ```bash
   cd /home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding
   ```

2. Check what changed:

   ```bash
   git status --short
   ```

3. Review the diff:

   ```bash
   git diff
   ```

4. Commit the intended changes:

   ```bash
   git add index.html styles.css script.js
   git commit -m "Describe the change"
   ```

   If you changed other files too, include them in the `git add` command.

5. Push to `main`:

   ```bash
   git push origin main
   ```

6. GitHub Pages will automatically rebuild the site after the push.

## How To Verify Deployment

Check the latest Pages build with:

```bash
gh api repos/arshamnk/shabnam-arsham-wedding/pages/builds/latest
```

Look for:

- `"status":"built"` to confirm deployment succeeded
- `"commit":"<sha>"` matching the commit you just pushed

You can also confirm the Pages configuration with:

```bash
gh api repos/arshamnk/shabnam-arsham-wedding/pages
```

## Notes

- There is no separate build step at the moment. This is a static site served directly from the repository root.
- Updating `index.html`, `styles.css`, or `script.js` and pushing to `main` is enough to deploy.
- The RSVP form currently stores submissions in browser local storage only. Pushing changes does not affect previously saved local browser data on other devices because there is no backend.
