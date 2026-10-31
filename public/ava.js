/* Volgo AVA chat. Usage: <script src="https://…/ava.js" data-key="SLEUTEL" defer></script> */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || window.__volgoAva) return;
  // Widget texts follow the language of the website (<html lang="...">); AVA itself replies in the visitor's language.
  var TEKST = {
    en: { net: "No connection. Please try again in a moment.", vraag: "Ask a question", vraagNaam: "Ask ", snel: "Replies instantly", team: " from the team is here", typ: "Type your question...", ai: "AI assistant", fout: "Something went wrong. Please try again.", open: "Open chat", sluit: "Close", stuur: "Send" },
    nl: { net: "Geen verbinding. Probeer het zo opnieuw.", vraag: "Stel een vraag", vraagNaam: "Vraag ", snel: "Reageert direct", team: " van het team is er", typ: "Typ je vraag...", ai: "AI-assistent", fout: "Er ging iets mis. Probeer het opnieuw.", open: "Chat openen", sluit: "Sluiten", stuur: "Versturen" },
    de: { net: "Keine Verbindung. Bitte gleich erneut versuchen.", vraag: "Frage stellen", vraagNaam: "Frag ", snel: "Antwortet sofort", team: " aus dem Team ist da", typ: "Ihre Frage...", ai: "KI-Assistent", fout: "Etwas ist schiefgelaufen. Bitte erneut versuchen.", open: "Chat öffnen", sluit: "Schließen", stuur: "Senden" },
    fr: { net: "Pas de connexion. Réessayez dans un instant.", vraag: "Poser une question", vraagNaam: "Demandez à ", snel: "Répond immédiatement", team: " de l'équipe est là", typ: "Votre question...", ai: "Assistant IA", fout: "Une erreur s'est produite. Réessayez.", open: "Ouvrir le chat", sluit: "Fermer", stuur: "Envoyer" },
    es: { net: "Sin conexión. Inténtalo de nuevo en un momento.", vraag: "Haz una pregunta", vraagNaam: "Pregunta a ", snel: "Responde al instante", team: " del equipo está aquí", typ: "Escribe tu pregunta...", ai: "Asistente IA", fout: "Algo salió mal. Inténtalo de nuevo.", open: "Abrir chat", sluit: "Cerrar", stuur: "Enviar" },
  };
  var T = TEKST[((document.documentElement.lang || navigator.language || "en").slice(0, 2)).toLowerCase()] || TEKST.en;
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
.b.h{align-self:flex-start;background:#fff;color:#111318;box-shadow:0 1px 2px rgba(17,19,24,.08);border-bottom-left-radius:6px;border-left:3px solid #1f9d55}\
.b.h b{display:block;font-size:12px;color:#1f9d55;margin-bottom:2px}\
.b.s{align-self:center;background:rgba(17,19,24,.05);color:#6b7280;font-size:12.5px;padding:5px 12px}\
.donker .b.h{background:#1b2230;color:#eef1f6}.donker .b.s{background:rgba(255,255,255,.07);color:#9aa3af}\
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
.links .fab,.links .panel{right:auto;left:18px}\
.links .panel{transform-origin:bottom left}\
.strak .fab{border-radius:16px}.strak .fab img{border-radius:12px}.strak .panel{border-radius:16px}.strak .b{border-radius:12px}.strak form{border-radius:12px}.strak .head img{border-radius:10px}.strak .send{border-radius:10px}\
.donker .fab{background:#161b24;color:#f3f5f8;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 14px 40px rgba(0,0,0,.4)}\
.donker .panel{background:linear-gradient(180deg,#121823 0%,#0d1117 30%);box-shadow:0 0 0 1px rgba(255,255,255,.08),0 30px 80px rgba(0,0,0,.5)}\
.donker .head{border-color:#232a36}.donker .head strong{color:#f3f5f8}.donker .head small,.donker .note,.donker .note a{color:#9aa3af}\
.donker .x{background:rgba(255,255,255,.08);color:#f3f5f8}\
.donker .b.a{background:#1b2230;color:#eef1f6;box-shadow:none}\
.donker form{background:#161b24;box-shadow:inset 0 0 0 1px #232a36}.donker form:focus-within{background:#161b24}.donker textarea{color:#f3f5f8}\
.dot{border-color:#fff}.donker .dot{border-color:#161b24}\
.wf *{font-family:inherit}\
.fab img,.head img{object-fit:cover;background:#eef2f7}\
@media (max-width:640px){.links .panel{left:0}.fab span{display:none}.fab{padding:6px}.panel{right:0;bottom:0;width:100%;height:100%;border-radius:0}}\
";
  root.innerHTML = "<style>" + css + "</style><div class=\"w\">" +
    '<button class="fab" type="button" aria-label="' + T.open + '"><img alt="" src="' + BASE + '/assets/volgo/ava.png"><span class="lbl">' + T.vraag + '</span><i class="dot" hidden></i></button>' +
    '<section class="panel" role="dialog" aria-label="Chat"><div class="head"><img alt="" src="' + BASE + '/assets/volgo/ava.png"><div><strong class="nm">AVA</strong><small><i></i><span class="sub">' + T.snel + '</span></small></div><button class="x" type="button" aria-label="' + T.sluit + '">×</button></div>' +
    '<div class="log" role="log" aria-live="polite"></div>' +
    '<form><textarea rows="1" maxlength="1500" placeholder="' + T.typ + '" aria-label="' + T.typ + '"></textarea><button class="send" type="submit" aria-label="' + T.stuur + '" disabled>↑</button></form>' +
    '<p class="note">' + T.ai + '<span class="merk"> · <a href="' + BASE + '" target="_blank" rel="noopener">Volgo</a></span></p></section></div>';

  var $ = function (s) { return root.querySelector(s); };
  var fab = $(".fab"), panel = $(".panel"), log = $(".log"), form = $("form"), ta = $("textarea"), send = $(".send");
  var config = null, busy = false;

  function bubble(rol, tekst, wie) {
    var p = document.createElement("p");
    p.className = "b " + (rol === "u" ? "u" : rol === "h" ? "h" : rol === "s" ? "s" : "a");
    if (rol === "h" && wie) { var n = document.createElement("b"); n.textContent = wie; p.appendChild(n); p.appendChild(document.createTextNode(tekst)); }
    else p.textContent = tekst;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }
  function render() {
    log.innerHTML = "";
    if (config) bubble("a", config.begroeting);
    state.msgs.forEach(function (m) { bubble(m.r, m.t, m.w); });
  }
  function applyConfig(c) {
    config = c;
    host.style.setProperty("--c", c.kleur || "#1677d9");
    root.querySelector(".panel").style.setProperty("--c", c.kleur || "#1677d9");
    fab.style.setProperty("--c", c.kleur || "#1677d9");
    $(".nm").textContent = c.naam + " · " + c.bedrijf;
    $(".lbl").textContent = c.knoptekst || T.vraagNaam + c.naam;
    // Own style (Pro and Premium): photo, position, theme, shape, font, no Volgo mention.
    var w = $(".w");
    w.className = "w" + (c.positie === "links" ? " links" : "") + (c.thema === "donker" ? " donker" : "") + (c.vorm === "strak" ? " strak" : "") + (c.lettertype === "website" ? " wf" : "");
    if (c.lettertype === "website") { try { host.style.fontFamily = getComputedStyle(document.body).fontFamily; } catch (e) {} }
    if (c.avatar) Array.prototype.forEach.call(root.querySelectorAll(".fab img,.head img"), function (img) { img.src = c.avatar; });
    var merk = $(".merk"); if (merk) merk.hidden = c.branding === false;
    render();
  }
  host.style.setProperty("--c", "#1677d9");
  post({ actie: "config", sleutel: KEY }).then(function (c) {
    // Subscription ended: remove the chat from the website.
    if (c && c.uit) { host.remove(); return; }
    if (c && !c.fout) applyConfig(c);
  }).catch(function () {});
  if (!state.msgs.length) setTimeout(function () { var d = $(".dot"); if (d && !panel.classList.contains("open")) d.hidden = false; }, 4000);

  function open() { panel.classList.add("open"); fab.classList.add("open"); $(".dot").hidden = true; setTimeout(function () { ta.focus(); }, 250); }
  function close() { panel.classList.remove("open"); fab.classList.remove("open"); }
  fab.addEventListener("click", open);
  $(".x").addEventListener("click", close);
  root.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  // Any button on the website with data-ava-open (e.g. "Request a quote") opens AVA. Also available as window.VolgoAva.open().
  window.VolgoAva = { open: open, close: close };
  document.addEventListener("click", function (e) { var t = e.target && e.target.closest && e.target.closest("[data-ava-open]"); if (t) { e.preventDefault(); open(); } });
  ta.addEventListener("input", function () { send.disabled = !ta.value.trim() || busy; });
  ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); verstuur(); } });
  form.addEventListener("submit", function (e) { e.preventDefault(); verstuur(); });

  // A team member can take over the chat from the dashboard: fetch their messages.
  var mens = null;
  function zetKop() {
    var sub = $(".sub");
    if (sub) sub.textContent = mens ? mens + T.team : T.snel;
  }
  function poll() {
    if (!state.token) return;
    post({ actie: "poll", sleutel: KEY, token: state.token, na_id: state.na || 0 }).then(function (r) {
      if (!r || !r.berichten) return;
      (r.berichten || []).forEach(function (b) {
        var rol = b.rol === "mens" ? "h" : "s";
        var m = { r: rol, t: b.tekst, w: rol === "h" ? (r.mens || "Team") : undefined };
        state.msgs.push(m); bubble(m.r, m.t, m.w);
        if (!panel.classList.contains("open")) { var d = $(".dot"); if (d) d.hidden = false; }
      });
      state.na = Math.max(state.na || 0, r.laatste_id || 0);
      if (mens !== r.mens) { mens = r.mens; zetKop(); }
      save(state);
    }).catch(function () {});
  }
  (function lus() {
    if (!host.isConnected) return;
    poll();
    setTimeout(lus, panel.classList.contains("open") ? 3000 : 12000);
  })();

  function verstuur() {
    var t = ta.value.trim();
    if (!t || busy) return;
    busy = true; send.disabled = true; ta.value = "";
    state.msgs.push({ r: "u", t: t }); save(state); bubble("u", t);
    var typ = document.createElement("p"); typ.className = "b a typ"; typ.innerHTML = "<span></span><span></span><span></span>"; log.appendChild(typ); log.scrollTop = log.scrollHeight;
    post({ actie: "bericht", sleutel: KEY, token: state.token, tekst: t }).then(function (r) {
      typ.remove();
      if (r.token) state.token = r.token;
      if (r.laatste_id) state.na = Math.max(state.na || 0, r.laatste_id);
      if (r.mens) { mens = r.mens; zetKop(); save(state); poll(); return; }
      var a = r.antwoord || T.fout;
      state.msgs.push({ r: "a", t: a }); save(state); bubble("a", a);
    }).catch(function () {
      typ.remove(); bubble("a", T.net);
    }).then(function () { busy = false; send.disabled = !ta.value.trim(); });
  }
})();
