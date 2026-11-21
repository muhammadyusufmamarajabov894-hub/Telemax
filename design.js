// TELEMAX: Telegram uslubidagi yangi dizayn (yuqori panel, tablar, chatlar ro'yxati, pastki menyu).
// Asosiy kod (index.html) ishlamasa, bu fayl hech narsani buzmaydi.
(function () {
"use strict";

if (typeof rtdb === "undefined" || typeof getChatId !== "function" || !document.getElementById("homePage")) {
 console.log("design.js: asosiy kod topilmadi, o‘tkazib yuborildi");
 return;
}

function $(id) { return document.getElementById(id); }

function cget(key, fallback) {
 try {
  var raw = localStorage.getItem("tm_" + key);
  return raw ? JSON.parse(raw) : fallback;
 } catch (e) { return fallback; }
}

function cset(key, value) {
 try { localStorage.setItem("tm_" + key, JSON.stringify(value)); } catch (e) {}
}

function call(name) {
 var fn = window[name];
 if (typeof fn === "function") return fn.apply(null, Array.prototype.slice.call(arguments, 1));
}

var view = "chats";
var chatFilter = "all";
var unreadCounts = {};
var unreadListeners = {};
var savedRef = null;
var savedHandler = null;
var savedLast = null;

// ---------- Ikonkalar ----------
function svg(inner, size, fill) {
 return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="' + (fill || "none") +
  '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
}

var I = {
 search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 26),
 qr: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h2.5v2.5H14zM19 14h2M14 19.5h2M19 19v2"/>', 26),
 kebab: svg('<circle cx="12" cy="5" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="19" r="1.7" fill="currentColor"/>', 26),
 back: svg('<path d="M15 5l-7 7 7 7"/>', 26),
 chat: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/>', 26),
 chatPlus: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/><path d="M12 8.5v7M8.5 12h7"/>', 30),
 contacts: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18c1-2.4 3-3.5 5.5-3.5s4.5 1.1 5.5 3.5"/>', 26),
 settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>', 26),
 camera: svg('<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>', 28),
 bookmark: svg('<path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4.2L6 21V4a1 1 0 0 1 1-1z"/>', 28, "currentColor"),
 pin: svg('<path d="M9 3h6l-1 6 3 3v2h-5v6l-1 1-1-1v-6H5v-2l3-3z"/>', 15, "currentColor")
};

// ---------- CSS ----------
var style = document.createElement("style");
style.textContent = `
:root{--tab-bg:#1d3347;--count-bg:#2a4258;--fab-bg:#1b3044;--shadow:rgba(0,0,0,.4)}
body.light{
 --bg:#ffffff;--panel:#ffffff;--border:#e8edf2;--border2:#dbe3ea;
 --text:#10161c;--muted:#7b8793;--muted2:#8b96a1;
 --card:#ffffff;--card-border:#eef2f6;--input:#f0f3f6;
 --btn2:#eaf2fb;--item:#f3f6f9;--cancel:#eef2f6;--active:#eef5fd;
 --accent:#2b95f0;--accent-text:#ffffff;--mine:#2b95f0;--handle:#c5ced7;
 --warn:#b45309;--danger:#e5484d;--online:#22a06b;
 --tab-bg:#e4f1fd;--count-bg:#e3e7ec;--fab-bg:#ffffff;--shadow:rgba(15,40,70,.2)
}
header{display:none!important}
#offlineBar{display:none!important}
.top-search,#homePage > h2,#homePage .section-title{display:none}
#homePage{padding:0 0 140px;max-width:650px}
#homeStatus{padding:0 16px;margin:6px 0}

#tgHeader{position:sticky;top:0;z-index:4;background:var(--bg);max-width:650px;margin:0 auto}
.tg-bar{display:flex;align-items:center;gap:4px;padding:12px 8px 8px 14px;min-height:68px}
.tg-me{width:50px;height:50px;padding:3px;border-radius:50%;background:linear-gradient(135deg,#2bd9a9,#2b95f0);flex-shrink:0;margin-right:10px;align-items:center;justify-content:center}
.tg-me .avatar{width:100%;height:100%;font-size:19px;border:2px solid var(--bg)}
.tg-logo{width:42px;height:42px;border-radius:14px;background:var(--accent);color:#fff;font-weight:800;font-size:22px;display:flex;align-items:center;justify-content:center;margin-right:8px;flex-shrink:0}
.tg-title{flex:1;min-width:0;font-size:25px;font-weight:700;color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tg-ico{width:46px;height:46px;padding:0;border-radius:50%;background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tg-ico:active{background:var(--active)}
.tg-in-only{display:none}
body.tg-in .tg-in-only{display:flex}
body.tg-in .tg-out-only{display:none}

.tg-searchbar{display:none;align-items:center;gap:4px;padding:12px 12px 10px 8px;min-height:68px}
#tgHeader.tg-searching .tg-bar{display:none}
#tgHeader.tg-searching .tg-searchbar{display:flex}
#tgSearchWrap{flex:1;min-width:0}
#tgSearchWrap input{margin:0;border:0;border-radius:24px;background:var(--input);padding:13px 18px;font-size:16px}

#tgMenu{display:none;position:absolute;right:10px;top:64px;min-width:230px;background:var(--panel);border:1px solid var(--border);border-radius:16px;box-shadow:0 10px 30px var(--shadow);padding:6px;z-index:6}
#tgMenu.open{display:block}
.tg-menu-item{display:flex;align-items:center;gap:14px;width:100%;background:transparent;color:var(--text);font-weight:500;font-size:16px;padding:13px 14px;border-radius:12px;text-align:left}
.tg-menu-item:active{background:var(--active)}
.tg-menu-item.danger{color:var(--danger)}

.tg-view{display:none}
.tg-view.on{display:block}
.tg-sec{padding:10px 16px 4px;color:var(--accent);font-weight:700;font-size:14px}

#tgTabs{display:flex;gap:4px;margin:4px 14px 10px;padding:5px;background:var(--bg);border-radius:32px;box-shadow:0 1px 10px var(--shadow);overflow-x:auto}
.tg-tab{display:flex;align-items:center;white-space:nowrap;background:transparent;color:var(--muted);font-weight:600;font-size:16px;padding:9px 16px;border-radius:26px}
.tg-tab.active{background:var(--tab-bg);color:var(--accent)}
.tg-count{display:inline-block;min-width:26px;padding:2px 8px;margin-left:8px;border-radius:14px;background:var(--count-bg);color:var(--muted);font-size:13px;font-weight:700;text-align:center}
.tg-tab.active .tg-count{background:var(--accent);color:#fff}

.chat-row,.user{display:flex;align-items:center;gap:14px;padding:10px 16px;background:transparent;border:0;border-radius:0;margin:0}
.chat-row:active,.user:active{background:var(--active)}
.chat-row .avatar,.user .avatar{width:58px;height:58px;font-size:22px;color:#fff}
.userinfo{flex:1;min-width:0}
.chat-row .userinfo b,.user .userinfo b{font-size:17px;font-weight:600;margin-bottom:5px}
.chat-row .chat-preview{font-size:15px;margin-top:0}
.chat-row.unread .userinfo b{font-weight:800}
.chat-row.unread .chat-preview{color:var(--text)}
.row-meta{display:flex;flex-direction:column;align-items:flex-end;gap:7px;align-self:stretch;flex-shrink:0;padding-top:2px}
.chat-time{margin-top:0;font-size:13px}
.badge{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 7px;border-radius:12px;background:var(--accent);color:#fff;font-size:13px;font-weight:700}
.pin-chip{display:inline-flex;align-items:center;gap:5px;background:var(--count-bg);color:var(--muted);border-radius:14px;padding:3px 10px 3px 8px;font-size:13px}
.saved-avatar{background:var(--accent)!important}
.tg-empty{text-align:center;color:var(--muted);padding:40px 24px;font-size:15px;line-height:1.5}

#tgNav{position:fixed;left:0;right:0;bottom:0;margin:0 auto;max-width:650px;z-index:4;background:var(--bg);border-top:1px solid var(--border);display:flex;padding:8px 6px calc(8px + env(safe-area-inset-bottom,0px))}
body:not(.tg-in) #tgNav,body.tg-chat #tgNav{display:none}
.tg-nav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:0;background:transparent;color:var(--text);font-weight:500;font-size:13px}
.tg-nav-ico{position:relative;width:66px;height:34px;border-radius:17px;display:flex;align-items:center;justify-content:center}
.tg-nav-item.active{color:var(--accent);font-weight:700}
.tg-nav-item.active .tg-nav-ico{background:var(--tab-bg)}
.tg-nav-ico .avatar{width:30px;height:30px;font-size:13px;color:#fff}
.tg-nav-badge{position:absolute;top:-7px;right:6px;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:var(--accent);color:#fff;font-size:12px;font-weight:700;align-items:center;justify-content:center;display:none;border:2px solid var(--bg)}
.tg-nav-badge.on{display:inline-flex}

#tgFabs{display:none;position:fixed;right:max(16px,calc((100vw - 650px) / 2 + 16px));bottom:calc(92px + env(safe-area-inset-bottom,0px));flex-direction:column;align-items:flex-end;gap:14px;z-index:4}
#tgFabs.on{display:flex}
body:not(.tg-in) #tgFabs,body.tg-chat #tgFabs{display:none}
.tg-fab-small{width:56px;height:56px;padding:0;border-radius:18px;background:var(--fab-bg);color:var(--text);box-shadow:0 4px 16px var(--shadow);display:flex;align-items:center;justify-content:center}
.tg-fab{width:68px;height:68px;padding:0;border-radius:22px;background:var(--accent);color:#fff;box-shadow:0 6px 20px var(--shadow);display:flex;align-items:center;justify-content:center}

.st-row{display:flex;align-items:center;gap:16px;width:100%;padding:12px 18px;background:transparent;color:var(--text);font-weight:500;font-size:16px;text-align:left;border-radius:0}
.st-row:active{background:var(--active)}
.st-ico{width:42px;height:42px;border-radius:50%;background:var(--tab-bg);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0}
.st-sub{display:block;font-size:13px;color:var(--muted);font-weight:400;margin-top:3px;overflow-wrap:anywhere}
.st-row.danger{color:var(--danger)}
.st-row.danger .st-ico{background:rgba(229,72,77,.14);color:var(--danger)}
.st-gap{height:10px}

.tg-profile{display:flex;flex-direction:column;align-items:center;padding:26px 20px 10px;text-align:center}
.tg-profile .avatar{width:120px;height:120px;font-size:46px;color:#fff;margin-bottom:16px}
.pf-name{font-size:24px;font-weight:700}
.pf-email{color:var(--muted);margin-top:6px;overflow-wrap:anywhere}
.pf-online{color:var(--online);font-size:14px;margin-top:8px}
.pf-actions{display:grid;gap:10px;width:100%;margin-top:22px}
.pf-actions button{padding:15px;font-size:16px}

.chathead > button{width:44px;height:44px;padding:0;border-radius:50%;background:transparent;color:var(--text);font-size:26px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.chathead > button:active{background:var(--active)}
.chathead .avatar{color:#fff}
`;
document.head.appendChild(style);

// ---------- Interfeys ----------
document.body.insertAdjacentHTML("afterbegin",
 '<div id="tgHeader">' +
  '<div class="tg-bar">' +
   '<button class="tg-me tg-in-only" id="tgMe" type="button" aria-label="Profil"><div class="avatar" id="tgMeAvatar">T</div></button>' +
   '<div class="tg-logo tg-out-only">T</div>' +
   '<div class="tg-title" id="tgTitle">TELEMAX</div>' +
   '<button class="tg-ico tg-in-only" id="tgSearchBtn" type="button" aria-label="Qidirish">' + I.search + '</button>' +
   '<button class="tg-ico" id="tgQrBtn" type="button" aria-label="QR kod">' + I.qr + '</button>' +
   '<button class="tg-ico tg-in-only" id="tgMenuBtn" type="button" aria-label="Menyu">' + I.kebab + '</button>' +
   '<button class="tg-ico tg-out-only" id="tgThemeBtn" type="button" aria-label="Rejim">☀️</button>' +
  '</div>' +
  '<div class="tg-searchbar">' +
   '<button class="tg-ico" id="tgSearchBack" type="button" aria-label="Orqaga">' + I.back + '</button>' +
   '<div id="tgSearchWrap"></div>' +
  '</div>' +
  '<div id="tgMenu">' +
   '<button class="tg-menu-item" id="mnTheme" type="button"><span>◐</span><span id="mnThemeLabel">Rejim</span></button>' +
   '<button class="tg-menu-item" id="mnQr" type="button"><span>▦</span>QR kod</button>' +
   '<button class="tg-menu-item" id="mnInstall" type="button"><span>⬇</span>Ilovani o‘rnatish</button>' +
   '<button class="tg-menu-item danger" id="mnLogout" type="button"><span>⇥</span>Chiqish</button>' +
  '</div>' +
 '</div>'
);

var home = $("homePage");

home.insertAdjacentHTML("beforeend",
 '<div id="viewChats" class="tg-view on">' +
  '<div id="tgTabs">' +
   '<button class="tg-tab active" type="button" data-f="all">Hammasi<span class="tg-count" id="cntAll">0</span></button>' +
   '<button class="tg-tab" type="button" data-f="unread">O‘qilmagan<span class="tg-count" id="cntUnread">0</span></button>' +
  '</div>' +
 '</div>' +
 '<div id="viewContacts" class="tg-view"><div class="tg-sec">Kontaktlar</div></div>' +
 '<div id="viewSettings" class="tg-view"></div>' +
 '<div id="viewProfile" class="tg-view">' +
  '<div class="tg-profile">' +
   '<div class="avatar" id="pfAvatar">T</div>' +
   '<div class="pf-name" id="pfName">User</div>' +
   '<div class="pf-email" id="pfEmail"></div>' +
   '<div class="pf-online">● Online</div>' +
   '<div class="pf-actions">' +
    '<button type="button" id="pfEdit">Profilni tahrirlash</button>' +
    '<button type="button" class="secondary" id="pfPhoto">Rasmni o‘zgartirish</button>' +
   '</div>' +
  '</div>' +
 '</div>'
);

// Mavjud elementlarni yangi joylarga ko'chiramiz (ularning id lari o'zgarmaydi)
$("viewChats").appendChild($("chatList"));
$("viewContacts").appendChild($("users"));
$("tgSearchWrap").appendChild($("search"));
$("search").placeholder = "Qidirish...";

document.body.insertAdjacentHTML("beforeend",
 '<nav id="tgNav">' +
  '<button class="tg-nav-item active" type="button" data-v="chats"><span class="tg-nav-ico">' + I.chat + '<span class="tg-nav-badge" id="navBadge"></span></span>Chatlar</button>' +
  '<button class="tg-nav-item" type="button" data-v="contacts"><span class="tg-nav-ico">' + I.contacts + '</span>Kontaktlar</button>' +
  '<button class="tg-nav-item" type="button" data-v="settings"><span class="tg-nav-ico">' + I.settings + '</span>Sozlamalar</button>' +
  '<button class="tg-nav-item" type="button" data-v="profile"><span class="tg-nav-ico"><div class="avatar" id="navAvatar">T</div></span>Profil</button>' +
 '</nav>' +
 '<div id="tgFabs" class="on">' +
  '<button class="tg-fab-small" id="fabCamera" type="button" aria-label="Profil rasmi">' + I.camera + '</button>' +
  '<button class="tg-fab" id="fabNew" type="button" aria-label="Yangi suhbat">' + I.chatPlus + '</button>' +
 '</div>'
);

// ---------- Sozlamalar sahifasi ----------
function settingsRow(icon, label, sub, id, danger) {
 return '<button class="st-row' + (danger ? ' danger' : '') + '" type="button" id="' + id + '">' +
  '<span class="st-ico">' + icon + '</span>' +
  '<span><span>' + label + '</span>' + (sub ? '<span class="st-sub" id="' + id + 'Sub">' + sub + '</span>' : '') + '</span></button>';
}

$("viewSettings").innerHTML =
 '<div class="tg-sec">Hisob</div>' +
 settingsRow("👤", "Email", "", "stAccount").replace('</span></button>', '<span class="st-sub" id="stEmail"></span></span></button>') +
 settingsRow("✎", "Profilni tahrirlash", "", "stEdit") +
 '<div class="st-gap"></div><div class="tg-sec">Ilova</div>' +
 settingsRow("◐", "Rejim", "Kunduzgi rejim", "stTheme") +
 settingsRow("▦", "QR kod", "Saytga havola", "stQr") +
 settingsRow("⬇", "Ilovani o‘rnatish", "Telefon ekraniga qo‘shish", "stInstall") +
 settingsRow("ℹ", "TELEMAX haqida", "Version 1.3", "stAbout") +
 '<div class="st-gap"></div>' +
 settingsRow("⇥", "Chiqish", "", "stLogout", true);

// ---------- Avatar ranglari ----------
var PALETTE = [
 ["#ff9a5a", "#ff6b6b"], ["#8e9bff", "#5a67d8"], ["#4cd1a0", "#2bb3c0"], ["#ffc15a", "#ff8f4a"],
 ["#b58cff", "#7c5cff"], ["#5ac8fa", "#2b95f0"], ["#ff86b0", "#e0508a"]
];

function initial(name) {
 return (name || "U").trim().charAt(0).toUpperCase() || "U";
}

function colorize(el) {
 if (!el) return;
 if (el.querySelector && el.querySelector("img")) { el.style.background = ""; return; }
 var letter = (el.textContent || "U").trim().charAt(0).toUpperCase() || "U";
 var p = PALETTE[letter.charCodeAt(0) % PALETTE.length];
 el.style.background = "linear-gradient(135deg," + p[0] + "," + p[1] + ")";
}

function buildAvatar(name, photo) {
 var a = document.createElement("div");
 a.className = "avatar";

 if (photo) {
  var img = document.createElement("img");
  img.alt = "Profile";
  img.src = photo;
  img.onerror = function () { a.textContent = initial(name); colorize(a); };
  a.appendChild(img);
 } else {
  a.textContent = initial(name);
  colorize(a);
 }
 return a;
}

// ---------- Profil, sarlavha, ko'rinishlar ----------
function refreshProfileUI() {
 if (!currentUser || !$("tgMeAvatar")) return;

 var name = (typeof myProfile !== "undefined" && myProfile.name) || (currentUser.email || "User").split("@")[0];
 var photo = (typeof myProfile !== "undefined" && myProfile.photoURL) || "";

 ["tgMeAvatar", "navAvatar", "pfAvatar"].forEach(function (id) {
  call("showAvatar", id, name, photo);
  colorize($(id));
 });

 $("pfName").textContent = name;
 $("pfEmail").textContent = currentUser.email || "";
 $("stEmail").textContent = currentUser.email || "";
}

function updateTitle() {
 var titles = { chats: "TELEMAX", contacts: "Kontaktlar", settings: "Sozlamalar", profile: "Profil" };
 $("tgTitle").textContent = navigator.onLine ? titles[view] : "Internet kutilmoqda...";
}

function syncThemeIcons() {
 var light = document.body.classList.contains("light");
 $("tgThemeBtn").textContent = light ? "🌙" : "☀️";
 var label = light ? "Tungi rejim" : "Kunduzgi rejim";
 $("mnThemeLabel").textContent = label;
 if ($("stThemeSub")) $("stThemeSub").textContent = label;
}

function showView(name) {
 view = name;

 ["chats", "contacts", "settings", "profile"].forEach(function (v) {
  $("view" + v.charAt(0).toUpperCase() + v.slice(1)).classList.toggle("on", v === name);
 });

 Array.prototype.forEach.call(document.querySelectorAll(".tg-nav-item"), function (item) {
  item.classList.toggle("active", item.getAttribute("data-v") === name);
 });

 $("tgFabs").classList.toggle("on", name === "chats");
 updateTitle();
 if (name === "profile" || name === "settings") refreshProfileUI();
 window.scrollTo(0, 0);
}

function openSearch() {
 $("tgHeader").classList.add("tg-searching");
 $("search").focus();
}

function closeSearch() {
 $("tgHeader").classList.remove("tg-searching");
 if ($("search").value) {
  $("search").value = "";
  call("filterUsers");
  renderChatListNew();
 }
}

function closeMenu() { $("tgMenu").classList.remove("open"); }

function syncChrome() {
 var inApp = !$("homePage").classList.contains("hidden");
 var chatOpen = !$("chatPage").classList.contains("hidden");

 document.body.classList.toggle("tg-in", inApp);
 document.body.classList.toggle("tg-chat", chatOpen);

 if (inApp) {
  refreshProfileUI();
 } else {
  closeSearch();
  closeMenu();
  view = "chats";
  showView("chats");
 }
}

// ---------- Chatlar ro'yxati ----------
function previewLabel(m) {
 var t = m.type || "text";
 if (t === "image") return "📷 Rasm";
 if (t === "video") return "🎥 Video";
 if (t === "audio") return "🎤 Ovozli xabar";
 if (t === "file") return "📎 " + (m.fileName || "Fayl");
 return m.text || "";
}

function timeLabel(ts) {
 if (!ts) return "";
 if (typeof formatChatTime === "function") return formatChatTime(ts);
 var d = new Date(ts);
 return d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2);
}

