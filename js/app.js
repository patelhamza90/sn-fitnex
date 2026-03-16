/* ═══════════════════════════════════════════════════════════
   UTILITY HELPERS
═══════════════════════════════════════════════════════════ */

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function isExpired(dateStr) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function daysLeft(dateStr) {
  if (!dateStr) return -9999;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
}

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getEl(id) { return document.getElementById(id); }

/* ═══════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
═══════════════════════════════════════════════════════════ */

const TOAST_ICONS = {
  success: '<i class="fa-solid fa-circle-check"></i>',
  error: '<i class="fa-solid fa-circle-xmark"></i>',
  warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
  info: '<i class="fa-solid fa-circle-info"></i>'
};

function showToast(title, text, type) {
  type = type || "success";
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.innerHTML =
    '<div class="ti">' + (TOAST_ICONS[type] || "") + "</div>" +
    '<div><div class="tt">' + title + "</div>" +
    (text ? '<div class="ts">' + text + "</div>" : "") + "</div>";
  stack.appendChild(el);
  setTimeout(function () {
    el.style.cssText = "opacity:0;transform:translateX(16px);transition:0.3s";
    setTimeout(function () { el.remove(); }, 320);
  }, 3400);
}

/* ═══════════════════════════════════════════════════════════
   PAGE LOADER
   The #page-loader div starts hidden (display:none in CSS).
   showLoader() makes it visible; hideLoader() hides it.
   An emergency fallback hides it after 12s no matter what.
═══════════════════════════════════════════════════════════ */

function showLoader() {
  var ld = document.getElementById("page-loader");
  if (ld) ld.style.display = "flex";
}

function hideLoader() {
  var ld = document.getElementById("page-loader");
  if (ld) {
    ld.style.display = "none";
    ld.style.opacity = "";  // reset any transition state
  }
}

// Emergency fallback: if the loader is still visible after 12 seconds,
// force-hide it so the page is never permanently blocked.
// This catches any edge case where hideLoader() was never called.
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    var ld = document.getElementById("page-loader");
    if (ld && ld.style.display !== "none") {
      console.warn("Emergency loader hide triggered — loader was stuck after 12s");
      hideLoader();
    }
  }, 12000);
});

function setButtonLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Please wait…';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.orig || btn.innerHTML;
    btn.disabled = false;
  }
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION & DATE
═══════════════════════════════════════════════════════════ */

function setActiveNav() {
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link").forEach(function (a) {
    a.classList.toggle("active", a.getAttribute("href") === page);
  });
}

function setDateBadge() {
  const el = document.getElementById("date-badge");
  if (el) {
    el.textContent = new Date().toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short", year: "numeric"
    });
  }
}

function memberAvatarHTML(member, size) {
  size = size || 36;
  if (member && member.photoURL) {
    return '<div class="member-photo" style="width:' + size + 'px;height:' + size + 'px">' +
      '<img src="' + member.photoURL + '" alt="' + member.name + '" loading="lazy"></div>';
  }
  var initials = member
    ? member.name.trim().split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase()
    : "?";
  return '<div class="member-photo" style="width:' + size + 'px;height:' + size + 'px;font-size:' +
    Math.floor(size * 0.35) + 'px">' + initials + "</div>";
}

function setAdminUI(user) {
  if (!user) return;
  var initial = (user.email || "A").charAt(0).toUpperCase();
  var name = (user.email || "Admin").split("@")[0];
  document.querySelectorAll(".topbar-avatar").forEach(function (el) { el.textContent = initial; });
  document.querySelectorAll(".sb-avatar").forEach(function (el) { el.textContent = initial; });
  document.querySelectorAll(".sb-profile-info h4").forEach(function (el) { el.textContent = name; });
  document.querySelectorAll(".sb-profile-info p").forEach(function (el) { el.textContent = user.email; });
}

/* ═══════════════════════════════════════════════════════════
   AUTH
   Speed optimisation: admin UID is cached in sessionStorage after
   first successful login. On subsequent page loads we skip the
   Firestore /admins/{uid} round-trip (saves ~300-600ms per page).
   Cache is cleared on logout and on any Firestore auth error.

   Netlify fix: added 10-second timeout so loader never hangs
   forever if Firebase Auth is slow to initialize on cold load.
═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   AUTH — Single-listener architecture
   ─────────────────────────────────────────────────────────
   ROOT CAUSE OF THE BUG:
   Every call to requireAuth() called auth.onAuthStateChanged()
   and never unsubscribed. After navigating 3 pages, there were
   3 simultaneous listeners all firing at once, racing each
   other and corrupting page data.

   FIX:
   onAuthStateChanged is called ONCE when app.js first loads.
   It resolves a Promise (_authReady) that every page waits on.
   All subsequent calls to requireAuth() immediately get the
   already-resolved user — no new listeners, no races.
═══════════════════════════════════════════════════════════ */

var _ADMIN_CACHE_KEY = "snf_admin_ok";
var _authUser = null;   // the resolved Firebase user (or null)
var _authReady = null;   // Promise that resolves once auth state is known

function _setCachedAdmin(uid, email) {
  try { sessionStorage.setItem(_ADMIN_CACHE_KEY, JSON.stringify({ uid: uid, email: email, ts: Date.now() })); } catch (_) { }
}
function _getCachedAdmin() {
  try {
    var v = sessionStorage.getItem(_ADMIN_CACHE_KEY);
    if (!v) return null;
    var d = JSON.parse(v);
    if (Date.now() - d.ts > 4 * 3600 * 1000) { sessionStorage.removeItem(_ADMIN_CACHE_KEY); return null; }
    return d;
  } catch (_) { return null; }
}
function _clearCachedAdmin() {
  try { sessionStorage.removeItem(_ADMIN_CACHE_KEY); } catch (_) { }
}

// ── Bootstrap: called once at page load ──────────────────
// Registers ONE onAuthStateChanged listener for the lifetime
// of this page. Returns a Promise that resolves to the user
// object (if admin) or null (if not logged in / not admin).
function _bootstrapAuth() {
  if (_authReady) return _authReady; // already initialised

  _authReady = new Promise(function (resolve) {

    if (!window.auth) {
      console.error("Auth SDK not loaded");
      resolve(null);
      return;
    }

    // Safety timeout — if Firebase never responds, treat as logged out
    var timer = setTimeout(function () {
      console.warn("Auth timeout after 10s");
      resolve(null);
    }, 10000);

    // THE ONLY onAuthStateChanged CALL IN THE ENTIRE APP
    var unsubscribe = auth.onAuthStateChanged(function (user) {
      clearTimeout(timer);
      unsubscribe(); // ← unsubscribe immediately so this NEVER fires again

      if (!user) {
        _authUser = null;
        resolve(null);
        return;
      }

      // Fast path — sessionStorage cache
      var cached = _getCachedAdmin();
      if (cached && cached.uid === user.uid) {
        _authUser = user;
        resolve(user);
        return;
      }

      // Slow path — verify in Firestore (only on first load after login)
      db.collection("admins").doc(user.uid).get()
        .then(function (snap) {
          if (!snap.exists) {
            _clearCachedAdmin();
            auth.signOut();
            _authUser = null;
            resolve(null);
            return;
          }
          _setCachedAdmin(user.uid, user.email);
          _authUser = user;
          resolve(user);
        })
        .catch(function (err) {
          console.error("Admin Firestore check failed:", err.code, err.message);
          _clearCachedAdmin();
          _authUser = null;
          resolve(null);
        });
    });
  });

  return _authReady;
}

// ── requireAuth — called by every page init function ──────
// Waits for the single auth promise, then either runs onReady
// or redirects to login. Never registers a new listener.
function requireAuth(onReady) {
  showLoader();

  _bootstrapAuth().then(function (user) {
    if (!user) {
      hideLoader();
      window.location.href = "index.html";
      return;
    }

    hideLoader();
    setAdminUI(user);
    setActiveNav();
    setDateBadge();
    bindLogout();

    if (typeof onReady === "function") {
      try {
        onReady(user);
      } catch (e) {
        console.error("Page init error:", e);
        hideLoader();
      }
    }
  });
}

