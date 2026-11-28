// TELEMAX: yuqori panelga "AI" tugmasi qo'shadi. Bosilganda ai-test.html to'liq ekranda ochiladi.
(function () {
"use strict";

var searchBtn = document.getElementById("tgSearchBtn");
var bar = searchBtn ? searchBtn.parentNode : null;
if (!bar) { console.log("ai.js: yuqori panel topilmadi"); return; }

var css = document.createElement("style");
css.textContent = `
#aiOverlay{position:fixed;inset:0;z-index:70;display:none;flex-direction:column;background:var(--bg,#fff);padding-top:env(safe-area-inset-top,0px)}
#aiOverlay.open{display:flex}
#aiOverlay .aibar{height:56px;display:flex;align-items:center;gap:10px;padding:0 12px;background:var(--panel);color:var(--text);border-bottom:1px solid var(--border);font-weight:bold}
#aiOverlay .aibar button{background:none;border:0;color:var(--text);font-size:24px;padding:6px 10px}
#aiOverlay iframe{flex:1;width:100%;border:0}
#tgAiBtn{font-size:22px}
`;
document.head.appendChild(css);

var btn = document.createElement("button");
btn.className = "tg-ico tg-in-only";
btn.id = "tgAiBtn";
btn.type = "button";
btn.setAttribute("aria-label", "Telemax AI");
btn.textContent = "🤖";
bar.insertBefore(btn, searchBtn);

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