function div(className) {
  var el = document.createElement("div");
 el.className = className;
 return el;
}

function badgeText(n) { return n > 99 ? "99+" : String(n); }

function buildChatRow(item) {
 var user = item.user;
 var data = user.data || {};
 var name = data.name || "User";
 var message = item.message || {};
 var n = unreadCounts[user.id] || 0;

 var row = div("chat-row" + (n ? " unread" : ""));
 row.appendChild(buildAvatar(name, data.photoURL));

 var info = div("userinfo");
 var title = document.createElement("b");
 title.textContent = name;
 var preview = document.createElement("small");
 preview.className = "chat-preview";
 preview.textContent = (message.senderId === currentUser.uid ? "Siz: " : "") + previewLabel(message);
 info.append(title, preview);

 var meta = div("row-meta");
 var time = document.createElement("small");
 time.className = "chat-time";
 time.textContent = timeLabel(item.time);
 meta.appendChild(time);

 if (n) {
  var badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = badgeText(n);
  meta.appendChild(badge);
 }

 row.append(info, meta);
 row.onclick = function () { window.openChat(user.id, name, data.photoURL || ""); };
 return row;
}

function buildSavedRow() {
 var row = div("chat-row");

 var avatar = div("avatar saved-avatar");
 avatar.innerHTML = I.bookmark;
 row.appendChild(avatar);

 var info = div("userinfo");
 var title = document.createElement("b");
 title.textContent = "Saqlangan xabarlar";
 var preview = document.createElement("small");
 preview.className = "chat-preview";
 preview.textContent = savedLast ? previewLabel(savedLast) : "Eslatma va fayllarni o‘zingizga saqlang";
 info.append(title, preview);

 var meta = div("row-meta");
 var chip = document.createElement("span");
 chip.className = "pin-chip";
 chip.innerHTML = I.pin;
 if (savedLast && savedLast.createdAt) {
  var t = document.createElement("span");
  t.textContent = timeLabel(savedLast.createdAt);
  chip.appendChild(t);
 }
 meta.appendChild(chip);

 row.append(info, meta);
 row.onclick = function () { window.openChat(currentUser.uid, "Saqlangan xabarlar", ""); };
 return row;
}