function bindLogout() {
  document.querySelectorAll(".logout-btn").forEach(function (b) {
    var nb = b.cloneNode(true);
    b.parentNode.replaceChild(nb, b);
    nb.addEventListener("click", function () {
      _clearCachedAdmin();
      _authUser = null;
      _authReady = null; // reset so next page starts fresh
      auth.signOut().then(function () { window.location.href = "index.html"; });
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   ALERT BANNERS
═══════════════════════════════════════════════════════════ */

function renderAlerts(containerId, members) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var expired = members.filter(function (m) { return isExpired(m.expiryDate); });
  var soon = members.filter(function (m) { var d = daysLeft(m.expiryDate); return d >= 0 && d <= 3; });
  var html = "";

  expired.forEach(function (m) {
    html += '<div class="alert-banner alert-expired">' +
      '<span class="alert-icon"><i class="fa-solid fa-circle-xmark"></i></span>' +
      '<div class="alert-text"><strong>' + m.name + "'s plan has expired</strong>" +
      '<span>Expired on ' + fmtDate(m.expiryDate) + ' — Renew to restore access</span></div>' +
      '<button class="alert-dismiss" onclick="this.closest(\'.alert-banner\').remove()"><i class="fa-solid fa-xmark"></i></button></div>';
  });
  soon.forEach(function (m) {
    var d = daysLeft(m.expiryDate);
    var when = d === 0 ? "today" : "in " + d + " day" + (d > 1 ? "s" : "");
    html += '<div class="alert-banner alert-warning">' +
      '<span class="alert-icon"><i class="fa-solid fa-triangle-exclamation"></i></span>' +
      '<div class="alert-text"><strong>' + m.name + "'s plan expires " + when + "</strong>" +
      '<span>Expiry: ' + fmtDate(m.expiryDate) + ' — Consider renewing soon</span></div>' +
      '<button class="alert-dismiss" onclick="this.closest(\'.alert-banner\').remove()"><i class="fa-solid fa-xmark"></i></button></div>';
  });
  container.innerHTML = html;

  // Alert bell
  var dot = document.querySelector(".alert-bell-dot");
  if (dot) dot.classList.toggle("show", expired.length > 0 || soon.length > 0);
  var badge = document.getElementById("nav-alert-badge");
  if (badge) {
    var n = expired.length + soon.length;
    badge.textContent = n;
    badge.style.display = n > 0 ? "" : "none";
  }
}

/* ═══════════════════════════════════════════════════════════
   ██████  LOGIN PAGE
═══════════════════════════════════════════════════════════ */

function initLogin() {
  // Reset auth state so _bootstrapAuth runs fresh on this page
  _authReady = null;
  _authUser = null;

  // If already logged in as a valid admin → go straight to dashboard
  // Uses _bootstrapAuth so we don't add another onAuthStateChanged listener
  _bootstrapAuth().then(function (user) {
    if (user) {
      window.location.href = "dashboard.html";
    }
  });

  // ── Login form submit ────────────────────────────────────
  var loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("lu").value.trim();
      var pass = document.getElementById("lp").value;
      var errEl = document.getElementById("lerr");
      var btn = loginForm.querySelector("button[type=submit]");

      if (!email || !pass) {
        errEl.classList.add("show");
        errEl.innerHTML = '<i class="fa-solid fa-lock"></i>&nbsp; Please enter your email and password.';
        return;
      }

      errEl.classList.remove("show");
      setButtonLoading(btn, true);

      // Set persistence so session survives page refresh
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(function () {
          return auth.signInWithEmailAndPassword(email, pass);
        })
        .then(function (cred) {
          // Store uid/email outside the chain so the next .then() can access them
          // (cred is NOT in scope in the next .then callback — this fixes "cred is not defined")
          var uid = cred.user.uid;
          var userEmail = cred.user.email;

          return db.collection("admins").doc(uid).get()
            .then(function (snap) {
              if (!snap.exists) {
                auth.signOut();
                throw new Error("Access denied. This account is not an authorised admin.");
              }
              // Cache so subsequent pages skip the Firestore round-trip
              _setCachedAdmin(uid, userEmail);
              window.location.href = "dashboard.html";
            });
        })
        .catch(function (err) {
          setButtonLoading(btn, false);
          errEl.classList.add("show");
          var msg = err.message;
          if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" ||
            err.code === "auth/invalid-credential" || err.code === "auth/invalid-email") {
            msg = "Incorrect email or password. Please try again.";
          } else if (err.code === "auth/too-many-requests") {
            msg = "Too many failed attempts. Please wait a moment and try again.";
          } else if (err.code === "auth/network-request-failed") {
            msg = "Network error. Check your internet connection.";
          }
          errEl.innerHTML = '<i class="fa-solid fa-lock"></i>&nbsp; ' + msg;
        });
    });
  }

  // ── Forgot password panel toggle ─────────────────────────
  var forgotLink = document.getElementById("forgot-link");
  var forgotPanel = document.getElementById("forgot-panel");
  var loginWrap = document.getElementById("login-form-wrap");
  var backBtn = document.getElementById("back-to-login");

  if (forgotLink) {
    forgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      loginWrap.style.display = "none";
      forgotPanel.style.display = "block";
    });
  }
  if (backBtn) {
    backBtn.addEventListener("click", function (e) {
      e.preventDefault();
      forgotPanel.style.display = "none";
      loginWrap.style.display = "block";
    });
  }

  // ── Forgot password form ─────────────────────────────────
  var forgotForm = document.getElementById("forgot-form");
  if (forgotForm) {
    forgotForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("reset-email").value.trim();
      var msgEl = document.getElementById("reset-msg");
      var btn = forgotForm.querySelector("button[type=submit]");

      if (!email) {
        msgEl.className = "reset-error";
        msgEl.textContent = "Please enter your email address.";
        return;
      }

      setButtonLoading(btn, true);
      msgEl.className = "";
      msgEl.textContent = "";

      auth.sendPasswordResetEmail(email)
        .then(function () {
          setButtonLoading(btn, false);
          msgEl.className = "reset-success";
          msgEl.textContent = "✅ Password reset email sent! Check your inbox.";
          document.getElementById("reset-email").value = "";
        })
        .catch(function (err) {
          setButtonLoading(btn, false);
          msgEl.className = "reset-error";
          msgEl.textContent = "❌ " + err.message;
        });
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   ██████  DASHBOARD PAGE
═══════════════════════════════════════════════════════════ */

function initDashboard() {
  requireAuth(function (user) {
    var firestoreQuery = db.collection("members").get();
    var timeoutPromise = new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error("Firestore timed out. Check firebase-config.js has experimentalAutoDetectLongPolling:true")); }, 15000);
    });

    Promise.race([firestoreQuery, timeoutPromise])
      .then(function (snap) {
        var members = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        // Sort newest first client-side
        members.sort(function (a, b) {
          var ta = a.createdAt ? a.createdAt.seconds : 0;
          var tb = b.createdAt ? b.createdAt.seconds : 0;
          return tb - ta;
        });

        var today = todayStr();
        var total = members.length;
        var active = members.filter(function (m) { return !isExpired(m.expiryDate); }).length;
        var expired = members.filter(function (m) { return isExpired(m.expiryDate); }).length;

        setText("sc-total", total);
        setText("sc-active", active);
        setText("sc-expired", expired);

        renderAlerts("dash-alerts", members);

        // Recent members table
        var rmEl = document.getElementById("dash-recent-tbody");
        if (rmEl) {
          if (!members.length) {
            rmEl.innerHTML = '<tr><td colspan="4"><div class="empty-state" style="padding:28px"><p>No members yet</p></div></td></tr>';
          } else {
            rmEl.innerHTML = members.slice(0, 6).map(function (m) {
              var exp = isExpired(m.expiryDate);
              return "<tr><td><div class='member-cell'>" + memberAvatarHTML(m, 34) +
                "<div><div class='mc-name'>" + m.name + "</div><div class='mc-sub'>" + m.phone + "</div></div></div></td>" +
                "<td>" + fmtDate(m.admissionDate) + "</td>" +
                "<td>" + fmtDate(m.expiryDate) + "</td>" +
                "<td><span class='badge " + (exp ? "badge-inactive" : "badge-active") + "'><span class='badge-dot'></span>" +
                (exp ? "Expired" : "Active") + "</span></td></tr>";
            }).join("");
          }
        }

        // Today's attendance — use where() range, then sort client-side
        var dayStart = new Date(today + "T00:00:00");
        var dayEnd = new Date(today + "T23:59:59");
        return db.collection("attendance")
          .where("checkedInAt", ">=", firebase.firestore.Timestamp.fromDate(dayStart))
          .where("checkedInAt", "<=", firebase.firestore.Timestamp.fromDate(dayEnd))
          .get()
          .then(function (attSnap) {
            var attList = attSnap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
            // Sort newest first client-side
            attList.sort(function (a, b) {
              var ta = a.checkedInAt ? a.checkedInAt.seconds : 0;
              var tb = b.checkedInAt ? b.checkedInAt.seconds : 0;
              return tb - ta;
            });
            setText("sc-today", attList.length);

            var attEl = document.getElementById("dash-att-list");
            if (attEl) {
              if (!attList.length) {
                attEl.innerHTML = '<div class="empty-state"><div class="es-icon"><i class="fa-solid fa-list-check"></i></div><h3>No check-ins yet</h3><p>Attendance will appear here as members scan in</p></div>';
              } else {
                var memberMap = {};
                members.forEach(function (m) { memberMap[m.id] = m; });
                attEl.innerHTML = attList.map(function (a) {
                  var m = memberMap[a.memberId];
                  return '<div class="activity-item">' + memberAvatarHTML(m, 36) +
                    '<div><div class="mc-name">' + (a.memberName || a.phone) + '</div><div class="mc-sub">' + a.phone + "</div></div>" +
                    '<div class="activity-meta"><div class="act-time">' + fmtTime(a.checkedInAt) + "</div></div></div>";
                }).join("");
              }
            }
          });
      })
      .catch(function (err) {
        console.error("Dashboard error:", err.code, err.message);
        showToast("Failed to load dashboard data", err.message, "error");
      });
  });
}

/* ═══════════════════════════════════════════════════════════
   ██████  MEMBERS PAGE
═══════════════════════════════════════════════════════════ */

var _allMembers = [];
var _editId = null;
var _photoFile = null;

function initMembers() {
  requireAuth(function () {
    refreshMembers();
    bindMembersEvents();
  });
}

function refreshMembers() {
  // Wrap the Firestore call in a race against a 15-second timeout.
  // If Firestore hangs (WebSocket blocked, network issue, etc.) the
  // timeout wins and shows an error in the table instead of spinning forever.
  var firestoreQuery = db.collection("members").get();

  var timeoutPromise = new Promise(function (_, reject) {
    setTimeout(function () {
      reject(new Error("Firestore query timed out after 15 seconds. This usually means WebSocket is blocked. Check firebase-config.js has experimentalAutoDetectLongPolling: true"));
    }, 15000);
  });

  Promise.race([firestoreQuery, timeoutPromise])
    .then(function (snap) {
      _allMembers = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      // Sort by createdAt descending client-side (newest first)
      _allMembers.sort(function (a, b) {
        var ta = a.createdAt ? a.createdAt.seconds : 0;
        var tb = b.createdAt ? b.createdAt.seconds : 0;
        return tb - ta;
      });
      renderAlerts("members-alerts", _allMembers);
      applyMemberFilters();
    })
    .catch(function (err) {
      console.error("refreshMembers error:", err.code || "timeout", err.message);
      var tbody = getEl("members-tbody");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="6"><div class="empty-state" style="padding:36px">' +
          '<div class="es-icon" style="color:var(--red)"><i class="fa-solid fa-circle-xmark"></i></div>' +
          '<h3>Failed to load members</h3>' +
          '<p style="color:var(--red);font-size:12px;margin-bottom:4px;font-family:monospace">' +
          (err.code ? '[' + err.code + '] ' : '') + err.message +
          '</p>' +
          '<p style="font-size:12px;color:var(--t3);margin-bottom:16px">Check browser console for details.</p>' +
          '<button class="btn btn-primary btn-sm" onclick="refreshMembers()"><i class="fa-solid fa-rotate-right"></i> Try Again</button>' +
          '</div></td></tr>';
      }
      showToast("Error loading members", err.message, "error");
    });
}

