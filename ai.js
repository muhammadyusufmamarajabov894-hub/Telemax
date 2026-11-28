// TELEMAX: tepadagi panelga "AI" tugmasi qo'shadi. Bosilganda ai-test.html to'liq ekranda ochiladi.
(function () {
"use strict";

var right = document.querySelector("header .header-right");
if (!right) { console.log("ai.js: header topilmadi"); return; }

var css = document.createElement("style");
css.textContent = `
#aiOverlay{position:fixed;inset:0;z-index:70;display:none;flex-direction:column;background:var(--bg,#fff);padding-top:env(safe-area-inset-top,0px)}
#aiOverlay.open{display:flex}
#aiOverlay .aibar{height:56px;display:flex;align-items:center;gap:10px;padding:0 12px;background:var(--panel);color:var(--text);border-bottom:1px solid var(--border);font-weight:bold}
#aiOverlay .aibar button{background:none;border:0;color:var(--text);font-size:24px;padding:6px 10px}
#aiOverlay iframe{flex:1;width:100%;border:0}
`;
document.head.appendChild(css);

var btn = document.createElement("button");
btn.className = "icon-btn";
btn.title = "Telemax AI";
btn.textContent = "🤖";
right.insertBefore(btn, right.firstChild);

var overlay = document.createElement("div");
overlay.id = "aiOverlay";
overlay.innerHTML = '<div class="aibar"><button type="button" aria-label="Orqaga">←</button><span>Telemax AI</span></div>';
var frame = document.createElement("iframe");
frame.title = "Telemax AI";
overlay.appendChild(frame);
document.body.appendChild(overlay);

btn.addEventListener("click", function () {
 if (!frame.getAttribute("src")) frame.src = "ai-test.html";
 overlay.classList.add("open");
});
overlay.querySelector("button").addEventListener("click", function () {
 overlay.classList.remove("open");
});
})();