function renderChatListNew() {
 var box = $("chatList");
 if (!box) return;

 if (!currentUser) { box.innerHTML = ""; return; }

 var term = (($("search") && $("search").value) || "").trim().toLowerCase();
 var all = Object.values(latestChats || {}).sort(function (a, b) { return b.time - a.time; });

 var unreadChats = all.filter(function (i) { return (unreadCounts[i.user.id] || 0) > 0; }).length;
 var totalUnread = 0;
 Object.keys(unreadCounts).forEach(function (k) { totalUnread += unreadCounts[k] || 0; });

 $("cntAll").textContent = all.length;
 $("cntUnread").textContent = unreadChats;

 var badge = $("navBadge");
 badge.textContent = badgeText(totalUnread);
 badge.classList.toggle("on", totalUnread > 0);

 var items = all.filter(function (i) {
  if (chatFilter === "unread" && !(unreadCounts[i.user.id] > 0)) return false;
  if (!term) return true;
  var d = i.user.data || {};
  return (d.name || "").toLowerCase().indexOf(term) !== -1 || (d.email || "").toLowerCase().indexOf(term) !== -1;
 });

 box.innerHTML = "";

 var showSaved = chatFilter === "all" && (!term || "saqlangan xabarlar".indexOf(term) !== -1);
 if (showSaved) box.appendChild(buildSavedRow());

 items.forEach(function (item) { box.appendChild(buildChatRow(item)); });

 if (!items.length && !showSaved) {
  box.innerHTML = '<div class="tg-empty">' + (chatFilter === "unread" ? "O‘qilmagan xabarlar yo‘q." : "Hech narsa topilmadi.") + '</div>';
 } else if (!items.length && chatFilter === "all" && !term) {
  var hint = div("tg-empty");
  hint.textContent = "Hozircha suhbatlar yo‘q. Pastdagi ko‘k tugma orqali odam bilan suhbat boshlang.";
  box.appendChild(hint);
 }
}