function applyMemberFilters() {
  var q = (getEl("search-input") ? getEl("search-input").value : "").toLowerCase();
  var st = getEl("status-filter") ? getEl("status-filter").value : "all";
  var filtered = _allMembers.filter(function (m) {
    var mq = !q || m.name.toLowerCase().includes(q) || m.phone.includes(q);
    var exp = isExpired(m.expiryDate);
    var ms = st === "all" || (st === "active" && !exp) || (st === "expired" && exp);
    return mq && ms;
  });
  var cntEl = getEl("member-count");
  if (cntEl) cntEl.textContent = filtered.length + " member" + (filtered.length !== 1 ? "s" : "");
  renderMembersTable(filtered);
}

function renderMembersTable(filtered) {
  var tbody = getEl("members-tbody");
  if (!tbody) return;
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="es-icon"><i class="fa-solid fa-magnifying-glass"></i></div><h3>No members found</h3><p>Try adjusting your search or filters</p><a href="add-member.html" class="btn btn-primary btn-sm">+ Add Member</a></div></td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(function (m) {
    var exp = isExpired(m.expiryDate);
    var dl = daysLeft(m.expiryDate);
    var dlColor = "var(--t4)", dlTxt = fmtDate(m.expiryDate);
    if (exp) { dlColor = "var(--red)"; dlTxt = "Expired " + Math.abs(dl) + "d ago"; }
    else if (dl <= 3) { dlColor = "var(--amber)"; dlTxt = "Expires in " + dl + "d ⚠️"; }
    else if (dl <= 7) { dlColor = "var(--amber)"; dlTxt = dl + " days left"; }

    var badgeCls = exp ? "badge-inactive" : dl <= 3 ? "badge-warn" : "badge-active";
    var badgeTxt = exp ? "Expired" : dl <= 3 ? "Expiring" : "Active";
    var renewBtn = (exp || dl <= 7) ?
      '<button class="btn btn-success btn-sm" onclick="openRenewModal(\'' + m.id + '\')"><i class="fa-solid fa-rotate"></i><span class="btn-label"> Renew</span></button>' : "";

    return "<tr>" +
      "<td><div class='member-cell'>" + memberAvatarHTML(m, 36) +
      "<div><div class='mc-name'>" + m.name + "</div><div class='mc-sub'>" + m.phone + "</div></div></div></td>" +
      "<td class='hide-sm'>" + m.phone + "</td>" +
      "<td class='hide-sm'>" + fmtDate(m.admissionDate) + "</td>" +
      "<td><span style='font-size:12px;color:" + dlColor + "'>" + dlTxt + "</span></td>" +
      "<td><span class='badge " + badgeCls + "'><span class='badge-dot'></span>" + badgeTxt + "</span></td>" +
      "<td><div class='act-cell'>" +
      "<button class='btn btn-secondary btn-sm' onclick='openEditModal(\"" + m.id + "\")'><i class='fa-solid fa-pen'></i><span class='btn-label'> Edit</span></button>" +
      renewBtn +
      "<button class='btn btn-danger btn-sm' onclick='confirmDelete(\"" + m.id + "\")'><i class='fa-solid fa-trash'></i></button>" +
      "</div></td></tr>";
  }).join("");
}

function bindMembersEvents() {
  if (getEl("search-input")) getEl("search-input").addEventListener("input", applyMemberFilters);
  if (getEl("status-filter")) getEl("status-filter").addEventListener("change", applyMemberFilters);
  if (getEl("add-btn")) getEl("add-btn").addEventListener("click", function () { openAddModal(); });

  if (getEl("photo-input")) {
    getEl("photo-input").addEventListener("change", function (e) {
      _photoFile = e.target.files[0] || null;
      if (_photoFile) previewPhoto(_photoFile, "pu-img");
    });
  }

  if (getEl("member-form")) getEl("member-form").addEventListener("submit", handleSaveMember);
  if (getEl("renew-form")) getEl("renew-form").addEventListener("submit", handleRenew);

  document.querySelectorAll(".rn-plan-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".rn-plan-btn").forEach(function (b) { b.classList.remove("sel"); });
      btn.classList.add("sel");
      var id = getEl("rn-member-id").value;
      var m = _allMembers.find(function (x) { return x.id === id; });
      var base = (m && !isExpired(m.expiryDate)) ? new Date(m.expiryDate) : new Date();
      base.setMonth(base.getMonth() + parseInt(btn.dataset.months));
      getEl("rn-new-exp").value = base.toISOString().split("T")[0];
    });
  });

  // Close overlays
  document.querySelectorAll(".overlay").forEach(function (o) {
    o.addEventListener("click", function (e) { if (e.target === o) closeAllModals(); });
  });
  document.querySelectorAll(".modal-x, .modal-cancel").forEach(function (b) {
    b.addEventListener("click", closeAllModals);
  });
}

function previewPhoto(file, previewId) {
  var reader = new FileReader();
  reader.onload = function (ev) {
    var p = getEl(previewId);
    if (p) p.innerHTML = '<img src="' + ev.target.result + '" alt="">';
  };
  reader.readAsDataURL(file);
}

function closeAllModals() {
  document.querySelectorAll(".overlay").forEach(function (o) { o.classList.remove("open"); });
  _editId = null; _photoFile = null;
}

function openAddModal() {
  _editId = null; _photoFile = null;
  getEl("member-form").reset();
  getEl("pu-img").innerHTML = "👤";
  getEl("modal-title").textContent = "Add New Member";
  getEl("modal-sub").textContent = "Register a new gym member";
  getEl("m-adm").value = todayStr();
  getEl("member-overlay").classList.add("open");
}

window.openEditModal = function (id) {
  var m = _allMembers.find(function (x) { return x.id === id; });
  if (!m) return;
  _editId = id; _photoFile = null;
  getEl("member-form").reset();
  getEl("modal-title").textContent = "Edit Member";
  getEl("modal-sub").textContent = "Update member information";
  getEl("m-name").value = m.name;
  getEl("m-phone").value = m.phone;
  getEl("m-adm").value = m.admissionDate || "";
  getEl("m-exp").value = m.expiryDate || "";
  var p = getEl("pu-img");
  p.innerHTML = m.photoURL ? '<img src="' + m.photoURL + '" alt="">' : "👤";
  getEl("member-overlay").classList.add("open");
};

