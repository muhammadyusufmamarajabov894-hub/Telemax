// TELEMAX: chatda rasm, video, fayl va ovozli xabar yuborish.
// Asosiy kod (index.html) ishlamasa, bu fayl hech narsani buzmaydi.
(function () {
"use strict";

if (typeof rtdb === "undefined" || typeof getChatId !== "function" || !document.querySelector("#chatPage .send")) {
 console.log("media.js: asosiy kod topilmadi, o‘tkazib yuborildi");
 return;
}

var LIMITS = { image: 10, video: 50, audio: 10, file: 10 };
var LABELS = { image: "Rasm", video: "Video", audio: "Audio", file: "Fayl" };
var MAX_VOICE_SECONDS = 300;
var SAFE_URL = /^https:\/\/res\.cloudinary\.com\//;

var uploading = false;
var needReset = true;
var rendered = {};

var recorder = null;
var recStream = null;
var recChunks = [];
var recTimer = null;
var recStartAt = 0;
var recDiscard = false;
var recFriend = null;

function $(id) { return document.getElementById(id); }

// ---------- CSS ----------
var style = document.createElement("style");
style.textContent = `
.send .attach-btn{padding:12px 14px;font-size:18px}
#recBar{display:none;flex:1;align-items:center;gap:10px;min-width:0}
.send.recording #recBar{display:flex}
.send.recording > :not(#recBar){display:none!important}
.rec-info{flex:1;display:flex;align-items:center;gap:8px;font-size:15px;min-width:0}
.rec-dot{width:11px;height:11px;border-radius:50%;background:#ef4444;animation:recblink 1s infinite}
.rec-text{color:var(--muted);font-size:13px}
@keyframes recblink{50%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.rec-dot{animation:none}}
#attachMenu{position:absolute;left:10px;bottom:82px;background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:6px;box-shadow:0 8px 24px #0006;z-index:6;min-width:190px}
.attach-item{display:flex;align-items:center;gap:12px;width:100%;background:transparent;color:var(--text);font-weight:normal;font-size:15px;padding:12px 14px;text-align:left}
#uploadBar{display:none!important}
.msg.media{padding:6px}
.msg.media .msgtime{padding:0 6px}
.msg-img{display:block;width:240px;max-width:100%;border-radius:11px;cursor:pointer;background:#0003}
.msg-video{display:block;width:260px;max-width:100%;border-radius:11px;background:#000}
.msg-audio{display:block;width:220px;max-width:100%;height:40px}
.msg-dur{display:block;font-size:11px;opacity:.8;margin-top:4px}
.msg-file{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;min-width:160px}
.msg-file .ficon{font-size:26px}
.msg-file .fname{font-weight:bold;font-size:14px;overflow-wrap:anywhere}
.msg-file .fsize{font-size:11px;opacity:.8;margin-top:3px}
.overlay.viewer{align-items:center;justify-content:center;z-index:30;background:#000d}
.viewer img{max-width:100%;max-height:92dvh;border-radius:8px}
`;
document.head.appendChild(style);

// ---------- Interfeys ----------
var chatPage = $("chatPage");
var sendBar = chatPage.querySelector(".send");

sendBar.innerHTML = `
 <button class="secondary attach-btn" id="attachBtn" type="button" title="Biriktirish">📎</button>
 <input id="message" placeholder="Write a message..." autocomplete="off">
 <button id="micBtn" type="button" title="Ovozli xabar">🎤</button>
 <button id="sendBtn" type="button" class="hidden" title="Yuborish">➤</button>
 <div id="recBar">
  <button class="secondary" id="recCancel" type="button" title="Bekor qilish">🗑</button>
  <div class="rec-info"><span class="rec-dot"></span><span id="recTime">0:00</span><span class="rec-text">Yozilmoqda...</span></div>
  <button id="recSend" type="button" title="Yuborish">➤</button>
 </div>
`;

chatPage.insertAdjacentHTML("beforeend", `
 <div id="attachMenu" class="hidden">
  <button class="attach-item" type="button" data-kind="image"><span>🖼</span> Rasm</button>
  <button class="attach-item" type="button" data-kind="video"><span>🎥</span> Video</button>
  <button class="attach-item" type="button" data-kind="file"><span>📄</span> Fayl</button>
 </div>
 <div id="uploadBar" class="hidden">
  <div id="uploadName"></div>
  <div class="bar"><div id="uploadFill"></div></div>
 </div>
`);

document.body.insertAdjacentHTML("beforeend", `
 <input type="file" id="imageInput" class="hidden" accept="image/*">
 <input type="file" id="videoInput" class="hidden" accept="video/*">
 <input type="file" id="fileInput" class="hidden">
 <div id="viewer" class="overlay viewer hidden"><img id="viewerImg" alt="Rasm"></div>
`);

// ---------- Yordamchi funksiyalar ----------
function formatDuration(sec) {
 sec = Math.max(0, Math.floor(sec || 0));
 var m = Math.floor(sec / 60);
 var s = sec % 60;
 return m + ":" + (s < 10 ? "0" : "") + s;
}

function formatSize(bytes) {
 if (!bytes) return "";
 if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
 return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function classify(file) {
 var t = (file.type || "").toLowerCase();
 if (t.indexOf("image/") === 0) return "image";
 if (t.indexOf("video/") === 0) return "video";
 if (t.indexOf("audio/") === 0) return "audio";
 return "file";
}

function previewLabel(m) {
 if (m.type === "image") return "📷 Rasm";
 if (m.type === "video") return "🎥 Video";
 if (m.type === "audio") return "🎤 Ovozli xabar";
 if (m.type === "file") return "📎 " + (m.fileName || "Fayl");
 return m.text || "";
}

function updateSendButtons() {
 var has = $("message").value.trim().length > 0;
 $("micBtn").classList.toggle("hidden", has);
 $("sendBtn").classList.toggle("hidden", !has);
}

function hideAttachMenu() { $("attachMenu").classList.add("hidden"); }

function showUpload(name, percent) {
 if (typeof window.setCircleUploadProgress === "function") {
  window.setCircleUploadProgress(name, percent);
 }
}

function hideUpload() {
 if (typeof window.hideCircleUploadProgress === "function") {
  window.hideCircleUploadProgress();
 }
}

// ---------- Cloudinary'ga yuklash ----------
function uploadToCloudinary(file, onProgress) {
 return new Promise(function (resolve, reject) {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/auto/upload");
  xhr.timeout = 180000;

  xhr.upload.onprogress = function (e) {
   if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100));
  };

  xhr.onload = function () {
   var res = {};
   try { res = JSON.parse(xhr.responseText); } catch (e) {}
   if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) {
    resolve(res);
   } else {
    reject(new Error((res.error && res.error.message) || "Yuklash xatosi (" + xhr.status + ")"));
   }
  };

  xhr.onerror = function () { reject(new Error("Internet aloqasini tekshiring.")); };
  xhr.ontimeout = function () { reject(new Error("Yuklash vaqti tugadi.")); };

  var form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  form.append("folder", "telemax/chat");
  xhr.send(form);
 });
}