window.renderChatList = renderChatListNew;

// ---------- O'qilmagan xabarlar ----------
function stopUnreadListeners() {
 Object.keys(unreadListeners).forEach(function (id) {
  var item = unreadListeners[id];
  try { item.ref.off("value", item.handler); } catch (e) {}
 });
 unreadListeners = {};

 if (savedRef) {
  try { savedRef.off("value", savedHandler); } catch (e) {}
  savedRef = null;
  savedHandler = null;
 }
}

function startUnreadListeners() {
 stopUnreadListeners();
 if (!currentUser) return;

 unreadCounts = cget("unread_" + currentUser.uid, {}) || {};

 (allUsers || []).forEach(function (u) {
  var chatId = getChatId(currentUser.uid, u.id);
  var ref = rtdb.ref("chats/" + chatId + "/messages").limitToLast(100);

  var handler = ref.on("value", function (snapshot) {
   if (!currentUser) return;

   var readTs = cget("read_" + chatId, 0) || 0;
   var list = [];
   var lastCreated = 0;
   var myLast = 0;

   snapshot.forEach(function (child) {
    var m = child.val();
    if (!m) return;
    list.push(m);
    var created = m.createdAt || 0;
    if (created > lastCreated) lastCreated = created;
    if (m.senderId === currentUser.uid && created > myLast) myLast = created;
   });

   // Javob yozgan bo'lsangiz, undan oldingi xabarlar o'qilgan hisoblanadi
   var threshold = Math.max(readTs, myLast);
   var count = 0;
   list.forEach(function (m) {
    if (m.senderId !== currentUser.uid && (m.createdAt || 0) > threshold) count++;
   });

   if (activeChat === u.id) {
    if (lastCreated > readTs) cset("read_" + chatId, lastCreated);
    count = 0;
   }

   unreadCounts[u.id] = count;
   cset("unread_" + currentUser.uid, unreadCounts);
   renderChatListNew();
  }, function () {});

  unreadListeners[u.id] = { ref: ref, handler: handler };
 });

 savedRef = rtdb.ref("chats/" + getChatId(currentUser.uid, currentUser.uid) + "/messages").limitToLast(1);
 savedHandler = savedRef.on("value", function (snapshot) {
  savedLast = null;
  snapshot.forEach(function (child) { savedLast = child.val(); });
  renderChatListNew();
 }, function () {});
}

