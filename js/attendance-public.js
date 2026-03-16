// ============================================================
//  SN.Fitnex — Public Attendance Page Logic
//  No admin login. No Firebase Auth. Firestore only.
//
//  Flow:
//    1. Member opens attendance.html (via gym QR code)
//    2. Enters phone number → form submit
//    3. Lookup phone in Firestore 'members' collection
//    4a. Active plan   → mark attendance, show member card ✅
//    4b. Expired plan  → show renewal message ⚠️
//    4c. Not found     → show not-found message ❌
// ============================================================

/* ── Helpers ───────────────────────────────────────────── */

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function isExpired(dateStr) {
  if (!dateStr) return true;
  var d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function daysLeft(dateStr) {
  if (!dateStr) return -9999;
  var d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
}

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

function getEl(id) { return document.getElementById(id); }

function setButtonLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Checking…</span>';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.orig || btn.innerHTML;
    btn.disabled = false;
  }
}

/* ── Date badge ────────────────────────────────────────── */

function renderDateBadge() {
  var el = getEl("att-date");
  if (el) {
    el.textContent = new Date().toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  }
}

/* ── Render member photo / avatar ──────────────────────── */

function renderMemberPhoto(containerId, member) {
  var el = getEl(containerId);
  if (!el) return;
  if (member.photoURL) {
    el.innerHTML = '<img src="' + member.photoURL + '" alt="' + member.name + '">';
    el.classList.add("has-photo");
  } else {
    var initials = member.name.trim().split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
    el.textContent = initials;
    el.classList.remove("has-photo");
  }
}

/* ── Render member detail rows ─────────────────────────── */

function renderMemberDetails(containerId, member) {
  var el = getEl(containerId);
  if (!el) return;
  var exp = isExpired(member.expiryDate);
  var dl = daysLeft(member.expiryDate);
  var expiryColor = exp ? "var(--red)" : (dl <= 7 ? "var(--amber)" : "var(--green)");
  var expiryLabel = exp ? "Expired" : (dl === 0 ? "Expires today" : "Expires in " + dl + " day" + (dl !== 1 ? "s" : ""));

  el.innerHTML =
    '<div class="att-detail-row">' +
    '<span class="att-detail-label"><i class="fa-solid fa-phone"></i> Phone</span>' +
    '<span class="att-detail-val">' + member.phone + '</span>' +
    '</div>' +
    '<div class="att-detail-row">' +
    '<span class="att-detail-label"><i class="fa-regular fa-calendar"></i> Member Since</span>' +
    '<span class="att-detail-val">' + fmtDate(member.admissionDate) + '</span>' +
    '</div>' +
    '<div class="att-detail-row">' +
    '<span class="att-detail-label"><i class="fa-solid fa-hourglass-half"></i> Plan Expiry</span>' +
    '<span class="att-detail-val" style="color:' + expiryColor + ';font-weight:700">' +
    fmtDate(member.expiryDate) + ' — ' + expiryLabel +
    '</span>' +
    '</div>';
}

/* ── Show / hide result panels ─────────────────────────── */

function showInputCard() {
  getEl("att-input-card").style.display = "";
  getEl("att-result-card").style.display = "none";
  // Clear all sub-panels
  ["att-result-success", "att-result-already", "att-result-expired", "att-result-notfound"]
    .forEach(function (id) { getEl(id).style.display = "none"; });
  // Reset form
  getEl("att-form").reset();
  getEl("att-error").textContent = "";
  getEl("att-phone").focus();
}

