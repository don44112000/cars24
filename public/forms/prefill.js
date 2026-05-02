/* Shared prefill helper for Form 28/29/30/32/35/36 templates.
 * Reads JSON data from URL hash (#data=<base64>) and fills matching fields by ID.
 * Runs after each template's own loadData() so it overwrites any cached values.
 */
(function () {
  try {
    var hash = window.location.hash || '';
    var m = hash.match(/data=([^&]+)/);
    if (!m) return;
    var json = decodeURIComponent(m[1]);
    var data = JSON.parse(json);
    Object.keys(data).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var val = data[id];
      if (el.type === 'checkbox') {
        el.checked = !!val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        el.value = val == null ? '' : String(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    // Optional: reveal a small "pre-filled" badge
    var note = document.createElement('div');
    note.textContent = 'Pre-filled from RC Ready · review before printing';
    note.style.cssText =
      'position:fixed;top:10px;right:10px;background:#1a56db;color:#fff;' +
      'font-family:Arial,sans-serif;font-size:12px;padding:6px 10px;' +
      'border-radius:4px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.2);';
    document.body.appendChild(note);
    setTimeout(function () { note.style.opacity = '0'; note.style.transition = 'opacity .4s'; }, 4000);
    setTimeout(function () { note.remove(); }, 4500);
  } catch (e) {
    console.warn('Form prefill failed:', e);
  }
})();