function markRead(friendId) {
 if (!currentUser || !friendId || friendId === currentUser.uid) return;

 var chatId = getChatId(currentUser.uid, friendId);
 var last = latestChats && latestChats[friendId];
 var ts = Math.max(Date.now(), (last && last.time) || 0);

 cset("read_" + chatId, ts);
 unreadCounts[friendId] = 0;
 cset("unread_" + currentUser.uid, unreadCounts);
 renderChatListNew();
}

// ---------- Asosiy funksiyalarni o'rash ----------
var origStart = window.startChatListListeners;
if (typeof origStart === "function") {
 window.startChatListListeners = function () {
  var result = origStart.apply(this, arguments);
  startUnreadListeners();
  renderChatListNew();
  return result;
 };
}

var origStop = window.stopChatListListeners;
if (typeof origStop === "function") {
 window.stopChatListListeners = function () {
  stopUnreadListeners();
  savedLast = null;
  unreadCounts = {};
  return origStop.apply(this, arguments);
 };
}

var origOpen = window.openChat;
window.openChat = function (friendId) {
 var result = origOpen.apply(this, arguments);
 colorize($("friendAvatar"));
 markRead(friendId);
 return result;
};

var origRenderUsers = window.renderUsers;
if (typeof origRenderUsers === "function") {
 window.renderUsers = function () {
  var result = origRenderUsers.apply(this, arguments);
  Array.prototype.forEach.call(document.querySelectorAll("#users .avatar"), colorize);
  return result;
 };
}

