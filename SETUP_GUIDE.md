# SN.Fitnex — Setup Guide

## Services Used

| Service | Purpose | Cost |
|---|---|---|
| Firebase Authentication | Admin login, session persistence, password reset | Free tier |
| Firestore Database | Members & attendance data | Free tier |
| ~~Firebase Storage~~ | ~~Photo uploads~~ | **Removed — saves money** |
| **Cloudinary** | Member photo uploads | **Free (25 GB included)** |

---

## Project Files

```
snfitness/
├── index.html
├── dashboard.html
├── members.html
├── add-member.html
├── scanner.html
├── reports.html
├── style.css
├── logo.jpeg               ← your gym logo
└── js/
    ├── firebase-config.js  ← Firebase credentials (Auth + Firestore only)
    ├── cloudinary-config.js← Cloudinary credentials (photo uploads)
    └── app.js              ← All app logic
```

---

## Step 1 — Firebase Project

1. Go to https://console.firebase.google.com → **Add project**
2. **Authentication** → **Get started** → Enable **Email/Password**
3. **Firestore Database** → **Create database** → Production mode

### Get config keys
Project Settings → Your apps → Web (`</>`) → copy `firebaseConfig`

Paste into **`js/firebase-config.js`**:
```js
var firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc"
  // storageBucket intentionally omitted — using Cloudinary instead
};
```

---

## Step 2 — Create Admin Accounts

1. Firebase Console → **Authentication → Users → Add user**
2. Add: `admin@snfitness.com` + password → copy the **UID**
3. Optionally add a second admin

Then in **Firestore**, create collection `admins`:
- Document ID = the admin's **UID**
- Fields: `email` (string), `name` (string)

---

## Step 3 — Firestore Security Rules

Firebase Console → **Firestore → Rules** → paste these rules exactly → click **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: logged-in admin whose UID exists in the admins collection
    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // admins collection — only admins can read, nobody can write via app
    match /admins/{uid} {
      allow read:  if isAdmin();
      allow write: if false;
    }

    // members — admins have full access; public can read for phone lookup
    // (attendance.html needs to look up a member by phone number)
    match /members/{id} {
      allow read:  if true;           // public read — phone lookup only
      allow write: if isAdmin();      // only admins can add/edit/delete members
    }

    // attendance — admins have full access; public can read+write for self check-in
    // (attendance.html checks if already checked in today, then adds a record)
    match /attendance/{id} {
      allow read:  if true;           // public read — to check duplicate today
      allow create: if true;          // public create — member marking own attendance
      allow update, delete: if isAdmin(); // only admins can edit/delete records
    }
  }
}
```

> ⚠️ **This is the most common setup error.** If you see "Missing or insufficient permissions"
> on the attendance page, it means you have the OLD rules that block public access.
> Paste the rules above and click **Publish**.

---

## Step 4 — Cloudinary Setup (replaces Firebase Storage)

### 4a — Create free account
1. Go to https://cloudinary.com → **Sign up free** (no credit card)
2. After login, copy your **Cloud Name** from the Dashboard

### 4b — Create an Upload Preset
1. Cloudinary → Settings → **Upload** tab
2. **Upload presets** → **Add upload preset**
3. Set:
   - **Preset name**: `snfitness_unsigned`
   - **Signing Mode**: **Unsigned** ← required
   - **Folder**: `snfitness-members` ← optional
4. Save → copy the preset name

### 4c — Add credentials
Open **`js/cloudinary-config.js`**:

```js
var CLOUDINARY_CONFIG = {
  cloudName:    "your-cloud-name",       // e.g. "dxyz123abc"
  uploadPreset: "snfitness_unsigned"     // your preset name
};
```

That's the entire Cloudinary setup — no API keys, no SDK, no server needed.

---

## How Photo Uploads Work

```
Admin picks photo  →  uploadToCloudinary(file, memberId)
  → POST https://api.cloudinary.com/v1_1/{cloudName}/image/upload
  → Returns:  { secure_url: "https://res.cloudinary.com/..." }
  → Saved to Firestore:  members/{id}.photoURL = secure_url
  → Displayed everywhere as:  <img src="photoURL">
```

Firebase Storage is not involved at any point.

---

## Step 5 — Run the App

**Open directly** (double-click `index.html`) — works for everything except the camera scanner.

**Camera scanner** requires HTTPS. Deploy to Firebase Hosting:
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # public dir: .  |  single-page: No  |  overwrite: No
firebase deploy --only hosting
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Login reloads without redirecting | `firebase-config.js` still has placeholder `YOUR_API_KEY` |
| "Access denied. Not an authorised admin." | Admin UID missing from Firestore `admins` collection |
| Photo upload fails | Check `cloudinary-config.js` — preset must be **Unsigned** |
| "Cloudinary not configured" toast | Replace placeholder values in `cloudinary-config.js` |
| Camera doesn't work | Needs HTTPS — deploy to Firebase Hosting |
| QR scan can't find member | Phone in QR must exactly match Firestore (no spaces or dashes) |