function handleSaveMember(e) {
  e.preventDefault();
  var btn = e.submitter || e.target.querySelector("button[type=submit]");
  var name = getEl("m-name").value.trim();
  var phone = getEl("m-phone").value.trim();
  var adm = getEl("m-adm").value;
  var exp = getEl("m-exp").value;

  if (!name || !phone || !exp) { showToast("Missing fields", "Fill in name, phone and expiry date", "error"); return; }
  if (!/^\d{7,15}$/.test(phone)) { showToast("Invalid phone", "Enter 7–15 digits only", "error"); return; }

  setButtonLoading(btn, true);

  // Check phone uniqueness
  var phoneQ = db.collection("members").where("phone", "==", phone);
  phoneQ.get().then(function (snap) {
    var dup = snap.docs.find(function (d) { return d.id !== _editId; });
    if (dup) { showToast("Phone already in use", "Used by " + dup.data().name, "error"); setButtonLoading(btn, false); return; }

    var data = {
      name: name, phone: phone, admissionDate: adm, expiryDate: exp,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    var savePromise;
    if (_editId) {
      savePromise = db.collection("members").doc(_editId).update(data);
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.photoURL = "";
      savePromise = db.collection("members").add(data).then(function (ref) {
        _editId = ref.id; return ref;
      });
    }

    savePromise.then(function () {
      // ── Upload photo to Cloudinary if a new file was chosen ──
      if (_photoFile) {
        return uploadToCloudinary(_photoFile, _editId)
          .then(function (url) {
            // Save the Cloudinary URL into Firestore
            return db.collection("members").doc(_editId).update({ photoURL: url });
          });
      }
      return Promise.resolve();
    }).then(function () {
      showToast(_editId && data.createdAt === undefined ? "Member updated" : "Member added!", name + " saved successfully", "success");
      closeAllModals();
      refreshMembers();
      setButtonLoading(btn, false);
    }).catch(function (err) {
      showToast("Error", err.message, "error");
      setButtonLoading(btn, false);
    });
  });
}

window.confirmDelete = function (id) {
  var m = _allMembers.find(function (x) { return x.id === id; });
  if (!m || !confirm('Delete "' + m.name + '"?\nThis cannot be undone.')) return;
  db.collection("members").doc(id).delete().then(function () {
    showToast("Deleted", m.name + " removed", "error");
    refreshMembers();
  }).catch(function (err) { showToast("Error", err.message, "error"); });
};

window.openRenewModal = function (id) {
  var m = _allMembers.find(function (x) { return x.id === id; });
  if (!m) return;
  getEl("rn-member-name").textContent = m.name;
  getEl("rn-current-exp").textContent = fmtDate(m.expiryDate);
  getEl("rn-member-id").value = id;
  var base = isExpired(m.expiryDate) ? new Date() : new Date(m.expiryDate);
  base.setMonth(base.getMonth() + 1);
  getEl("rn-new-exp").value = base.toISOString().split("T")[0];
  document.querySelectorAll(".rn-plan-btn").forEach(function (b) { b.classList.remove("sel"); });
  getEl("renew-overlay").classList.add("open");
};

function handleRenew(e) {
  e.preventDefault();
  var id = getEl("rn-member-id").value;
  var nd = getEl("rn-new-exp").value;
  var btn = e.submitter || e.target.querySelector("button[type=submit]");
  if (!nd) { showToast("Select a date", "", "error"); return; }
  setButtonLoading(btn, true);
  var m = _allMembers.find(function (x) { return x.id === id; });
  db.collection("members").doc(id).update({
    expiryDate: nd, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function () {
    showToast("Plan renewed!", (m ? m.name : "") + " active until " + fmtDate(nd), "success");
    closeAllModals(); refreshMembers(); setButtonLoading(btn, false);
  }).catch(function (err) { showToast("Error", err.message, "error"); setButtonLoading(btn, false); });
}

window.openQRModal = function (id) {
  var m = _allMembers.find(function (x) { return x.id === id; });
  if (!m) return;
  getEl("qr-name").textContent = m.name;
  getEl("qr-phone").textContent = m.phone;
  var box = getEl("qr-code-box");
  box.innerHTML = "";
  if (typeof QRCode !== "undefined") {
    new QRCode(box, { text: m.phone, width: 200, height: 200, colorDark: "#000", colorLight: "#fff", correctLevel: QRCode.CorrectLevel.M });
  }
  getEl("qr-overlay").classList.add("open");
};

/* ═══════════════════════════════════════════════════════════
   ██████  ADD MEMBER PAGE
═══════════════════════════════════════════════════════════ */

// Holds the last successfully added member so the PDF function can read it
var _lastAddedMember = null;

function initAddMember() {
  requireAuth(function () {
    var photoFile = null;
    getEl("am-adm").value = todayStr();

    if (getEl("am-photo")) {
      getEl("am-photo").addEventListener("change", function (e) {
        photoFile = e.target.files[0] || null;
        if (photoFile) previewPhoto(photoFile, "am-pu-img");
      });
    }

    document.querySelectorAll(".plan-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".plan-btn").forEach(function (b) { b.classList.remove("sel"); });
        btn.classList.add("sel");
        var d = new Date();
        d.setMonth(d.getMonth() + parseInt(btn.dataset.months));
        getEl("am-exp").value = d.toISOString().split("T")[0];
      });
    });

    var amForm = getEl("am-form");
    if (amForm) {
      amForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = getEl("am-name").value.trim();
        var phone = getEl("am-phone").value.trim();
        var adm = getEl("am-adm").value;
        var exp = getEl("am-exp").value;
        var btn = e.submitter || amForm.querySelector("button[type=submit]");

        if (!name || !phone || !exp) { showToast("Missing fields", "Fill all required fields", "error"); return; }
        if (!/^\d{7,15}$/.test(phone)) { showToast("Invalid phone", "7–15 digits required", "error"); return; }

        setButtonLoading(btn, true);
        db.collection("members").where("phone", "==", phone).get().then(function (snap) {
          if (!snap.empty) { showToast("Phone already exists", "Must be unique per member", "error"); setButtonLoading(btn, false); return; }

          db.collection("members").add({
            name: name, phone: phone, admissionDate: adm, expiryDate: exp,
            photoURL: "", createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }).then(function (ref) {
            // Store the member ID so the PDF can use it
            _lastAddedMember = { id: ref.id, name: name, phone: phone, admissionDate: adm, expiryDate: exp, photoURL: "" };

            if (!photoFile) return Promise.resolve();
            return uploadToCloudinary(photoFile, ref.id)
              .then(function (url) {
                _lastAddedMember.photoURL = url;
                return db.collection("members").doc(ref.id).update({ photoURL: url });
              });
          }).then(function () {
            showToast("Member added!", name + " registered successfully", "success");

            // ── Show admission success card ──────────────────────
            var card = getEl("am-success-card");
            var summary = getEl("am-success-summary");
            if (card && summary && _lastAddedMember) {
              summary.innerHTML =
                '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
                (_lastAddedMember.photoURL
                  ? '<img src="' + _lastAddedMember.photoURL + '" style="width:46px;height:46px;border-radius:50%;object-fit:cover;border:2px solid var(--green-border)">'
                  : '<div style="width:46px;height:46px;border-radius:50%;background:var(--green-bg);border:2px solid var(--green-border);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--green)">' +
                  _lastAddedMember.name.trim().split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase() +
                  '</div>') +
                '<div><div style="font-weight:700;font-size:14px">' + _lastAddedMember.name + '</div>' +
                '<div style="font-size:12px;color:var(--t3)">' + _lastAddedMember.phone + '</div></div>' +
                '</div>' +
                '<div style="color:var(--t3)"><i class="fa-solid fa-id-card" style="margin-right:5px"></i>ID: <strong style="color:var(--t1)">' + _lastAddedMember.id.slice(-8).toUpperCase() + '</strong></div>' +
                '<div style="color:var(--t3)"><i class="fa-regular fa-calendar" style="margin-right:5px"></i>Admission: <strong style="color:var(--t1)">' + fmtDate(_lastAddedMember.admissionDate) + '</strong></div>' +
                '<div style="color:var(--t3)"><i class="fa-solid fa-hourglass-half" style="margin-right:5px"></i>Expiry: <strong style="color:var(--t1)">' + fmtDate(_lastAddedMember.expiryDate) + '</strong></div>';
              card.style.display = "";
              // Scroll the success card into view smoothly
              card.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }

            // Reset form
            amForm.reset();
            getEl("am-adm").value = todayStr();
            getEl("am-pu-img").innerHTML = "👤";
            photoFile = null;
            document.querySelectorAll(".plan-btn").forEach(function (b) { b.classList.remove("sel"); });
            setButtonLoading(btn, false);
          }).catch(function (err) { showToast("Error", err.message, "error"); setButtonLoading(btn, false); });
        });
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   ██████  SCANNER PAGE
   Engine priority:
     1. BarcodeDetector API  — native browser, hardware-accelerated
     2. ZXing-js canvas loop — most reliable cross-browser JS decoder
     3. jsQR canvas loop     — lightweight final fallback
   All engines use a requestAnimationFrame loop with per-frame
   throttling. ZXing is used via decodeFromCanvas (not the
   unreliable decodeFromVideoElement stream API).
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   ██████  SCANNER PAGE  (Admin Attendance Dashboard)
   The scanner page no longer uses a camera. Instead:
   - Members use attendance.html (public, no login) via the gym QR code
   - This page shows the admin the live today's log + manual override
═══════════════════════════════════════════════════════════ */

function initScanner() {
  requireAuth(function () {
    renderAttLog();
    updateTodayCount();

    // Manual check-in form (admin override)
    var mf = getEl("manual-form");
    if (mf) {
      mf.addEventListener("submit", function (e) {
        e.preventDefault();
        var phone = (getEl("manual-phone").value || "").trim().replace(/\D/g, "");
        if (!phone) return;
        adminManualCheckin(phone);
        getEl("manual-phone").value = "";
      });
    }

    // Auto-refresh log every 30 seconds
    setInterval(function () {
      renderAttLog();
      updateTodayCount();
    }, 30000);
  });
}

// Exposed globally so the "Refresh" button in scanner.html can call it
window.refreshAttLog = function () {
  renderAttLog();
  updateTodayCount();
};

// Admin manual check-in (same logic as public page but shows inline result)
function adminManualCheckin(phone) {
  var resultEl = getEl("manual-result");
  if (resultEl) {
    resultEl.innerHTML = '<span style="font-size:13px;color:var(--t3)"><i class="fa-solid fa-spinner fa-spin"></i> Looking up…</span>';
  }

  db.collection("members").where("phone", "==", phone).limit(1).get()
    .then(function (snap) {
      if (snap.empty) {
        if (resultEl) resultEl.innerHTML = '<div class="att-inline-result att-inline-notfound"><i class="fa-solid fa-user-xmark"></i> No member found for <strong>' + phone + '</strong></div>';
        showToast("Member not found", phone, "error");
        return;
      }
      var m = Object.assign({ id: snap.docs[0].id }, snap.docs[0].data());
      var exp = isExpired(m.expiryDate);

      if (exp) {
        if (resultEl) resultEl.innerHTML = '<div class="att-inline-result att-inline-expired"><i class="fa-solid fa-triangle-exclamation"></i> <strong>' + m.name + '</strong> — plan expired on ' + fmtDate(m.expiryDate) + '</div>';
        showToast(m.name, "Plan expired", "warning");
        return;
      }

      var today = todayStr();
      var dayStart = new Date(today + "T00:00:00");
      var dayEnd = new Date(today + "T23:59:59");

      db.collection("attendance")
        .where("memberId", "==", m.id)
        .where("checkedInAt", ">=", firebase.firestore.Timestamp.fromDate(dayStart))
        .where("checkedInAt", "<=", firebase.firestore.Timestamp.fromDate(dayEnd))
        .get().then(function (attSnap) {
          if (!attSnap.empty) {
            if (resultEl) resultEl.innerHTML = '<div class="att-inline-result att-inline-already"><i class="fa-solid fa-clock-rotate-left"></i> <strong>' + m.name + '</strong> already checked in today</div>';
            showToast(m.name, "Already checked in today", "warning");
            return;
          }
          db.collection("attendance").add({
            memberId: m.id, phone: m.phone, memberName: m.name, date: today,
            checkedInAt: firebase.firestore.FieldValue.serverTimestamp()
          }).then(function () {
            if (resultEl) resultEl.innerHTML = '<div class="att-inline-result att-inline-success"><i class="fa-solid fa-circle-check"></i> <strong>' + m.name + '</strong> checked in successfully</div>';
            showToast("Welcome, " + m.name + "!", "Attendance marked", "success");
            renderAttLog();
            updateTodayCount();
          });
        });
    })
    .catch(function (err) {
      if (resultEl) resultEl.innerHTML = '<div class="att-inline-result att-inline-notfound"><i class="fa-solid fa-circle-xmark"></i> Error: ' + err.message + '</div>';
    });
}

function processQR(phone) {
  var el = getEl("scan-result"); if (!el) return;

  // Prevent overlapping Firestore calls while a scan is being processed
  _processing = true;

  el.className = "result-card";
  el.innerHTML = '<div class="rc-head"><h3>Scan Result</h3></div><div class="rc-body"><div class="rc-placeholder"><div class="rcp-icon"><i class="fa-solid fa-spinner fa-spin"></i></div><p>Looking up member…</p></div></div>';

  db.collection("members").where("phone", "==", phone).limit(1).get()
    .then(function (snap) {
      if (snap.empty) {
        el.innerHTML = '<div class="rc-head"><h3>Scan Result</h3></div><div class="rc-body"><div class="rc-placeholder"><div class="rcp-icon" style="color:var(--red)"><i class="fa-solid fa-circle-xmark"></i></div><p>No member found for<br><strong>' + phone + "</strong></p></div></div>";
        showToast("Member not found", phone, "error");
        _processing = false;
        return;
      }
      var m = Object.assign({ id: snap.docs[0].id }, snap.docs[0].data());
      var exp = isExpired(m.expiryDate);
      var dl = daysLeft(m.expiryDate);

      if (!exp) {
        // Mark attendance
        var today = todayStr();
        var dayStart = new Date(today + "T00:00:00");
        var dayEnd = new Date(today + "T23:59:59");
        db.collection("attendance")
          .where("memberId", "==", m.id)
          .where("checkedInAt", ">=", firebase.firestore.Timestamp.fromDate(dayStart))
          .where("checkedInAt", "<=", firebase.firestore.Timestamp.fromDate(dayEnd))
          .get().then(function (attSnap) {
            var already = !attSnap.empty;
            if (!already) {
              db.collection("attendance").add({
                memberId: m.id, phone: m.phone, memberName: m.name, date: today,
                checkedInAt: firebase.firestore.FieldValue.serverTimestamp()
              }).then(function () { renderAttLog(); updateTodayCount(); });
            }
            showResultCard(el, m, exp, dl, already ? "already" : "marked");
            if (!already) showToast("Welcome, " + m.name + "!", "Attendance recorded", "success");
            else showToast(m.name, "Already checked in today", "warning");
            _processing = false;
          });
      } else {
        showResultCard(el, m, exp, dl, "expired");
        showToast(m.name, "Plan expired — please renew", "warning");
        _processing = false;
      }
    })
    .catch(function (err) {
      showToast("Error", err.message, "error");
      _processing = false;
    });
}

function showResultCard(el, m, exp, dl, status) {
  var badgeCls = exp ? "badge-inactive" : dl <= 3 ? "badge-warn" : "badge-active";
  var badgeTxt = exp ? "Expired" : dl <= 3 ? "Expiring" : "Active";
  var photoHtml = m.photoURL ? '<img src="' + m.photoURL + '" alt="' + m.name + '">' :
    m.name.trim().split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
  var bannerHtml = "";
  if (status === "marked") bannerHtml = '<div class="rc-banner ok"><i class="fa-solid fa-circle-check"></i> Attendance marked!</div>';
  if (status === "already") bannerHtml = '<div class="rc-banner already"><i class="fa-solid fa-clock"></i> Already checked in today</div>';
  if (status === "expired") bannerHtml = '<div class="rc-banner no"><i class="fa-solid fa-ban"></i> Plan expired — Not marked</div>';

  el.className = "result-card " + (exp ? "rc-expired" : "rc-active");
  el.innerHTML =
    '<div class="rc-head"><h3>Scan Result</h3><span class="badge ' + badgeCls + '"><span class="badge-dot"></span>' + badgeTxt + '</span></div>' +
    '<div class="rc-body"><div class="rc-profile"><div class="rc-photo">' + photoHtml + '</div><div class="rc-name">' + m.name + '</div></div>' +
    '<div class="rc-details">' +
    '<div class="rc-row"><span class="rdl">Phone</span><span class="rdv">' + m.phone + '</span></div>' +
    '<div class="rc-row"><span class="rdl">Member Since</span><span class="rdv">' + fmtDate(m.admissionDate) + '</span></div>' +
    '<div class="rc-row"><span class="rdl">Plan Expiry</span><span class="rdv" style="color:' + (exp ? "var(--red)" : "var(--green)") + '">' + fmtDate(m.expiryDate) + '</span></div>' +
    '<div class="rc-row"><span class="rdl">Days Remaining</span><span class="rdv">' + (exp ? '<span style="color:var(--red)">Expired</span>' : dl + " day" + (dl !== 1 ? "s" : "")) + '</span></div>' +
    '</div>' + bannerHtml + '</div>';
}

function renderAttLog() {
  var el = getEl("att-log"); if (!el) return;
  var today = todayStr();
  var dayStart = new Date(today + "T00:00:00");
  var dayEnd = new Date(today + "T23:59:59");
  // No orderBy() — avoids needing a Firestore composite index
  db.collection("attendance")
    .where("checkedInAt", ">=", firebase.firestore.Timestamp.fromDate(dayStart))
    .where("checkedInAt", "<=", firebase.firestore.Timestamp.fromDate(dayEnd))
    .get()
    .then(function (snap) {
      var list = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      // Sort newest first client-side
      list.sort(function (a, b) {
        var ta = a.checkedInAt ? a.checkedInAt.seconds : 0;
        var tb = b.checkedInAt ? b.checkedInAt.seconds : 0;
        return tb - ta;
      });
      updateTodayCountFromList(list.length);
      if (!list.length) {
        el.innerHTML = '<div class="empty-state" style="padding:28px"><div class="es-icon"><i class="fa-solid fa-list-check"></i></div><h3>No check-ins yet</h3><p>Attendance will appear here in real time</p></div>';
        return;
      }
      el.innerHTML = list.map(function (a) {
        var initials = (a.memberName || a.phone).trim().split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
        return '<div class="att-item"><div class="member-photo" style="width:34px;height:34px;font-size:12px;flex-shrink:0">' + initials + '</div>' +
          '<div><div class="mc-name">' + (a.memberName || a.phone) + '</div><div class="mc-sub">' + a.phone + "</div></div>" +
          '<div class="att-chip">' + fmtTime(a.checkedInAt) + "</div></div>";
      }).join("");
    })
    .catch(function (err) {
      console.error("renderAttLog error:", err.code, err.message);
    });
}

function updateTodayCount() {
  var today = todayStr();
  var dayStart = new Date(today + "T00:00:00");
  var dayEnd = new Date(today + "T23:59:59");
  db.collection("attendance")
    .where("checkedInAt", ">=", firebase.firestore.Timestamp.fromDate(dayStart))
    .where("checkedInAt", "<=", firebase.firestore.Timestamp.fromDate(dayEnd))
    .get().then(function (snap) { updateTodayCountFromList(snap.size); });
}

function updateTodayCountFromList(n) {
  document.querySelectorAll(".today-count, #today-count, #today-count-2").forEach(function (el) { el.textContent = n; });
}

/* ═══════════════════════════════════════════════════════════
   ██████  REPORTS PAGE
═══════════════════════════════════════════════════════════ */

function initReports() {
  requireAuth(function () {
    // No orderBy() on either collection — avoids needing Firestore composite indexes.
    // Both are sorted client-side after fetch.
    Promise.all([
      db.collection("members").get(),
      db.collection("attendance").get()
    ]).then(function (results) {
      var members = results[0].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      var attendance = results[1].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });

      // Sort client-side
      members.sort(function (a, b) {
        var ta = a.createdAt ? a.createdAt.seconds : 0;
        var tb = b.createdAt ? b.createdAt.seconds : 0;
        return tb - ta;
      });
      attendance.sort(function (a, b) {
        var ta = a.checkedInAt ? a.checkedInAt.seconds : 0;
        var tb = b.checkedInAt ? b.checkedInAt.seconds : 0;
        return tb - ta;
      });
      var today = todayStr();
      var now = new Date();
      var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      setText("rep-total", members.length);
      setText("rep-active", members.filter(function (m) { return !isExpired(m.expiryDate); }).length);
      setText("rep-expired", members.filter(function (m) { return isExpired(m.expiryDate); }).length);
      setText("rep-today", attendance.filter(function (a) { return a.date === today; }).length);
      setText("rep-total-att", attendance.length);
      setText("rep-month-att", attendance.filter(function (a) { return a.date >= monthStart; }).length);

      // Members stat panel
      var msEl = getEl("rep-members-stat");
      if (msEl) {
        var expiring7 = members.filter(function (m) { var d = daysLeft(m.expiryDate); return d >= 0 && d <= 7; }).length;
        var rows = [
          ["Total Registered", members.length],
          ["Active Plans", members.filter(function (m) { return !isExpired(m.expiryDate); }).length],
          ["Expired Plans", members.filter(function (m) { return isExpired(m.expiryDate); }).length],
          ["Expiring in 7 days", expiring7],
          ["With Profile Photo", members.filter(function (m) { return m.photoURL; }).length]
        ];
        msEl.innerHTML = rows.map(function (r) {
          return '<div class="report-stat"><span class="report-stat-label">' + r[0] + '</span><span class="report-stat-val">' + r[1] + "</span></div>";
        }).join("");
      }

      // Attendance stat panel
      var asEl = getEl("rep-att-stat");
      if (asEl) {
        var uniqueDays = new Set(attendance.map(function (a) { return a.date; })).size;
        var rows2 = [
          ["All-time Check-ins", attendance.length],
          ["This Month", attendance.filter(function (a) { return a.date >= monthStart; }).length],
          ["Today", attendance.filter(function (a) { return a.date === today; }).length],
          ["Days with Attendance", uniqueDays],
          ["Avg Check-ins / Day", uniqueDays > 0 ? (attendance.length / uniqueDays).toFixed(1) : 0],
          ["Unique Members Visited", new Set(attendance.map(function (a) { return a.memberId; })).size]
        ];
        asEl.innerHTML = rows2.map(function (r) {
          return '<div class="report-stat"><span class="report-stat-label">' + r[0] + '</span><span class="report-stat-val">' + r[1] + "</span></div>";
        }).join("");
      }

      // Calendar
      renderCalendar(attendance);

      // ── Performance table — build row data then hand off to the
      //    interactive table engine (search / filter / pagination / checkboxes)
      var today = todayStr();
      var _repRows = members.map(function (m) {
        var exp = isExpired(m.expiryDate);
        var dl = daysLeft(m.expiryDate);
        var mAtt = attendance.filter(function (a) { return a.memberId === m.id; });
        var lastAtt = mAtt.slice().sort(function (a, b) {
          return (b.checkedInAt && b.checkedInAt.seconds || 0) - (a.checkedInAt && a.checkedInAt.seconds || 0);
        })[0];
        var todayChk = attendance.some(function (a) { return a.memberId === m.id && a.date === today; });
        return {
          id: m.id,
          name: m.name,
          phone: m.phone,
          exp: exp,
          dl: dl,
          admission: m.admissionDate,
          expiry: m.expiryDate,
          visits: mAtt.length,
          lastDate: lastAtt ? lastAtt.date : null,
          todayChk: todayChk,
          photoURL: m.photoURL || "",
          // pre-built avatar HTML for fast re-render
          avatarHTML: memberAvatarHTML(m, 32)
        };
      });

      // Store globally so filter/pagination functions can access it
      window._repAllRows = _repRows;
      window._repFilteredRows = _repRows.slice();
      window._repPage = 1;
      window._repSelected = {};   // { rowId: true }

      repRenderTable();

      // Bind export buttons
      window._reportData = { members: members, attendance: attendance };

    }).catch(function (err) { showToast("Failed to load reports", err.message, "error"); });
  });
}

/* ═══════════════════════════════════════════════════════════
   ██████  PERFORMANCE TABLE ENGINE
   search · status filter · pagination · row checkboxes
   All functions are prefixed rep* to avoid name collisions.
═══════════════════════════════════════════════════════════ */

// Called by search input and status dropdown (oninput / onchange)
window.repApplyFilters = function () {
  if (!window._repAllRows) return;
  var q = (getEl("rep-search") ? getEl("rep-search").value.toLowerCase() : "");
  var st = (getEl("rep-status-filter") ? getEl("rep-status-filter").value : "all");

  window._repFilteredRows = window._repAllRows.filter(function (r) {
    var matchQ = !q || r.name.toLowerCase().indexOf(q) !== -1 || r.phone.indexOf(q) !== -1;
    var matchSt = st === "all" ||
      (st === "active" && !r.exp) ||
      (st === "expired" && r.exp);
    return matchQ && matchSt;
  });

  window._repPage = 1;          // reset to first page on every filter change
  window._repSelected = {};     // clear selections when filter changes
  repRenderTable();
};

// Renders the current page of filtered rows into the tbody + pagination bar
function repRenderTable() {
  var tbody = getEl("rep-tbl-body");
  if (!tbody) return;

  var allRows = window._repFilteredRows || [];
  var perPage = parseInt((getEl("rep-per-page") ? getEl("rep-per-page").value : "10"), 10) || 10;
  var page = window._repPage || 1;
  var total = allRows.length;
  var pages = Math.max(1, Math.ceil(total / perPage));

  // Clamp page to valid range
  if (page > pages) { page = pages; window._repPage = page; }

  var start = (page - 1) * perPage;
  var pageRows = allRows.slice(start, start + perPage);

  // Count label
  var cntEl = getEl("rep-count-label");
  if (cntEl) cntEl.textContent = total + " member" + (total !== 1 ? "s" : "");

  // ── Empty state ────────────────────────────────────────
  if (!total) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state" style="padding:36px">' +
      '<div class="es-icon"><i class="fa-solid fa-magnifying-glass"></i></div>' +
      '<h3>No members match</h3><p>Try adjusting your search or filter.</p>' +
      '</div></td></tr>';
    repRenderPagination(0, 1, 1, perPage);
    repUpdateSelectionBar();
    return;
  }

  // ── Are ALL rows on this page selected? ───────────────
  var allPageSelected = pageRows.every(function (r) { return window._repSelected[r.id]; });

  // ── Build rows ─────────────────────────────────────────
  tbody.innerHTML = pageRows.map(function (r) {
    var checked = window._repSelected[r.id] ? " checked" : "";
    var selCls = window._repSelected[r.id] ? " row-selected" : "";
    var badgeCls = r.exp ? "badge-inactive" : r.dl <= 3 ? "badge-warn" : "badge-active";
    var badgeTxt = r.exp ? "Expired" : r.dl <= 3 ? "Expiring" : "Active";

    return "<tr class='rep-row" + selCls + "' data-id='" + r.id + "'>" +
      "<td class='col-chk'><input type='checkbox' class='rep-row-chk'" + checked +
      " onchange=\"repToggleRow('" + r.id + "',this)\"></td>" +
      "<td><div class='member-cell'>" + r.avatarHTML +
      "<div><div class='mc-name'>" + r.name + "</div><div class='mc-sub'>" + r.phone + "</div></div></div></td>" +
      "<td>" + fmtDate(r.admission) + "</td>" +
      "<td>" + fmtDate(r.expiry) + "</td>" +
      "<td><span class='badge " + badgeCls + "'><span class='badge-dot'></span>" + badgeTxt + "</span></td>" +
      "<td style='text-align:center;font-weight:600'>" + r.visits + "</td>" +
      "<td style='font-size:12px'>" + (r.lastDate ? fmtDate(r.lastDate) : "Never") + "</td>" +
      "<td style='text-align:center'>" + (r.todayChk ? "✅" : "—") + "</td>" +
      "</tr>";
  }).join("");

  // Sync select-all checkbox header state
  var chkAll = getEl("rep-chk-all");
  if (chkAll) {
    chkAll.checked = allPageSelected && pageRows.length > 0;
    chkAll.indeterminate = !allPageSelected && pageRows.some(function (r) { return window._repSelected[r.id]; });
  }

  repRenderPagination(total, page, pages, perPage);
  repUpdateSelectionBar();
}