var origUpdateProfile = window.updateProfileDisplays;
if (typeof origUpdateProfile === "function") {
 window.updateProfileDisplays = function () {
  var result = origUpdateProfile.apply(this, arguments);
  refreshProfileUI();
  return result;
 };
}

var origApplyTheme = window.applyTheme;
if (typeof origApplyTheme === "function") {
 window.applyTheme = function () {
  var result = origApplyTheme.apply(this, arguments);
  syncThemeIcons();
  return result;
 };
}

// ---------- Tugmalarni ulash ----------
Array.prototype.forEach.call(document.querySelectorAll(".tg-nav-item"), function (item) {
 item.addEventListener("click", function () { showView(item.getAttribute("data-v")); });
});

Array.prototype.forEach.call(document.querySelectorAll(".tg-tab"), function (tab) {
 tab.addEventListener("click", function () {
  chatFilter = tab.getAttribute("data-f");
  Array.prototype.forEach.call(document.querySelectorAll(".tg-tab"), function (t) {
   t.classList.toggle("active", t === tab);
  });
  renderChatListNew();
 });
});

$("tgMe").addEventListener("click", function () { showView("profile"); });
$("tgSearchBtn").addEventListener("click", openSearch);
$("tgSearchBack").addEventListener("click", closeSearch);
$("tgQrBtn").addEventListener("click", function () { call("openQR"); });
$("tgThemeBtn").addEventListener("click", function () { call("toggleTheme"); });

