// ============================================================
//  SN.Fitness — Firebase Configuration (Compat SDK)
//  ✅ Works for BOTH admin pages (Auth + Firestore)
//  ✅ Works for attendance.html (Firestore only, no Auth)
//
//  HOW TO GET YOUR CONFIG:
//  1. Go to https://console.firebase.google.com
//  2. Open your project → Project Settings (gear icon)
//  3. Scroll to "Your apps" → click the Web app (</>)
//  4. Copy the firebaseConfig values below
// ============================================================

// ⚠️ REPLACE ALL VALUES BELOW WITH YOUR ACTUAL FIREBASE CONFIG
var firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
  // storageBucket intentionally omitted — photos use Cloudinary
};

// Initialize Firebase (only once — guard against double-init)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ─────────────────────────────────────────────────────────────
//  Firestore — with long-polling enabled.
//
//  WHY THIS IS REQUIRED ON NETLIFY:
//  Firestore uses gRPC/WebSocket as its primary transport.
//  Netlify's edge network (and many other CDN hosts) blocks or
//  interferes with WebSocket upgrade requests to third-party
//  servers. Without this setting, Firestore's WebSocket
//  connection silently hangs — db.collection().get() is called
//  but NEVER resolves or rejects. The page shows "Loading..."
//  forever with no error in the console.
//
//  experimentalAutoDetectLongPolling: true  tells Firestore to
//  automatically detect when WebSocket is unavailable and fall
//  back to HTTP long-polling, which works on all CDN hosts
//  including Netlify, Vercel, GitHub Pages, etc.
// ─────────────────────────────────────────────────────────────
window.db = firebase.firestore();
window.db.settings({
  experimentalAutoDetectLongPolling: true,
  merge: true
});

// Auth — only available when firebase-auth-compat.js is loaded (admin pages)
// attendance.html does NOT load the auth SDK, so we skip this safely
if (typeof firebase.auth === "function") {
  window.auth = firebase.auth();
} else {
  window.auth = null;
}

console.log("✅ Firebase initialized — Auth:", window.auth ? "yes" : "no (public page)", "| Firestore: long-polling enabled");
