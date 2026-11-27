// TELEMAX: xabarni uzoq bosganda chiqadigan menyu (reaksiya, Save, Copy, Pin, Reply, Forward, Delete).
// Asosiy kod (index.html) ishlamasa, bu fayl hech narsani buzmaydi.
(function () {
"use strict";

if (typeof rtdb === "undefined" || typeof getChatId !== "function" || !document.getElementById("messages")) {
 console.log("menu.js: asosiy kod topilmadi, o‘tkazib yuborildi");
 return;
}

var EMOJIS = ["❤️", "👍", "👎", "🔥", "😂", "👏"];
var LONG_PRESS_MS = 450;

function $(id) { return document.getElementById(id); }

// ---------- CSS ----------
var css = document.createElement("style");
css.textContent = `
#messages .msg{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;position:relative}
#messages .msg img{-webkit-touch-callout:none;-webkit-user-drag:none;user-select:none}
.msg.sel{outline:2px solid var(--accent)}
.reply-q{font-size:12px;opacity:.85;border-left:3px solid var(--accent);padding:2px 8px;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
.fwd-tag{display:block;font-size:11px;opacity:.8;margin-bottom:4px}
.rx-row{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.rx-chip{font-size:13px;padding:2px 8px;border-radius:12px;background:#0003;cursor:pointer}
.rx-chip.me{background:var(--accent);color:var(--accent-text)}
#tmMenuBg{position:fixed;inset:0;z-index:40;display:none;background:#0005}
#tmMenu{position:fixed;z-index:41;display:none;min-width:210px;max-width:84vw;background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:16px;box-shadow:0 8px 28px #0007;overflow:hidden}
#tmMenu .rx{display:flex;justify-content:space-around;padding:10px 6px;font-size:26px;border-bottom:1px solid var(--border)}
#tmMenu .rx span{padding:2px 4px;cursor:pointer}
#tmMenu .rx span.me{background:var(--accent);border-radius:10px}
#tmMenu .it{padding:13px 18px;font-size:16px;cursor:pointer;display:flex;gap:12px;align-items:center}
#tmMenu .it:active{background:var(--border)}
#tmMenu .it.danger{color:#ff6b6b}
#tmPinBar{display:none;align-items:center;gap:8px;padding:8px 14px;background:var(--panel);border-bottom:1px solid var(--border);font-size:13px;cursor:pointer}
#tmPinBar b{color:var(--accent)}
#tmPinBar span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tmReplyBar{display:none;align-items:center;gap:8px;padding:8px 14px;background:var(--panel);border-top:1px solid var(--border);font-size:13px}
#tmReplyBar span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-left:3px solid var(--accent);padding-left:8px}
#tmReplyBar button{background:none;border:0;color:var(--text);font-size:18px}
#tmFwd{position:fixed;inset:0;z-index:45;display:none;background:#0008;align-items:flex-end}
#tmFwd .box{background:var(--panel);width:100%;max-height:70vh;overflow-y:auto;border-radius:18px 18px 0 0;padding:10px 0}
#tmFwd .ttl{padding:10px 18px;font-weight:bold}
#tmFwd .row{padding:13px 18px;font-size:16px;border-top:1px solid var(--border);cursor:pointer}
#tmToast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#000c;color:#fff;padding:9px 16px;border-radius:20px;font-size:14px;z-index:60;display:none}
`;
document.head.appendChild(css);

// ---------- Elementlar ----------
var bg = document.createElement("div"); bg.id = "tmMenuBg";
var menu = document.createElement("div"); menu.id = "tmMenu";
var toast = document.createElement("div"); toast.id = "tmToast";
var fwd = document.createElement("div"); fwd.id = "tmFwd";
document.body.append(bg, menu, toast, fwd);

var pinBar = document.createElement("div"); pinBar.id = "tmPinBar";
$("messages").parentNode.insertBefore(pinBar, $("messages"));

var replyBar = document.createElement("div"); replyBar.id = "tmReplyBar";
replyBar.innerHTML = "<span></span><button>✕</button>";
var sendRow = document.querySelector("#chatPage .send");
sendRow.parentNode.insertBefore(replyBar, sendRow);

function showToast(t) {
 toast.textContent = t;
 toast.style.display = "block";
 clearTimeout(showToast.t);
 showToast.t = setTimeout(function () { toast.style.display = "none"; }, 1800);
}

// ---------- Yordamchilar ----------
function msgRef(key) {
 return rtdb.ref("chats/" + getChatId(currentUser.uid, activeChat) + "/messages/" + key);
}

function currentList() {
 var chatId = getChatId(currentUser.uid, activeChat);
 return cacheGet("msgs_" + chatId, []) || [];
}

function findData(key) {
 var l = currentList();
 for (var i = 0; i < l.length; i++) if (l[i]._key === key) return l[i];
 return null;
}

function previewOf(d) {
 if (!d) return "";
 var t = d.type || "text";
 if (t === "image") return "🖼 Rasm";
 if (t === "video") return "🎬 Video";
 if (t === "audio") return "🎤 Ovozli xabar";
 if (t === "file") return "📄 " + (d.fileName || "Fayl");
 return (d.text || "").slice(0, 80);
}

function closeMenu() {
 menu.style.display = "none";
 bg.style.display = "none";
 var s = document.querySelector(".msg.sel");
 if (s) s.classList.remove("sel");
}

// ---------- Menyuni ochish ----------
var pressTimer = null, startX = 0, startY = 0;

function openMenu(el, x, y) {
 var key = el.dataset.key;
 if (!key) { showToast("Xabar hali yuklanmoqda"); return; }
 var d = findData(key);
 if (!d) return;

 var mine = d.senderId === currentUser.uid;
 var type = d.type || "text";
 var hasUrl = !!el.dataset.url;
 var myRx = [];
 if (d.reactions) Object.keys(d.reactions).forEach(function (e) {
  if (d.reactions[e] && d.reactions[e][currentUser.uid]) myRx.push(e);
 });

 var html = '<div class="rx">' + EMOJIS.map(function (e) {
  return '<span data-r="' + e + '"' + (myRx.indexOf(e) !== -1 ? ' class="me"' : '') + '>' + e + '</span>';
 }).join("") + '</div>';
 if (hasUrl) html += '<div class="it" data-a="save">💾 Save to Gallery</div>';
 if (type === "text") html += '<div class="it" data-a="copy">📋 Copy</div>';
 if (type === "image" && hasUrl) html += '<div class="it" data-a="copyphoto">🖼 Copy Photo</div>';
 html += '<div class="it" data-a="pin">📌 ' + (d.pinned ? "Unpin" : "Pin") + '</div>';
 html += '<div class="it" data-a="reply">↩ Reply</div>';
 html += '<div class="it" data-a="forward">↪ Forward</div>';
 if (mine) html += '<div class="it danger" data-a="delete">🗑 Delete</div>';
 menu.innerHTML = html;
 menu.dataset.key = key;

 el.classList.add("sel");
 bg.style.display = "block";
 menu.style.display = "block";
 var w = menu.offsetWidth, h = menu.offsetHeight;
 menu.style.left = Math.max(8, Math.min(x - w / 2, innerWidth - w - 8)) + "px";
 menu.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + "px";
 if (navigator.vibrate) navigator.vibrate(15);
}

var box = $("messages");

box.addEventListener("touchstart", function (e) {
 var el = e.target.closest(".msg");
 if (!el || e.target.closest("video,audio,.rx-chip,.reply-q")) return;
 var t = e.touches[0];
 startX = t.clientX; startY = t.clientY;
 clearTimeout(pressTimer);
 pressTimer = setTimeout(function () { openMenu(el, startX, startY); }, LONG_PRESS_MS);
}, { passive: true });

box.addEventListener("touchmove", function (e) {
 var t = e.touches[0];
 if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) clearTimeout(pressTimer);
}, { passive: true });

["touchend", "touchcancel"].forEach(function (ev) {
 box.addEventListener(ev, function () { clearTimeout(pressTimer); }, { passive: true });
});

// Kompyuterda: o'ng tugma. Telefonda brauzer menyusini o'chiradi.
document.addEventListener("contextmenu", function (e) {
 var el = e.target.closest && e.target.closest("#messages .msg");
 if (!el) return;
 e.preventDefault();
 e.stopPropagation();
 if (menu.style.display !== "block") openMenu(el, e.clientX, e.clientY);
}, true);

bg.addEventListener("click", closeMenu);

// Reaksiya chipini bosish va reply iqtibosini bosish
box.addEventListener("click", function (e) {
 var chip = e.target.closest(".rx-chip");
 if (chip) {
  var el = chip.closest(".msg");
  if (el && el.dataset.key) toggleReaction(el.dataset.key, chip.dataset.emoji);
  return;
 }
 var q = e.target.closest(".reply-q");
 if (q && q.dataset.key) scrollToKey(q.dataset.key);
});

function scrollToKey(key) {
 var t = box.querySelector('.msg[data-key="' + key + '"]');
 if (!t) return;
 t.scrollIntoView({ block: "center", behavior: "smooth" });
 t.classList.add("sel");
 setTimeout(function () { t.classList.remove("sel"); }, 1200);
}

// ---------- Amallar ----------
function toggleReaction(key, emoji) {
 var d = findData(key) || {};
 var rx = d.reactions || {};
 var had = !!(rx[emoji] && rx[emoji][currentUser.uid]);
 var updates = {};
 // Bitta odam bitta reaksiya qoldiradi (Telegram kabi)
 Object.keys(rx).forEach(function (e) {
  if (rx[e] && rx[e][currentUser.uid]) updates["reactions/" + e + "/" + currentUser.uid] = null;
 });
 if (!had) updates["reactions/" + emoji + "/" + currentUser.uid] = true;
 msgRef(key).update(updates).catch(function (err) {
  console.error(err);
  showToast("Reaksiya saqlanmadi");
 });
}

function downloadUrl(url) {
 // Cloudinary: fl_attachment faylni ochmasdan yuklab olishga majbur qiladi
 return url.replace("/upload/", "/upload/fl_attachment/");
}

async function copyPhoto(url) {
 try {
  var blob = await (await fetch(url)).blob();
  if (blob.type !== "image/png") {
   var bmp = await createImageBitmap(blob);
   var c = document.createElement("canvas");
   c.width = bmp.width; c.height = bmp.height;
   c.getContext("2d").drawImage(bmp, 0, 0);
   blob = await new Promise(function (r) { c.toBlob(r, "image/png"); });
  }
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  showToast("Rasm nusxalandi");
 } catch (e) {
  try { await navigator.clipboard.writeText(url); showToast("Rasm havolasi nusxalandi"); }
  catch (e2) { showToast("Nusxalab boʻlmadi"); }
 }
}

function copyText(text) {
 function fallback() {
  var ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); showToast("Nusxalandi"); } catch (e) { showToast("Nusxalab boʻlmadi"); }
  ta.remove();
 }
 if (navigator.clipboard && navigator.clipboard.writeText) {
  navigator.clipboard.writeText(text).then(function () { showToast("Nusxalandi"); }, fallback);
 } else fallback();
}