$("tgMenuBtn").addEventListener("click", function (e) {
 e.stopPropagation();
 $("tgMenu").classList.toggle("open");
});
document.addEventListener("click", function (e) {
 if (!e.target.closest("#tgMenu")) closeMenu();
});

$("mnTheme").addEventListener("click", function () { closeMenu(); call("toggleTheme"); });
$("mnQr").addEventListener("click", function () { closeMenu(); call("openQR"); });
$("mnInstall").addEventListener("click", function () { closeMenu(); call("installApp"); });
$("mnLogout").addEventListener("click", function () { closeMenu(); call("logout"); });

$("stEdit").addEventListener("click", function () { call("openEditProfile"); });
$("stTheme").addEventListener("click", function () { call("toggleTheme"); });
$("stQr").addEventListener("click", function () { call("openQR"); });
$("stInstall").addEventListener("click", function () { call("installApp"); });
$("stLogout").addEventListener("click", function () { call("logout"); });

$("pfEdit").addEventListener("click", function () { call("openEditProfile"); });
$("pfPhoto").addEventListener("click", function () { call("choosePhoto"); });

$("fabNew").addEventListener("click", function () { showView("contacts"); openSearch(); });
$("fabCamera").addEventListener("click", function () { call("choosePhoto"); });

$("search").addEventListener("input", renderChatListNew);
if ($("message")) $("message").placeholder = "Xabar yozing...";

window.addEventListener("online", updateTitle);
window.addEventListener("offline", updateTitle);

var observer = new MutationObserver(syncChrome);
["homePage", "chatPage", "authPage"].forEach(function (id) {
 observer.observe($(id), { attributes: true, attributeFilter: ["class"] });
});

// Birinchi marta ochilganda Telegramdagidek yorqin (kunduzgi) rejim
try {
 if (!localStorage.getItem("telemax-theme")) call("applyTheme", "light");
} catch (e) {}

syncThemeIcons();
updateTitle();
syncChrome();
console.log("TELEMAX design.js loaded successfully");
})();
