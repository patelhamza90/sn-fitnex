const firebaseConfig = {
  apiKey: "AIzaSyAYwHjHLJ31fiHY7ehYSHD5sJfbghtp39Y",
  authDomain: "snfitness-app.firebaseapp.com",
  projectId: "snfitness-app",
  storageBucket: "snfitness-app.firebasestorage.app",
  messagingSenderId: "1000043135203",
  appId: "1:1000043135203:web:61fff4d5ebc327ce5f45d6",
  measurementId: "G-57G2P4WGM2"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

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

console.log("Firebase initialized — Auth:", window.auth ? "yes" : "no (public page)", "| Firestore: long-polling enabled");