function showResultCard(panelId) {
  getEl("att-input-card").style.display = "none";
  getEl("att-result-card").style.display = "";
  ["att-result-success", "att-result-already", "att-result-expired", "att-result-notfound"]
    .forEach(function (id) { getEl(id).style.display = id === panelId ? "" : "none"; });
  // Scroll to top of result
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ── Main attendance flow ──────────────────────────────── */

function handleAttendance(rawPhone) {
  // Sanitise: digits only
  var phone = rawPhone.replace(/\D/g, "");
  if (phone.length < 7 || phone.length > 15) {
    var errEl = getEl("att-error");
    errEl.textContent = "Please enter a valid phone number (7–15 digits).";
    return;
  }

  var btn = getEl("att-submit");
  setButtonLoading(btn, true);
  getEl("att-error").textContent = "";

  // Step 1: Look up phone in Firestore members collection
  db.collection("members").where("phone", "==", phone).limit(1).get()
    .then(function (snap) {

      // ── NOT FOUND ────────────────────────────────────────
      if (snap.empty) {
        setButtonLoading(btn, false);
        getEl("att-notfound-phone").textContent = phone;
        showResultCard("att-result-notfound");
        return;
      }

      var member = Object.assign({ id: snap.docs[0].id }, snap.docs[0].data());
      var exp = isExpired(member.expiryDate);

      // ── EXPIRED ──────────────────────────────────────────
      if (exp) {
        setButtonLoading(btn, false);
        renderMemberPhoto("att-member-photo-3", member);
        getEl("att-member-name-3").textContent = member.name;
        renderMemberDetails("att-member-details-3", member);
        showResultCard("att-result-expired");
        return;
      }

      // ── ACTIVE — check if already checked in today ───────
      var today = todayStr();
      var dayStart = new Date(today + "T00:00:00");
      var dayEnd = new Date(today + "T23:59:59");

      db.collection("attendance")
        .where("memberId", "==", member.id)
        .where("checkedInAt", ">=", firebase.firestore.Timestamp.fromDate(dayStart))
        .where("checkedInAt", "<=", firebase.firestore.Timestamp.fromDate(dayEnd))
        .get()
        .then(function (attSnap) {
          setButtonLoading(btn, false);

          if (!attSnap.empty) {
            // ── ALREADY CHECKED IN ─────────────────────────
            renderMemberPhoto("att-member-photo-2", member);
            getEl("att-member-name-2").textContent = member.name;
            renderMemberDetails("att-member-details-2", member);
            showResultCard("att-result-already");
            return;
          }

          // ── MARK ATTENDANCE ────────────────────────────────
          db.collection("attendance").add({
            memberId: member.id,
            phone: member.phone,
            memberName: member.name,
            date: today,
            checkedInAt: firebase.firestore.FieldValue.serverTimestamp()
          }).then(function () {
            renderMemberPhoto("att-member-photo", member);
            getEl("att-member-name").textContent = member.name;
            renderMemberDetails("att-member-details", member);
            showResultCard("att-result-success");
          }).catch(function (err) {
            setButtonLoading(btn, false);
            getEl("att-error").textContent = "Could not mark attendance: " + err.message;
          });
        });
    })
    .catch(function (err) {
      setButtonLoading(btn, false);
      var msg = "Connection error. Please try again.";
      if (err && err.code === "permission-denied") {
        msg = "Setup required: Firestore security rules need to allow public access. See SETUP_GUIDE.md for the exact rules to paste in Firebase Console.";
      } else if (err && err.code === "unavailable") {
        msg = "No internet connection. Please check your network and try again.";
      }
      getEl("att-error").textContent = msg;
      console.error("Attendance lookup error:", err);
    });
}

/* ── Auto-dismiss result after 12 seconds ──────────────── */

var _autoDismissTimer = null;

function startAutoDismiss() {
  clearTimeout(_autoDismissTimer);
  _autoDismissTimer = setTimeout(function () {
    showInputCard();
  }, 12000);
}

/* ── Init ──────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", function () {
  renderDateBadge();

  // Form submit
  var form = getEl("att-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var phone = getEl("att-phone").value.trim();
      handleAttendance(phone);
    });
  }

  // "Check In Again" back button
  var backBtn = getEl("att-back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      clearTimeout(_autoDismissTimer);
      showInputCard();
    });
  }

  // Auto-dismiss result panels after 12s so the page resets for the next member
  var observer = new MutationObserver(function () {
    if (getEl("att-result-card").style.display !== "none") {
      startAutoDismiss();
    } else {
      clearTimeout(_autoDismissTimer);
    }
  });
  observer.observe(getEl("att-result-card"), { attributes: true, attributeFilter: ["style"] });

  // Numeric-only input on mobile
  var phoneInput = getEl("att-phone");
  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9]/g, "");
    });
  }

  // Auto-focus the input on load (desktop)
  if (window.innerWidth >= 640 && phoneInput) {
    phoneInput.focus();
  }
});