// Renders the pagination controls
function repRenderPagination(total, page, pages, perPage) {
  var bar = getEl("rep-pagination");
  var infoEl = getEl("rep-page-info");
  var ctrlEl = getEl("rep-page-controls");
  if (!bar || !infoEl || !ctrlEl) return;

  if (total === 0) { bar.style.display = "none"; return; }
  bar.style.display = "";

  var start = (page - 1) * perPage + 1;
  var end = Math.min(page * perPage, total);
  infoEl.textContent = "Showing " + start + "–" + end + " of " + total;

  // Build page number buttons (show max 5 around current)
  var html = "";

  // Previous
  html += "<button class='rep-page-btn' onclick='repGoPage(" + (page - 1) + ")'" +
    (page <= 1 ? " disabled" : "") + ">" +
    "<i class='fa-solid fa-chevron-left'></i></button>";

  // Page number buttons
  var btnStart = Math.max(1, page - 2);
  var btnEnd = Math.min(pages, page + 2);
  // Always show first page
  if (btnStart > 1) {
    html += "<button class='rep-page-btn' onclick='repGoPage(1)'>1</button>";
    if (btnStart > 2) html += "<span style='padding:0 4px;color:var(--t4)'>…</span>";
  }
  for (var i = btnStart; i <= btnEnd; i++) {
    html += "<button class='rep-page-btn" + (i === page ? " active" : "") +
      "' onclick='repGoPage(" + i + ")'>" + i + "</button>";
  }
  // Always show last page
  if (btnEnd < pages) {
    if (btnEnd < pages - 1) html += "<span style='padding:0 4px;color:var(--t4)'>…</span>";
    html += "<button class='rep-page-btn' onclick='repGoPage(" + pages + ")'>" + pages + "</button>";
  }

  // Next
  html += "<button class='rep-page-btn' onclick='repGoPage(" + (page + 1) + ")'" +
    (page >= pages ? " disabled" : "") + ">" +
    "<i class='fa-solid fa-chevron-right'></i></button>";

  ctrlEl.innerHTML = html;
}

