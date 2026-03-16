const firebaseConfig = {
  apiKey: "AIzaSyAYwHjHLJ31fiHY7ehYSHD5sJfbghtp39Y",
  authDomain: "snfitness-app.firebaseapp.com",
  projectId: "snfitness-app",
  storageBucket: "snfitness-app.firebasestorage.app",
  messagingSenderId: "1000043135203",
  appId: "1:1000043135203:web:61fff4d5ebc327ce5f45d6",
  measurementId: "G-57G2P4WGM2"
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
