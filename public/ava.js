/* Volgo AVA chat. Usage: <script src="https://…/ava.js" data-key="SLEUTEL" defer></script> */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || window.__volgoAva) return;
  window.__volgoAva = true;
  var KEY = script.getAttribute("data-key");
  var BASE = new URL(script.src).origin;
  var API = BASE + "/api/ava";
  var STORE = "volgo-ava-" + KEY;
  if (!KEY) return;

  function load() { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) {} }
  var state = load();
  state.msgs = state.msgs || [];

  function post(body) {
    return fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }

  var host = document.createElement("div");
  host.id = "volgo-ava";
  document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var css = "\
:host{all:initial}\
*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}\
.fab{position:fixed;right:18px;bottom:18px;z-index:2147483000;display:flex;align-items:center;gap:10px;padding:6px 18px 6px 6px;border:0;border-radius:999px;background:#fff;color:#111318;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 0 0 1px rgba(17,19,24,.06),0 14px 40px rgba(17,19,24,.18);transition:transform .35s cubic-bezier(.34,1.56,.64,1),opacity .2s;animation:in .7s cubic-bezier(.34,1.56,.64,1) .4s both}\
.fab:hover{transform:translateY(-3px) scale(1.03)}\
.fab img{width:48px;height:48px;border-radius:50%;display:block}\
.fab.open{opacity:0;pointer-events:none;transform:scale(.85)}\
.dot{position:absolute;top:6px;left:42px;width:12px;height:12px;border-radius:50%;background:var(--c);border:2px solid #fff}\
@keyframes in{from{transform:translateY(30px) scale(.8);opacity:0}}\
.panel{position:fixed;right:18px;bottom:18px;z-index:2147483001;width:min(380px,calc(100vw - 36px));height:min(600px,calc(100vh - 100px));display:flex;flex-direction:column;border-radius:28px;overflow:hidden;background:linear-gradient(180deg,#eef7ff 0%,#fff 30%);box-shadow:0 0 0 1px rgba(17,19,24,.06),0 30px 80px rgba(17,19,24,.22);transform-origin:bottom right;transform:scale(.6) translateY(20px);opacity:0;visibility:hidden;transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .2s,visibility 0s linear .4s}\
.panel.open{transform:none;opacity:1;visibility:visible;transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .2s,visibility 0s}\
.head{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid #e7eaf0}\
.head img{width:40px;height:40px;border-radius:50%}\
.head strong{display:block;font-size:16px;color:#111318}\
.head small{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#6b7280}\
.head small i{width:7px;height:7px;border-radius:50%;background:#2fbf71}\
.x{margin-left:auto;width:34px;height:34px;border:0;border-radius:50%;background:rgba(17,19,24,.05);cursor:pointer;font-size:18px;line-height:1;color:#111318}\
.log{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:8px}\
.b{max-width:84%;padding:10px 14px;border-radius:20px;font-size:15px;line-height:1.45;white-space:pre-line;word-break:break-word;animation:pop .3s cubic-bezier(.34,1.56,.64,1)}\
.b.a{align-self:flex-start;background:#fff;color:#111318;box-shadow:0 1px 2px rgba(17,19,24,.08);border-bottom-left-radius:6px}\
.b.u{align-self:flex-end;background:var(--c);color:#fff;border-bottom-right-radius:6px}\
@keyframes pop{from{transform:scale(.92) translateY(6px)}}\
.typ{display:inline-flex;gap:4px;padding:14px 16px}\
.typ span{width:7px;height:7px;border-radius:50%;background:#9aa3af;animation:d 1.2s infinite}\
.typ span:nth-child(2){animation-delay:.15s}.typ span:nth-child(3){animation-delay:.3s}\
@keyframes d{0%,60%,100%{transform:none;opacity:.5}30%{transform:translateY(-4px);opacity:1}}\
form{display:flex;align-items:flex-end;gap:8px;margin:0 12px;padding:6px 6px 6px 16px;border-radius:24px;background:#f5f7fa;box-shadow:inset 0 0 0 1px #e7eaf0}\
form:focus-within{background:#fff;box-shadow:inset 0 0 0 2px var(--c)}\
textarea{flex:1;resize:none;border:0;outline:none;background:transparent;font-size:16px;line-height:1.4;padding:8px 0;max-height:110px;color:#111318}\
.send{width:36px;height:36px;flex:none;border:0;border-radius:50%;background:var(--c);color:#fff;cursor:pointer;font-size:17px}\
.send:disabled{opacity:.35;cursor:default}\
.note{margin:8px 16px 12px;text-align:center;font-size:11.5px;color:#6b7280}\
.note a{color:#6b7280}\
@media (max-width:640px){.fab span{display:none}.fab{padding:6px}.panel{right:0;bottom:0;width:100%;height:100%;border-radius:0}}\
";
  root.innerHTML = "<style>" + css + "</style>" +
    '<button class="fab" type="button" aria-label="Open chat"><img alt="" src="' + BASE + '/assets/volgo/ava.png"><span class="lbl">Ask a question</span><i class="dot" hidden></i></button>' +
    '<section class="panel" role="dialog" aria-label="Chat"><div class="head"><img alt="" src="' + BASE + '/assets/volgo/ava.png"><div><strong class="nm">AVA</strong><small><i></i><span class="sub">Replies instantly</span></small></div><button class="x" type="button" aria-label="Close">×</button></div>' +
    '<div class="log" role="log" aria-live="polite"></div>' +
    '<form><textarea rows="1" maxlength="1500" placeholder="Type your question..." aria-label="Message"></textarea><button class="send" type="submit" aria-label="Send" disabled>↑</button></form>' +
    '<p class="note">AI assistant · <a href="' + BASE + '" target="_blank" rel="noopener">Volgo</a></p></section>';

  var $ = function (s) { return root.querySelector(s); };
  var fab = $(".fab"), panel = $(".panel"), log = $(".log"), form = $("form"), ta = $("textarea"), send = $(".send");
  var config = null, busy = false;

  function bubble(rol, tekst) {
    var p = document.createElement("p");
    p.className = "b " + (rol === "u" ? "u" : "a");
    p.textContent = tekst;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }
  function render() {
    log.innerHTML = "";
    if (config) bubble("a", config.begroeting);
    state.msgs.forEach(function (m) { bubble(m.r, m.t); });
  }
  function applyConfig(c) {
    config = c;
    host.style.setProperty("--c", c.kleur || "#1677d9");
    root.querySelector(".panel").style.setProperty("--c", c.kleur || "#1677d9");
    fab.style.setProperty("--c", c.kleur || "#1677d9");
    $(".nm").textContent = c.naam + " · " + c.bedrijf;
    $(".lbl").textContent = "Ask " + c.naam;
    render();
  }
  host.style.setProperty("--c", "#1677d9");
  post({ actie: "config", sleutel: KEY }).then(function (c) { if (c && !c.fout) applyConfig(c); }).catch(function () {});
  if (!state.msgs.length) setTimeout(function () { var d = $(".dot"); if (d && !panel.classList.contains("open")) d.hidden = false; }, 4000);

  function open() { panel.classList.add("open"); fab.classList.add("open"); $(".dot").hidden = true; setTimeout(function () { ta.focus(); }, 250); }
  function close() { panel.classList.remove("open"); fab.classList.remove("open"); }
  fab.addEventListener("click", open);
  $(".x").addEventListener("click", close);
  root.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  ta.addEventListener("input", function () { send.disabled = !ta.value.trim() || busy; });
  ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); verstuur(); } });
  form.addEventListener("submit", function (e) { e.preventDefault(); verstuur(); });

  function verstuur() {
    var t = ta.value.trim();
    if (!t || busy) return;
    busy = true; send.disabled = true; ta.value = "";
    state.msgs.push({ r: "u", t: t }); save(state); bubble("u", t);
    var typ = document.createElement("p"); typ.className = "b a typ"; typ.innerHTML = "<span></span><span></span><span></span>"; log.appendChild(typ); log.scrollTop = log.scrollHeight;
    post({ actie: "bericht", sleutel: KEY, token: state.token, tekst: t }).then(function (r) {
      typ.remove();
      if (r.token) state.token = r.token;
      var a = r.antwoord || "Something went wrong. Please try again.";
      state.msgs.push({ r: "a", t: a }); save(state); bubble("a", a);
    }).catch(function () {
      typ.remove(); bubble("a", "No connection. Please try again in a moment.");
    }).then(function () { busy = false; send.disabled = !ta.value.trim(); });
  }
})();