// Navigate to a specific page
window.repGoPage = function (n) {
  var allRows = window._repFilteredRows || [];
  var perPage = parseInt((getEl("rep-per-page") ? getEl("rep-per-page").value : "10"), 10) || 10;
  var pages = Math.max(1, Math.ceil(allRows.length / perPage));
  window._repPage = Math.max(1, Math.min(n, pages));
  repRenderTable();
  // Scroll table into view on page change
  var card = getEl("rep-tbl-body");
  if (card) card.closest(".card").scrollIntoView({ behavior: "smooth", block: "nearest" });
};

// Toggle a single row's selected state
window.repToggleRow = function (id, chk) {
  if (chk.checked) {
    window._repSelected[id] = true;
  } else {
    delete window._repSelected[id];
  }
  // Update row highlight class directly without full re-render
  var row = document.querySelector("tr.rep-row[data-id='" + id + "']");
  if (row) row.classList.toggle("row-selected", !!window._repSelected[id]);
  // Update select-all checkbox state
  var allRows = window._repFilteredRows || [];
  var perPage = parseInt((getEl("rep-per-page") ? getEl("rep-per-page").value : "10"), 10) || 10;
  var page = window._repPage || 1;
  var pageRows = allRows.slice((page - 1) * perPage, page * perPage);
  var allPageSelected = pageRows.every(function (r) { return window._repSelected[r.id]; });
  var anySelected = pageRows.some(function (r) { return window._repSelected[r.id]; });
  var chkAll = getEl("rep-chk-all");
  if (chkAll) {
    chkAll.checked = allPageSelected;
    chkAll.indeterminate = !allPageSelected && anySelected;
  }
  repUpdateSelectionBar();
};

