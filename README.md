# Signal — Interview Pipeline Tracker

A private dashboard to track job applications: where you applied, responses received, interview rounds, resume versions sent, and source of each lead — with Google sign-in and a KPI dashboard.

Live on **GitHub Pages** (static hosting) with **Firebase** handling Google login + data storage (free tier, no credit card).

---

## 1. Create your Firebase project (~5 min)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → name it anything (e.g. `interview-tracker`) → finish the wizard (you can disable Google Analytics, not needed).
2. In the left sidebar: **Build → Authentication** → **Get started** → click **Google** in the Sign-in providers list → toggle **Enable** → pick a support email → **Save**.
3. In the left sidebar: **Build → Firestore Database** → **Create database** → choose a region close to you → start in **Production mode** → **Create**.
4. Go to **Project settings** (gear icon top-left) → scroll to **Your apps** → click the **</>** (Web) icon → register an app (nickname anything, no need for Firebase Hosting) → copy the `firebaseConfig` object it shows you.

## 2. Add your config to the code

Open `js/firebase-config.js` and paste your values in:

```js
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

## 3. Lock down your Firestore data (important)

By default, Production mode blocks all reads/writes. Go to **Firestore Database → Rules** and paste this, then **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/applications/{appId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures each signed-in user can only ever read or write their **own** applications — nobody else's data is accessible, even though it's all in the same free database.

## 4. Authorize your GitHub Pages domain

Google Sign-in only works from domains you've allowlisted:

- **Firebase Console → Authentication → Settings → Authorized domains** → **Add domain** → add `yourusername.github.io` (the domain your Pages site will live on).

## 5. Publish to GitHub Pages

1. Create a new GitHub repo (e.g. `interview-tracker`) and push this whole folder's contents to the root of the `main` branch:
   ```
   git init
   git add .
   git commit -m "Interview pipeline tracker"
   git branch -M main
   git remote add origin https://github.com/YOURUSERNAME/interview-tracker.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages** → under "Build and deployment", set **Source: Deploy from a branch**, **Branch: main / (root)** → **Save**.
3. Wait ~1 minute, then visit `https://yourusername.github.io/interview-tracker/`.

That's it — sign in with Google and start logging applications. Your data lives in your own Firestore database and follows you across any browser/device once you're signed in.

---

## What's tracked per application

Each entry has its own tabbed detail view:

- **Overview** — role, date applied, source (LinkedIn, referral, company site, etc.), whether/when a response came in, and current outcome (active / offer / rejected / withdrawn)
- **Rounds** — add one row per interview round you're called for (name, date, notes) — this is also what drives the "Interviewing" stage on your dashboard
- **Resume & Links** — which resume version/filename you sent, the job posting link, and your contact/recruiter
- **Notes** — free-form notes

The dashboard shows: total applications, response rate, interview rate, offers, active pipeline count, and a funnel visualization from Applied → Response → Interview → Offer. You can also filter the application list by stage.

## Notes & limitations

- This is a **client-side app with no server** — by design, so it can run for free on GitHub Pages. All security depends on the Firestore rules in step 3, so don't skip that step.
- LinkedIn OAuth isn't included: LinkedIn's login flow requires a server-side secret exchange that a static site can't do safely. "LinkedIn" is available as a **source** tag on each entry instead, so you can still track it as your lead source.
- Resume files themselves aren't uploaded/stored — only the version name/filename you note down, to keep this free and simple. If you want actual file storage later, Firebase Storage can be added.