function setReply(d) {
 window.tmReply = { key: d._key, text: previewOf(d), senderId: d.senderId };
 replyBar.firstChild.textContent = previewOf(d);
 replyBar.style.display = "flex";
 $("message").focus();
}
window.tmClearReply = function () {
 window.tmReply = null;
 replyBar.style.display = "none";
};
replyBar.querySelector("button").addEventListener("click", window.tmClearReply);

function openForward(d) {
 var users = (typeof allUsers !== "undefined" ? allUsers : []).filter(function (u) { return u.id !== currentUser.uid; });
 fwd.innerHTML = '<div class="box"><div class="ttl">Kimga yuborish?</div>' +
  (users.length ? "" : '<div class="row">Foydalanuvchilar topilmadi</div>') + '</div>';
 var inner = fwd.firstChild;
 users.forEach(function (u) {
  var row = document.createElement("div");
  row.className = "row";
  row.textContent = (u.data && u.data.name) || "User";
  row.onclick = function () {
   var copy = { senderId: currentUser.uid, createdAt: Date.now(), forwarded: true };
   ["text", "type", "url", "fileName", "size", "duration"].forEach(function (k) {
    if (d[k] !== undefined) copy[k] = d[k];
   });
   var cid = getChatId(currentUser.uid, u.id);
   rtdb.ref("chats/" + cid + "/messages").push().set(copy).then(function () {
    showToast("Yuborildi");
   }).catch(function () { showToast("Yuborilmadi"); });
   fwd.style.display = "none";
  };
  inner.appendChild(row);
 });
 fwd.style.display = "flex";
}
fwd.addEventListener("click", function (e) { if (e.target === fwd) fwd.style.display = "none"; });