// Toggle all rows on the current page
window.repToggleAll = function (chkAll) {
  var allRows = window._repFilteredRows || [];
  var perPage = parseInt((getEl("rep-per-page") ? getEl("rep-per-page").value : "10"), 10) || 10;
  var page = window._repPage || 1;
  var pageRows = allRows.slice((page - 1) * perPage, page * perPage);
  pageRows.forEach(function (r) {
    if (chkAll.checked) {
      window._repSelected[r.id] = true;
    } else {
      delete window._repSelected[r.id];
    }
  });
  repRenderTable(); // full re-render to sync all checkboxes + highlights
};

// Clear all selections
window.repClearSelection = function () {
  window._repSelected = {};
  repRenderTable();
};

// Show / hide the selection info bar
function repUpdateSelectionBar() {
  var bar = getEl("rep-selection-bar");
  var label = getEl("rep-selection-count");
  if (!bar) return;
  var count = Object.keys(window._repSelected).length;
  if (count > 0) {
    bar.classList.add("visible");
    if (label) label.textContent = count + " row" + (count !== 1 ? "s" : "") + " selected";
  } else {
    bar.classList.remove("visible");
  }
}

function renderCalendar(attendance) {
  var container = getEl("att-calendar"); if (!container) return;
  var attDates = new Set(attendance.map(function (a) { return a.date; }));
  var now = new Date();
  var year = now.getFullYear(), month = now.getMonth();
  var firstDay = new Date(year, month, 1).getDay();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var todayD = now.getDate();
  var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var html = '<div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:12px">' +
    now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) + '</div>' +
    '<div class="cal-row">' + days.map(function (d) { return '<div class="cal-day-head">' + d + "</div>"; }).join("") + "</div>" +
    '<div class="cal-row">';
  var count = firstDay;
  for (var i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';
  for (var d = 1; d <= daysInMonth; d++) {
    var ds = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    var n = attendance.filter(function (a) { return a.date === ds; }).length;
    var cls = "cal-day" + (d === todayD ? " today" : attDates.has(ds) ? " has-att" : "");
    html += '<div class="' + cls + '" title="' + (n ? n + " check-in(s)" : ds) + '">' + d + "</div>";
    count++;
    if (count % 7 === 0 && d < daysInMonth) html += '</div><div class="cal-row">';
  }
  while (count % 7 !== 0) { html += '<div class="cal-day empty"></div>'; count++; }
  html += "</div>";
  container.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════
   EXPORT FUNCTIONS (CSV / Excel) — called from report buttons
═══════════════════════════════════════════════════════════ */

function dlBlob(content, filename, mime) {
  var blob = new Blob([content], { type: mime + ";charset=utf-8;" });
  var link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = filename;
  document.body.appendChild(link); link.click();
  setTimeout(function () { document.body.removeChild(link); URL.revokeObjectURL(link.href); }, 100);
}

function toCSV(rows) {
  return rows.map(function (r) {
    return r.map(function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }).join(",");
  }).join("\n");
}

function toXLS(rows) {
  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table>';
  rows.forEach(function (row, i) {
    var t = i === 0 ? "th" : "td";
    html += "<tr>" + row.map(function (v) { return "<" + t + ">" + String(v == null ? "" : v).replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</" + t + ">"; }).join("") + "</tr>";
  });
  return html + "</table></body></html>";
}

window.dlMembersCSV = function (btn) {
  if (!window._reportData) return;
  var data = window._reportData;
  setButtonLoading(btn, true);
  var header = ["ID", "Name", "Phone", "Admission Date", "Expiry Date", "Status", "Total Visits"];
  var rows = data.members.map(function (m) {
    return [m.id.slice(-8).toUpperCase(), m.name, m.phone, m.admissionDate || "", m.expiryDate || "", isExpired(m.expiryDate) ? "Expired" : "Active", data.attendance.filter(function (a) { return a.memberId === m.id; }).length];
  });
  dlBlob(toCSV([header].concat(rows)), "snfitness_members.csv", "text/csv");
  showToast("Downloaded", "snfitness_members.csv", "success");
  setButtonLoading(btn, false);
};

window.dlMembersXLS = function (btn) {
  if (!window._reportData) return;
  var data = window._reportData;
  setButtonLoading(btn, true);
  var header = ["ID", "Name", "Phone", "Admission Date", "Expiry Date", "Status", "Total Visits"];
  var rows = data.members.map(function (m) {
    return [m.id.slice(-8).toUpperCase(), m.name, m.phone, m.admissionDate || "", m.expiryDate || "", isExpired(m.expiryDate) ? "Expired" : "Active", data.attendance.filter(function (a) { return a.memberId === m.id; }).length];
  });
  dlBlob(toXLS([header].concat(rows)), "snfitness_members.xls", "application/vnd.ms-excel");
  showToast("Downloaded", "snfitness_members.xls", "success");
  setButtonLoading(btn, false);
};

window.dlMembersPDF = function (btn) {
  if (!window._reportData) return;
  var data = window._reportData;
  setButtonLoading(btn, true);
  var header = ["ID", "Name", "Phone", "Admission Date", "Expiry Date", "Status", "Total Visits"];
  var rows = data.members.map(function (m) {
    return [m.id.slice(-8).toUpperCase(), m.name, m.phone, m.admissionDate || "", m.expiryDate || "", isExpired(m.expiryDate) ? "Expired" : "Active", data.attendance.filter(function (a) { return a.memberId === m.id; }).length];
  });
  _makeReportPDF("SN.Fitnex — Members Report",
    "Total members: " + data.members.length,
    header, rows, "snfitness_members.pdf");
  showToast("Downloaded", "snfitness_members.pdf", "success");
  setButtonLoading(btn, false);
};

window.dlAttCSV = function (btn) {
  if (!window._reportData) return;
  setButtonLoading(btn, true);
  var header = ["Date", "Member Name", "Phone", "Check-in Time"];
  var rows = window._reportData.attendance.map(function (a) {
    return [a.date || "", a.memberName || "Unknown", a.phone || "", fmtTime(a.checkedInAt)];
  });
  dlBlob(toCSV([header].concat(rows)), "snfitness_attendance.csv", "text/csv");
  showToast("Downloaded", "snfitness_attendance.csv", "success");
  setButtonLoading(btn, false);
};

window.dlAttXLS = function (btn) {
  if (!window._reportData) return;
  setButtonLoading(btn, true);
  var header = ["Date", "Member Name", "Phone", "Check-in Time"];
  var rows = window._reportData.attendance.map(function (a) {
    return [a.date || "", a.memberName || "Unknown", a.phone || "", fmtTime(a.checkedInAt)];
  });
  dlBlob(toXLS([header].concat(rows)), "snfitness_attendance.xls", "application/vnd.ms-excel");
  showToast("Downloaded", "snfitness_attendance.xls", "success");
  setButtonLoading(btn, false);
};

window.dlAttPDF = function (btn) {
  if (!window._reportData) return;
  setButtonLoading(btn, true);
  var header = ["Date", "Member Name", "Phone", "Check-in Time"];
  var rows = window._reportData.attendance.map(function (a) {
    return [a.date || "", a.memberName || "Unknown", a.phone || "", fmtTime(a.checkedInAt)];
  });
  _makeReportPDF("SN.Fitnex — Attendance Report",
    "All-time check-ins: " + rows.length,
    header, rows, "snfitness_attendance.pdf");
  showToast("Downloaded", "snfitness_attendance.pdf", "success");
  setButtonLoading(btn, false);
};

window.dlFullCSV = function (btn) {
  if (!window._reportData) return;
  var data = window._reportData;
  setButtonLoading(btn, true);
  var header = ["Name", "Phone", "Status", "Admission", "Expiry", "Total Visits", "Last Visit"];
  var rows = data.members.map(function (m) {
    var mAtt = data.attendance.filter(function (a) { return a.memberId === m.id; }).sort(function (a, b) { return (b.checkedInAt && b.checkedInAt.seconds || 0) - (a.checkedInAt && a.checkedInAt.seconds || 0); });
    return [m.name, m.phone, isExpired(m.expiryDate) ? "Expired" : "Active", m.admissionDate || "", m.expiryDate || "", mAtt.length, mAtt[0] ? fmtDate(mAtt[0].date) : "Never"];
  });
  dlBlob(toCSV([header].concat(rows)), "snfitness_full_report.csv", "text/csv");
  showToast("Downloaded", "snfitness_full_report.csv", "success");
  setButtonLoading(btn, false);
};

window.dlFullPDF = function (btn) {
  if (!window._reportData) return;
  var data = window._reportData;
  setButtonLoading(btn, true);
  var header = ["Name", "Phone", "Status", "Admission", "Expiry", "Total Visits", "Last Visit"];
  var rows = data.members.map(function (m) {
    var mAtt = data.attendance.filter(function (a) { return a.memberId === m.id; }).sort(function (a, b) { return (b.checkedInAt && b.checkedInAt.seconds || 0) - (a.checkedInAt && a.checkedInAt.seconds || 0); });
    return [m.name, m.phone, isExpired(m.expiryDate) ? "Expired" : "Active", m.admissionDate || "", m.expiryDate || "", mAtt.length, mAtt[0] ? fmtDate(mAtt[0].date) : "Never"];
  });
  _makeReportPDF("SN.Fitnex — Full Combined Report",
    "Members: " + data.members.length + "  |  All-time check-ins: " + data.attendance.length,
    header, rows, "snfitness_full_report.pdf");
  showToast("Downloaded", "snfitness_full_report.pdf", "success");
  setButtonLoading(btn, false);
};

/* ── Shared PDF builder used by all report PDF buttons ───────
   Uses jsPDF + autoTable (loaded in reports.html).
   Landscape A4, branded blue header, striped table, page footer.
─────────────────────────────────────────────────────────── */
function _makeReportPDF(title, subtitle, header, rows, filename) {
  var jsPDF = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (window.jsPDF || null);
  if (!jsPDF) { showToast("PDF library not loaded", "Please refresh and try again", "error"); return; }

  var doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  var pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(67, 97, 238);
  doc.rect(0, 0, pageW, 20, "F");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageW / 2, 9, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle + "   |   Generated on " + new Date().toLocaleDateString("en-IN"),
    pageW / 2, 16, { align: "center" });

  // Table
  doc.autoTable({
    startY: 24,
    head: [header],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [67, 97, 238], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [245, 246, 250] },
    margin: { left: 12, right: 12 },
    didDrawPage: function (data) {
      var n = doc.internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 160);
      doc.text("Page " + data.pageNumber + " of " + n,
        pageW / 2, doc.internal.pageSize.getHeight() - 5, { align: "center" });
    }
  });

  doc.save(filename);
}

