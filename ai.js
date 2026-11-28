// TELEMAX: chatlar ro'yxatining eng tepasiga "Telemax AI" chatini qo'shadi.
// Bosilganda ai-test.html to'liq ekranda ochiladi.
(function () {
"use strict";

var list = document.getElementById("chatList");
if (!list) { console.log("ai.js: chatList topilmadi"); return; }

var css = document.createElement("style");
css.textContent = `
#aiOverlay{position:fixed;inset:0;z-index:70;display:none;flex-direction:column;background:var(--bg,#fff);padding-top:env(safe-area-inset-top,0px)}
#aiOverlay.open{display:flex}
#aiOverlay .aibar{height:56px;display:flex;align-items:center;gap:10px;padding:0 12px;background:var(--panel);color:var(--text);border-bottom:1px solid var(--border);font-weight:bold}
#aiOverlay .aibar button{background:none;border:0;color:var(--text);font-size:24px;padding:6px 10px}
#aiOverlay iframe{flex:1;width:100%;border:0}
#aiChatRow .avatar{font-size:28px}
`;
document.head.appendChild(css);

var overlay = document.createElement("div");
overlay.id = "aiOverlay";
overlay.innerHTML = '<div class="aibar"><button type="button" aria-label="Orqaga">←</button><span>Telemax AI</span></div>';
var frame = document.createElement("iframe");
frame.title = "Telemax AI";
overlay.appendChild(frame);
document.body.appendChild(overlay);

function openAI() {
 if (!frame.getAttribute("src")) frame.src = "ai-test.html";
 overlay.classList.add("open");
}
overlay.querySelector("button").addEventListener("click", function () {
 overlay.classList.remove("open");
});

function buildRow() {
 var row = document.createElement("div");
 row.className = "chat-row";
 row.id = "aiChatRow";

 var avatar = document.createElement("div");
 avatar.className = "avatar";
 avatar.textContent = "🤖";

 var info = document.createElement("div");
 info.className = "userinfo";
 var title = document.createElement("b");
 title.textContent = "Telemax AI";
 var preview = document.createElement("small");
 preview.className = "chat-preview";
 preview.textContent = "Sun’iy intellekt yordamchi";
 info.append(title, preview);

 row.append(avatar, info);
 row.addEventListener("click", openAI);
 return row;
}

function ensureRow() {
 var searchBox = document.getElementById("search");
 var term = ((searchBox && searchBox.value) || "").trim().toLowerCase();
 var show = !term || "telemax ai".indexOf(term) !== -1;
 var existing = document.getElementById("aiChatRow");

 if (!show) { if (existing) existing.remove(); return; }
 if (existing && existing === list.firstChild) return;
 if (existing) existing.remove();
 list.insertBefore(buildRow(), list.firstChild);
}

// design.js ro'yxatni har safar qayta chizadi, shuning uchun kuzatib turamiz
new MutationObserver(ensureRow).observe(list, { childList: true });
ensureRow();
})();