menu.addEventListener("click", function (e) {
 var key = menu.dataset.key;
 var d = findData(key);
 var r = e.target.dataset.r;
 var a = e.target.closest(".it") ? e.target.closest(".it").dataset.a : null;
 if (!d) { closeMenu(); return; }

 if (r) toggleReaction(key, r);
 else if (a === "save") {
  var u = d.url;
  var l = document.createElement("a");
  l.href = downloadUrl(u);
  l.download = d.fileName || "telemax";
  l.rel = "noopener";
  document.body.appendChild(l); l.click(); l.remove();
  showToast("Yuklab olinmoqda...");
 }
 else if (a === "copy") copyText(d.text || "");
 else if (a === "copyphoto") copyPhoto(d.url);
 else if (a === "pin") msgRef(key).update({ pinned: d.pinned ? null : true });
 else if (a === "reply") setReply(d);
 else if (a === "forward") openForward(d);
 else if (a === "delete") {
  var item = e.target.closest(".it");
  if (!item.dataset.sure) {
   // WebView'da confirm() ishlamasligi mumkin, shuning uchun ikki bosqichli tasdiq
   item.dataset.sure = "1";
   item.textContent = "⚠ Oʻchirishni tasdiqlang";
   return;
  }
  msgRef(key).remove().catch(function () { showToast("Oʻchirilmadi"); });
 }
 else return;
 closeMenu();
});

// ---------- Pin paneli ----------
function updatePinBar() {
 var pinned = box.querySelectorAll('.msg[data-pinned="1"]');
 if (!pinned.length) { pinBar.style.display = "none"; return; }
 var last = pinned[pinned.length - 1];
 pinBar.innerHTML = "<b>📌</b><span></span>";
 pinBar.lastChild.textContent = previewOf(findData(last.dataset.key) || { text: last.dataset.text });
 pinBar.dataset.key = last.dataset.key;
 pinBar.style.display = "flex";
}
pinBar.addEventListener("click", function () { scrollToKey(pinBar.dataset.key); });

new MutationObserver(updatePinBar).observe(box, { childList: true });

// Suhbat yopilganda reply va menyuni tozalash
var origClose = window.closeChat;
if (typeof origClose === "function") {
 window.closeChat = function () {
  window.tmClearReply();
  closeMenu();
  pinBar.style.display = "none";
  return origClose.apply(this, arguments);
 };
}

})();