async function sendMedia(file, type, extra, friendId) {
 friendId = friendId || activeChat;
 if (!currentUser || !friendId) return;

 if (uploading) { alert("Oldingi fayl hali yuklanmoqda. Biroz kuting."); return; }
 if (!navigator.onLine) { alert("Internet yo‘q. Fayl yuborish uchun internet kerak."); return; }

 if (file.size > LIMITS[type] * 1024 * 1024) {
  alert(LABELS[type] + " hajmi " + LIMITS[type] + " MB dan oshmasligi kerak.");
  return;
 }

 uploading = true;
 var chatId = getChatId(currentUser.uid, friendId);
 var label = file.name || LABELS[type];
 showUpload(label, 0);

 try {
  var result = await uploadToCloudinary(file, function (p) { showUpload(label, p); });

  var data = {
   type: type,
   url: result.secure_url,
   fileName: file.name || "",
   size: file.size || 0,
   senderId: currentUser.uid,
   createdAt: Date.now()
  };
  if (extra && extra.duration) data.duration = extra.duration;

  await rtdb.ref("chats/" + chatId + "/messages").push().set(data);
 } catch (e) {
  console.error(e);
  alert("Yuborilmadi: " + (e && e.message ? e.message : e));
 } finally {
  uploading = false;
  hideUpload();
 }
}

function handlePicked(event) {
 var file = event.target.files && event.target.files[0];
 event.target.value = "";
 if (file) sendMedia(file, classify(file));
 }

 // ---------- Ovozli xabar ----------
function pickMime() {
 var list = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
 for (var i = 0; i < list.length; i++) {
  try {
   if (window.MediaRecorder && MediaRecorder.isTypeSupported(list[i])) return list[i];
  } catch (e) {}
 }
 return "";
}

function releaseStream() {
 if (recStream) {
  recStream.getTracks().forEach(function (t) { t.stop(); });
  recStream = null;
 }
}

function updateRecTime() {
 $("recTime").textContent = formatDuration((Date.now() - recStartAt) / 1000);
}

async function startRecording() {
 if (recorder || !activeChat || !currentUser) return;

 if (!navigator.onLine) { alert("Internet yo‘q. Ovozli xabar yuborish uchun internet kerak."); return; }
 if (!navigator.mediaDevices || !window.MediaRecorder) { alert("Bu brauzer ovoz yozishni qo‘llamaydi."); return; }

 try {
  recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
 } catch (e) {
  alert("Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.");
  return;
 }

 var mime = pickMime();

 try {
  recorder = mime ? new MediaRecorder(recStream, { mimeType: mime }) : new MediaRecorder(recStream);
 } catch (e) {
  releaseStream();
  recorder = null;
  alert("Ovoz yozishni boshlab bo‘lmadi.");
  return;
 }

 recChunks = [];
 recDiscard = false;
 recFriend = activeChat;

 recorder.ondataavailable = function (e) {
  if (e.data && e.data.size) recChunks.push(e.data);
 };
 recorder.onstop = onRecorderStop;
 recorder.start();

 recStartAt = Date.now();
 sendBar.classList.add("recording");
 updateRecTime();

 recTimer = setInterval(function () {
  updateRecTime();
  if ((Date.now() - recStartAt) / 1000 >= MAX_VOICE_SECONDS) stopRecording(true);
 }, 250);
}

