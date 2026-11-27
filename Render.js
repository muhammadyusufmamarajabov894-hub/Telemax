// TELEMAX: xabarlarni chizish (reaksiya, pin, reply, forward belgilari bilan).
// media.js ning renderMessages funksiyasini almashtiradi. media.js ni o'zgartirish shart emas.
(function () {
"use strict";

if (typeof rtdb === "undefined" || typeof getChatId !== "function" || !document.getElementById("messages")) {
 console.log("render.js: asosiy kod topilmadi, o‘tkazib yuborildi");
 return;
}

var SAFE_URL = /^https:\/\/res\.cloudinary\.com\//;
var rendered = {};
var lastChat = null;

function $(id) { return document.getElementById(id); }

function fmtDur(sec) {
 sec = Math.max(0, Math.floor(sec || 0));
 var s = sec % 60;
 return Math.floor(sec / 60) + ":" + (s < 10 ? "0" : "") + s;
}

function fmtSize(b) {
 if (!b) return "";
 if (b < 1048576) return Math.max(1, Math.round(b / 1024)) + " KB";
 return (b / 1048576).toFixed(1) + " MB";
}

function openViewer(url) {
 $("viewerImg").src = url;
 $("viewer").classList.remove("hidden");
}

function sigOf(d) {
 return (d._key || "") + "|" + (d.senderId || "") + "|" + (d.createdAt || 0) + "|" +
  (d.url || d.text || "") + "|" + JSON.stringify(d.reactions || null) + "|" +
  (d.pinned ? 1 : 0) + "|" + (d.replyTo ? d.replyTo.key : "");
}

function build(d) {
 var message = document.createElement("div");
 message.className = "msg";
 if (currentUser && d.senderId === currentUser.uid) message.classList.add("mine");

 var type = d.type || "text";
 var url = SAFE_URL.test(d.url || "") ? d.url : "";
 var content = document.createElement("div");

 if (type === "image" && url) {
  message.classList.add("media");
  var img = document.createElement("img");
  img.className = "msg-img";
  img.alt = "Rasm";
  img.loading = "lazy";
  img.src = url;
  img.onclick = function () { openViewer(url); };
  content.appendChild(img);
 } else if (type === "video" && url) {
  message.classList.add("media");
  var video = document.createElement("video");
  video.className = "msg-video";
  video.controls = true;
  video.preload = "metadata";
  video.setAttribute("playsinline", "");
  video.src = url;
  content.appendChild(video);
 } else if (type === "audio" && url) {
  var audio = document.createElement("audio");
  audio.className = "msg-audio";
  audio.controls = true;
  audio.preload = "metadata";
  audio.src = url;
  content.appendChild(audio);
  if (d.duration) {
   var dur = document.createElement("small");
   dur.className = "msg-dur";
   dur.textContent = "🎤 " + fmtDur(d.duration);
   content.appendChild(dur);
  }
 } else if (type === "file" && url) {
  var link = document.createElement("a");
  link.className = "msg-file";
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  var icon = document.createElement("span");
  icon.className = "ficon";
  icon.textContent = "📄";
  var info = document.createElement("div");
  var name = document.createElement("div");
  name.className = "fname";
  name.textContent = d.fileName || "Fayl";
  var size = document.createElement("div");
  size.className = "fsize";
  size.textContent = fmtSize(d.size);
  info.append(name, size);
  link.append(icon, info);
  content.appendChild(link);
 } else if (type !== "text") {
  content.textContent = "[Fayl ochilmadi]";
 } else {
  content.textContent = d.text || "";
 }

 var time = document.createElement("small");
 time.className = "msgtime";
 if (d.createdAt) {
  time.textContent = new Date(d.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
 }
 if (d.pinned) time.textContent = "📌 " + time.textContent;

 message.dataset.key = d._key || "";
 message.dataset.type = type;
 message.dataset.url = url;
 message.dataset.text = d.text || "";
 message.dataset.pinned = d.pinned ? "1" : "";

 if (d.replyTo && d.replyTo.text) {
  var rq = document.createElement("div");
  rq.className = "reply-q";
  rq.dataset.key = d.replyTo.key || "";
  rq.textContent = "↩ " + d.replyTo.text;
  message.appendChild(rq);
 }
 if (d.forwarded) {
  var fw = document.createElement("small");
  fw.className = "fwd-tag";
  fw.textContent = "↪ Forwarded";
  message.appendChild(fw);
 }

 message.appendChild(content);

 if (d.reactions) {
  var row = document.createElement("div");
  row.className = "rx-row";
  Object.keys(d.reactions).forEach(function (emoji) {
   var users = Object.keys(d.reactions[emoji] || {});
   if (!users.length) return;
   var chip = document.createElement("span");
   chip.className = "rx-chip";
   if (currentUser && users.indexOf(currentUser.uid) !== -1) chip.classList.add("me");
   chip.dataset.emoji = emoji;
   chip.textContent = emoji + (users.length > 1 ? " " + users.length : "");
   row.appendChild(chip);
  });
  if (row.children.length) message.appendChild(row);
 }

 message.appendChild(time);
 return message;
}

window.renderMessages = function (list) {
 var box = $("messages");
 if (!box) return;

 if (lastChat !== activeChat || !box.querySelector(".msg")) {
  box.innerHTML = "";
  rendered = {};
  lastChat = activeChat;
 }

 var nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 160;
 var added = 0;
 var lastMine = false;
 var seen = {};

 (list || []).forEach(function (d) {
  var id = d._key || sigOf(d);
  var sig = sigOf(d);
  seen[id] = true;
  var r = rendered[id];
  if (r && r.sig === sig && r.el.parentNode === box) return;
  var el = build(d);
  if (r && r.el.parentNode === box) {
   box.replaceChild(el, r.el);
  } else {
   box.appendChild(el);
   added++;
   lastMine = !!(currentUser && d.senderId === currentUser.uid);
  }
  rendered[id] = { sig: sig, el: el };
 });

 Object.keys(rendered).forEach(function (id) {
  if (!seen[id]) {
   if (rendered[id].el.parentNode) rendered[id].el.parentNode.removeChild(rendered[id].el);
   delete rendered[id];
  }
 });

 var empty = box.querySelector(".empty");
 if (!box.querySelector(".msg")) {
  if (!empty) box.innerHTML = '<div class="empty">No messages yet. Say hello!</div>';
  return;
 }
 if (empty) empty.remove();
 if (added && (nearBottom || lastMine)) box.scrollTop = box.scrollHeight;
};

})();
