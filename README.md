# Wedding Website

This is a static wedding website for GitHub Pages with:

- verified-email guest login
- protected wedding-fund bank details
- a shared RSVP form stored in Firestore
- an admin dashboard for reviewing all RSVP submissions
- admin-only donation tracking and RSVP deletion controls

## Local Testing

Because the site now uses ES modules, open it through a local web server instead of double-clicking `index.html`.

```bash
cd /home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Firebase Setup

1. Create a Firebase project.
2. Enable `Authentication -> Sign-in method -> Email/Password`.
3. Enable email verification in the auth email templates.
4. Create a Firestore database in production mode.
5. Add your live domain and local hostnames to `Authentication -> Settings -> Authorized domains`.
   - `arshamnk.github.io`
   - `localhost`
   - `127.0.0.1`
6. Edit [app-config.js](/home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding/app-config.js) with:
   - Firebase web app credentials
   - any fixed admin email addresses
   - bank name
   - account name
   - sort code
   - account number
   - contact email

## Firestore Rules

Deploy the checked-in rules from [firestore.rules](/home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding/firestore.rules).

Example flow with the Firebase CLI:

```bash
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

The rules do three things:

- only verified-email users can save an RSVP
- normal guests can only read their own RSVP
- admin users can read every RSVP
- admin users can update the recorded donation amount and delete an RSVP

## Admin Setup

Admin access can be granted in either of two ways:

- add the email address to `appConfig.adminEmails`
- or create an `admins` collection entry in Firestore

The configured email route is the simplest option for a single permanent admin.

1. Create your account through the site.
2. Verify its email address.
3. If the verified email matches one listed in `appConfig.adminEmails`, the account will become admin automatically.
4. Otherwise, copy that user account's Firebase Auth `uid`.
5. In the Firestore console, create a document:
   - collection: `admins`
   - document ID: `<that uid>`
6. Add any small marker field you like, for example:
   - `email: "you@example.com"`

Once either admin path is in place, the verified account will see the admin dashboard instead of the guest RSVP page.

## RSVP Storage Model

- Each verified account stores one RSVP document at `rsvps/<uid>`.
- Returning guests update the same RSVP instead of creating duplicates.
- Admin users see the full list ordered by most recently updated.

## Security Notes

- The bank details are hidden from logged-out users and from unverified accounts.
- Email verification is useful, but it does not make the site truly invite-only by itself.
- If you later want stricter access control, add a guest allowlist on top of verified email.

## File Guide

- [index.html](/home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding/index.html): page structure and protected guest/admin sections
- [styles.css](/home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding/styles.css): layout and auth/dashboard styling
- [script.js](/home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding/script.js): auth, Firestore, RSVP logic, admin dashboard
- [app-config.js](/home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding/app-config.js): live Firebase and bank-detail config
- [firestore.rules](/home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding/firestore.rules): database access rules
- [firebase.json](/home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding/firebase.json): Firebase CLI mapping for the Firestore rules file
- [package.json](/home/arshamnk/Dropbox/Wedding/shabnam-arsham-wedding/package.json): marks the project as ESM so local JS syntax checks match the browser runtime
