// ============================================================
//  SN.Fitnex — Admin Attendance Page (scanner.html)
//  Generates the gym QR code and provides Print / Copy actions.
//  All inline script moved here to avoid browser rendering bugs.
// ============================================================

function getAttendanceUrl() {
  
  var href = window.location.href.split("?")[0];
  var base = href.substring(0, href.lastIndexOf("/") + 1);
  return base + "attendance.html";
}

function generateGymQR() {
  var url = getAttendanceUrl();
  var urlEl = document.getElementById("att-url-display");
  var box = document.getElementById("gym-qr-box");

  if (urlEl) urlEl.textContent = url;
  if (!box) return;

  // Clear any previous render
  box.innerHTML = "";

  if (typeof QRCode !== "undefined") {
    new QRCode(box, {
      text: url,
      width: 220,
      height: 220,
      colorDark: "#0f1117",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  } else {
    // QRCode lib not yet ready — retry after 500 ms
    setTimeout(generateGymQR, 500);
  }
}

window.printGymQR = function () {
  var url = getAttendanceUrl();
  var win = window.open("", "_blank");
  if (!win) {
    alert("Pop-up blocked. Please allow pop-ups for this site and try again.");
    return;
  }

  // Build the print page as a template string to avoid inline script escaping issues
  var html = [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    "<title>SN.Fitnex Attendance QR</title>",
    "<style>",
    "  body { font-family: sans-serif; text-align: center; padding: 40px; }",
    "  h2   { font-size: 24px; margin-bottom: 4px; }",
    "  p    { color: #555; font-size: 14px; margin-bottom: 24px; }",
    "  .qr-wrap { display: inline-block; border: 2px solid #e5e8ee; padding: 20px; border-radius: 12px; }",
    "  .url { margin-top: 20px; font-size: 12px; color: #888; word-break: break-all; }",
    "</style>",
    "</head>",
    "<body>",
    "<h2>SN.Fitnex</h2>",
    "<p>Scan to mark your gym attendance</p>",
    "<div class='qr-wrap' id='pqr'></div>",
    "<div class='url'>" + url + "</div>",
    "<script src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'><\\/script>",
    "<script>",
    "  new QRCode(document.getElementById('pqr'), {",
    "    text: '" + url.replace(/'/g, "\\'") + "',",
    "    width: 300, height: 300,",
    "    colorDark: '#000', colorLight: '#fff',",
    "    correctLevel: QRCode.CorrectLevel.H",
    "  });",
    "  setTimeout(function() { window.print(); }, 800);",
    "<\\/script>",
    "</body></html>"
  ].join("\n");

  win.document.write(html);
  win.document.close();
};

window.copyAttUrl = function () {
  var url = getAttendanceUrl();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function () {
      if (typeof showToast === "function") showToast("Link copied!", url, "success");
      else alert("Copied: " + url);
    });
  } else {
    var ta = document.createElement("textarea");
    ta.value = url;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    if (typeof showToast === "function") showToast("Link copied!", url, "success");
    else alert("Copied: " + url);
  }
};

// Generate QR after all scripts and DOM are fully ready
window.addEventListener("load", function () {
  generateGymQR();
});