/* ═══════════════════════════════════════════════════════════
     FEATURE 1 — ADMISSION PDF DOWNLOAD
   Uses jsPDF (loaded in add-member.html).
   Reads _lastAddedMember set by initAddMember on save.
═══════════════════════════════════════════════════════════ */

window.downloadAdmissionPDF = function () {
  var m = _lastAddedMember;
  if (!m) { showToast("No member data", "Please register a member first", "error"); return; }

  // jsPDF UMD exposes window.jspdf.jsPDF
  var jsPDF = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (window.jsPDF || null);
  if (!jsPDF) { showToast("PDF library not loaded", "Please refresh and try again", "error"); return; }

  var doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
  var W = doc.internal.pageSize.getWidth();   // A5 = 148 mm
  var y = 0;  // current Y cursor

  //  Helpers 
  function line(text, fontSize, fontStyle, color, align, yPos) {
    doc.setFontSize(fontSize || 12);
    doc.setFont("helvetica", fontStyle || "normal");
    doc.setTextColor.apply(doc, color || [30, 30, 30]);
    doc.text(text, align === "center" ? W / 2 : 12, yPos !== undefined ? yPos : y, { align: align || "left" });
  }
  function separator(yPos) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(12, yPos, W - 12, yPos);
  }
  function labelValue(label, value, yPos) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(label, 14, yPos);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(value || "—", 55, yPos);
  }

  //  Header
  doc.setFillColor(67, 97, 238);        
  doc.rect(0, 0, W, 24, "F");
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("SN.Fitnex", W / 2, 10, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Membership Admission Card", W / 2, 17, { align: "center" });

  y = 32;

  //  Photo or avatar circle 
  var photoLoaded = false;
  function renderBody() {
    // Member name
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(m.name, W / 2, y + (photoLoaded ? 0 : 0), { align: "center" });
    y += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Member since " + fmtDate(m.admissionDate), W / 2, y, { align: "center" });
    y += 9;

    separator(y); y += 7;

    // Details
    var rows = [
      ["Member ID", m.id.slice(-8).toUpperCase()],
      ["Phone Number", m.phone],
      ["Admission Date", fmtDate(m.admissionDate)],
      ["Plan Expiry", fmtDate(m.expiryDate)]
    ];
    rows.forEach(function (r) {
      labelValue(r[0], r[1], y);
      y += 8;
    });

    separator(y); y += 8;

    // Status badge text
    var isExp = isExpired(m.expiryDate);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isExp ? 220 : 22, isExp ? 38 : 163, isExp ? 38 : 74);
    doc.text("Plan Status: " + (isExp ? "EXPIRED" : "ACTIVE"), W / 2, y, { align: "center" });
    y += 10;

    separator(y); y += 7;

    // Footer note
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(160, 160, 160);
    doc.text("This is a computer-generated admission card.", W / 2, y, { align: "center" });
    y += 5;
    doc.text("Printed on " + new Date().toLocaleDateString("en-IN"), W / 2, y, { align: "center" });

    // Bottom accent line 
    doc.setFillColor(67, 97, 238);
    doc.rect(0, doc.internal.pageSize.getHeight() - 6, W, 6, "F");

    doc.save("SN_Fitness_Admission_" + m.name.replace(/\s+/g, "_") + ".pdf");
    showToast("PDF downloaded!", m.name + "'s admission card saved", "success");
  }

  // If member has a photo, embed it; otherwise go straight to renderBody
  if (m.photoURL) {
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      try {
        // Draw circular clip using canvas
        var size = 28; // mm diameter
        var canvas = document.createElement("canvas");
        var px = Math.round(size * 3.78); 
        canvas.width = px; canvas.height = px;
        var ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, px, px);
        var dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        doc.addImage(dataUrl, "JPEG", (W - size) / 2, y, size, size);
        y += size + 5;
        photoLoaded = true;
      } catch (_) { /* CORS or draw failed — skip photo */ }
      renderBody();
    };
    img.onerror = function () { renderBody(); }; // photo failed to load
    img.src = m.photoURL;
  } else {
    
    var initials = m.name.trim().split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
    var cx = W / 2, cy = y + 14, r = 14;
    doc.setFillColor(238, 240, 253); // brand-light
    doc.circle(cx, cy, r, "F");
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(67, 97, 238);
    doc.text(initials, cx, cy + 5, { align: "center" });
    y += r * 2 + 6;
    renderBody();
  }
};

/* ═══════════════════════════════════════════════════════════
   ██████  ADMISSION REPORT BY DATE RANGE
   Filters the already-loaded _reportData.members array by
   admissionDate (client-side, no extra Firestore query).
   Downloads as CSV or XLS.
═══════════════════════════════════════════════════════════ */

window.dlAdmissionRange = function (btn, format) {
  var startEl = getEl("adm-range-start");
  var endEl = getEl("adm-range-end");

  if (!startEl || !endEl) { showToast("Error", "Date inputs not found", "error"); return; }

  var start = startEl.value;
  var end = endEl.value;

  if (!start || !end) {
    showToast("Select dates", "Please choose both a start and end date", "warning");
    return;
  }
  if (start > end) {
    showToast("Invalid range", "Start date must be before end date", "warning");
    return;
  }
  if (!window._reportData || !window._reportData.members) {
    showToast("Data not ready", "Please wait for the report to finish loading", "warning");
    return;
  }

  setButtonLoading(btn, true);

  // Filter members whose admissionDate falls within the selected range.
  // admissionDate is stored as "YYYY-MM-DD" — ISO string comparison is correct.
  var filtered = window._reportData.members.filter(function (m) {
    var adm = m.admissionDate || "";
    return adm >= start && adm <= end;
  });

  if (!filtered.length) {
    setButtonLoading(btn, false);
    showToast("No records", "No members with admission dates in this range", "info");
    return;
  }

  // Sort by admission date ascending
  filtered.sort(function (a, b) {
    return (a.admissionDate || "") < (b.admissionDate || "") ? -1 : 1;
  });

  var header = ["Member Name", "Phone", "Admission Date", "Expiry Date", "Status"];
  var rows = filtered.map(function (m) {
    return [
      m.name || "",
      m.phone || "",
      m.admissionDate || "",
      m.expiryDate || "",
      isExpired(m.expiryDate) ? "Expired" : "Active"
    ];
  });

  var filename = "snfitness_admissions_" + start + "_to_" + end;

  if (format === "csv") {
    dlBlob(toCSV([header].concat(rows)), filename + ".csv", "text/csv");
    showToast("Downloaded", filename + ".csv (" + filtered.length + " members)", "success");
  } else if (format === "xls") {
    dlBlob(toXLS([header].concat(rows)), filename + ".xls", "application/vnd.ms-excel");
    showToast("Downloaded", filename + ".xls (" + filtered.length + " members)", "success");
  } else if (format === "pdf") {
    _makeReportPDF(
      "SN.Fitnex — Admission Report",
      "Period: " + fmtDate(start) + "  →  " + fmtDate(end) + "   |   Members: " + filtered.length,
      header, rows, filename + ".pdf"
    );
    showToast("Downloaded", filename + ".pdf (" + filtered.length + " members)", "success");
  }

  setButtonLoading(btn, false);
};

document.addEventListener("DOMContentLoaded", function () {
  // ── Mobile sidebar toggle ───────────────────────────────
  var toggle = document.getElementById("menu-toggle");
  var sidebar = document.querySelector(".sidebar");
  var backdrop = document.getElementById("sidebar-backdrop");

  function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    if (backdrop) backdrop.classList.add("visible");
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.remove("visible");
    document.body.style.overflow = "";
  }

  if (toggle) toggle.addEventListener("click", openSidebar);
  if (backdrop) backdrop.addEventListener("click", closeSidebar);

  // Close sidebar on nav link click (mobile)
  document.querySelectorAll(".nav-link").forEach(function (a) {
    a.addEventListener("click", closeSidebar);
  });

  // ── Page init ───────────────────────────────────────────
  var page = location.pathname.split("/").pop() || "index.html";
  if (page === "" || page === "index.html") initLogin();
  if (page === "dashboard.html") initDashboard();
  if (page === "members.html") initMembers();
  if (page === "add-member.html") initAddMember();
  if (page === "scanner.html") initScanner();
  if (page === "reports.html") initReports();
  // attendance.html is fully self-contained in js/attendance-public.js — no init needed here
});

// ============================================================
//  SN.Fitnex — Main Application JavaScript
//  Single file. No imports. Uses Firebase Compat SDK (global).
//  Works with file:// and HTTP both.
//
//  Photo uploads: Cloudinary (uploadToCloudinary — from cloudinary-config.js)
//  Auth + Data:   Firebase Auth + Firestore
//  Storage:       Firebase Storage REMOVED
// ============================================================