function stopRecording(send) {
 if (!recorder || recorder.state === "inactive") return;

 recDiscard = !send;
 clearInterval(recTimer);
 recTimer = null;
 sendBar.classList.remove("recording");

 try { recorder.stop(); } catch (e) {}
 releaseStream();
}

function onRecorderStop() {
 var rec = recorder;
 recorder = null;

 var seconds = Math.round((Date.now() - recStartAt
     recStartAt) / 1000);
 var type = (rec && rec.mimeType) || "audio/webm";
 var blob = new Blob(recChunks, { type: type });
 recChunks = [];

 if (recDiscard || blob.size < 800 || seconds < 1) return;

 var ext = type.indexOf("mp4") !== -1 ? "m4a" : (type.indexOf("ogg") !== -1 ? "ogg" : "webm");
 var file = new File([blob], "voice." + ext, { type: type });

 sendMedia(file, "audio", { duration: seconds }, recFriend);
}

// ---------- Xabarlarni ko'rsatish ----------
function messageSignature(d) {
 return (d.senderId || "") + "|" + (d.createdAt || 0) + "|" + (d.url || d.text || "");
}

function buildMessage(d) {
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
   dur.textContent = "🎤 " + formatDuration(d.duration);
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
  size.textContent = formatSize(d.size);
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

 message.append(content, time);
 return message;
}

function openViewer(url) {
 $("viewerImg").src = url;
 $("viewer").classList.remove("hidden");
}

window.renderMessages = function (list) {
 var box = $("messages");

 if (needReset) {
  box.innerHTML = "";
  rendered = {};
  needReset = false;
 }

 var nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 160;
 var added = 0;
 var lastMine = false;

 (list || []).forEach(function (d) {
  var key = messageSignature(d);
  if (rendered[key]) return;
  rendered[key] = true;
  box.appendChild(buildMessage(d));
  added++;
  lastMine = !!(currentUser && d.senderId === currentUser.uid);
 });

 var empty = box.querySelector(".empty");

 if (!box.querySelector(".msg")) {
  if (!empty) box.innerHTML = '<div class="empty">No messages yet. Say hello!</div>';
  return;
 }

 if (empty) empty.remove();
 if (added && (nearBottom || lastMine)) box.scrollTop = box.scrollHeight;
};

var origOpenChat = window.openChat;
window.openChat = function () {
 needReset = true;
 var result = origOpenChat.apply(this, arguments);
 updateSendButtons();
 return result;
};

var origCloseChat = window.closeChat;
window.closeChat = function () {
 stopRecording(false);
 hideAttachMenu();
 var result = origCloseChat.apply(this, arguments);
 $("messages").innerHTML = "";
 needReset = true;
 return result;
};

var origSendMessage = window.sendMessage;
window.sendMessage = function () {
 var result = origSendMessage.apply(this, arguments);
 updateSendButtons();
 return result;
};

var origRenderChatList = window.renderChatList;
if (typeof origRenderChatList === "function") {
 window.renderChatList = function () {
  try {
   Object.values(latestChats).forEach(function (item) {
    var m = item && item.message;
    if (m && m.type && m.type !== "text") m.text = previewLabel(m);
   });
  } catch (e) {}
  return origRenderChatList.apply(this, arguments);
 };
}

$("message").addEventListener("input", updateSendButtons);
$("message").addEventListener("keydown", function (e) {
 if (e.key === "Enter") window.sendMessage();
});

$("sendBtn").addEventListener("click", function () { window.sendMessage(); });
$("micBtn").addEventListener("click", startRecording);
$("recCancel").addEventListener("click", function () { stopRecording(false); });
$("recSend").addEventListener("click", function () { stopRecording(true); });

$("attachBtn").addEventListener("click", function () {
 $("attachMenu").classList.toggle("hidden");
});

$("attachMenu").addEventListener("click", function (e) {
 var button = e.target.closest("[data-kind]");
 if (!button) return;

 hideAttachMenu();

 var kind = button.getAttribute("data-kind");
 if (kind === "image") $("imageInput").click();
 else if (kind === "video") $("videoInput").click();
 else $("fileInput").click();
});

$("imageInput").addEventListener("change", handlePicked);
$("videoInput").addEventListener("change", handlePicked);
$("fileInput").addEventListener("change", handlePicked);

$("viewer").addEventListener("click", function () {
 $("viewer").classList.add("hidden");
 $("viewerImg").removeAttribute("src");
});

updateSendButtons();
console.log("TELEMAX media.js loaded successfully");
})();
                                    
