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
  var TAAL = ((document.documentElement.lang || navigator.language || "en").slice(0, 2)).toLowerCase();
  var T = TEKST[TAAL] || TEKST.en;
  // Texts for the appointment calendar inside the chat.
  var KAL = {
    en: { chipBoek: "Book an appointment", chipPrijs: "What does it cost?", chipVraag: "I have a question", stap: "Step {n} of {m}", s1: "How would you like to meet?", s1h: "Tap one option.", bellen: ["Phone call", "We call you at the time you pick"], langs: ["Visit at your address", "We come to you, for example to measure"], kantoor: ["At our office", "You visit us"], s2: "Pick a day and time", s2h: "Only moments that are still free are shown. Tap a day, then a time.", vrij: "free", tz: "Times are in {tz} time", geen: "There are no free moments in the coming weeks. Type your phone number in the chat and we'll call you to plan.", s3: "Your details", s3h: "So we know who to expect and how to reach you.", naam: "Your name", contact: "Phone number or email", adres: "Address (street, number, town)", bevestig: "Confirm appointment", terug: "Back", bezig: "Booking…", klaar: "Booked", vandaag: "Today", morgen: "Tomorrow", laden: "Loading free moments…", nodig: "Please fill in all fields.", opnieuw: "Pick a time" },
    nl: { chipBoek: "Afspraak maken", chipPrijs: "Wat kost het?", chipVraag: "Ik heb een vraag", stap: "Stap {n} van {m}", s1: "Hoe wil je afspreken?", s1h: "Tik op één keuze.", bellen: ["Telefoongesprek", "We bellen je op het moment dat jij kiest"], langs: ["Langskomen bij jou", "We komen bij je langs, bijvoorbeeld om op te meten"], kantoor: ["Bij ons op kantoor", "Jij komt bij ons langs"], s2: "Kies een dag en tijd", s2h: "Je ziet alleen momenten die nog vrij zijn. Tik op een dag, daarna op een tijd.", vrij: "vrij", tz: "Tijden zijn in {tz}-tijd", geen: "Er zijn de komende weken geen vrije momenten. Typ je telefoonnummer in de chat, dan bellen we je om te plannen.", s3: "Jouw gegevens", s3h: "Zodat we weten wie we verwachten en hoe we je bereiken.", naam: "Je naam", contact: "Telefoonnummer of e-mail", adres: "Adres (straat, nummer, plaats)", bevestig: "Afspraak bevestigen", terug: "Terug", bezig: "Bezig met boeken…", klaar: "Geboekt", vandaag: "Vandaag", morgen: "Morgen", laden: "Vrije momenten laden…", nodig: "Vul alle velden in.", opnieuw: "Kies een tijd" },
  };
  var K = KAL[TAAL] || KAL.en;
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
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 4px}\
.chip{border:0;padding:9px 14px;border-radius:999px;background:#fff;color:#111318;font-size:14px;font-weight:600;cursor:pointer;box-shadow:inset 0 0 0 1.5px var(--c);transition:background .15s,color .15s}\
.chip:hover,.chip.hoofd{background:var(--c);color:#fff}\
.kal{align-self:stretch;margin:4px 0;padding:14px;border-radius:20px;background:#fff;box-shadow:0 0 0 1px #e7eaf0,0 8px 24px rgba(17,19,24,.08);color:#111318;animation:pop .3s cubic-bezier(.34,1.56,.64,1)}\
.kal .stp{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#6b7280;font-weight:600;margin-bottom:6px}\
.kal .bal{display:flex;gap:4px;margin-bottom:12px}.kal .bal i{flex:1;height:4px;border-radius:4px;background:#e7eaf0}.kal .bal i.aan{background:var(--c)}\
.kal h4{margin:0;font-size:16px}.kal .hulp{margin:3px 0 12px;font-size:13px;color:#6b7280;line-height:1.4}\
.kal .opt{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 8px;padding:12px;border:0;border-radius:14px;background:#f5f7fa;text-align:left;cursor:pointer;color:#111318;font-size:14px}\
.kal .opt:hover{background:#eef4ff;box-shadow:inset 0 0 0 1.5px var(--c)}\
.kal .opt svg{flex:none;width:36px;height:36px;padding:8px;border-radius:11px;background:#fff;color:var(--c)}\
.kal .opt b{display:block;font-size:15px}.kal .opt small{color:#6b7280;font-size:12.5px}\
.kal .dagen{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 8px;margin:0 -2px 6px;scrollbar-width:thin}\
.kal .dag{flex:none;min-width:70px;padding:9px 8px;border:0;border-radius:14px;background:#f5f7fa;text-align:center;cursor:pointer;color:#111318;font-size:13px;line-height:1.25}\
.kal .dag b{display:block;font-size:14px}.kal .dag small{display:block;color:#6b7280;font-size:11.5px;margin-top:2px}\
.kal .dag.aan{background:var(--c);color:#fff}.kal .dag.aan small{color:rgba(255,255,255,.85)}\
.kal .tijden{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}\
.kal .tijd{padding:11px 0;border:0;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1.5px #e1e6ee;font-size:15px;font-weight:600;cursor:pointer;color:#111318}\
.kal .tijd:hover{box-shadow:inset 0 0 0 2px var(--c);color:var(--c)}\
.kal .tz{margin:10px 0 0;font-size:12px;color:#6b7280}\
.kal .sam{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;background:#eef4ff;margin-bottom:12px;font-size:14px}\
.kal .sam svg{flex:none;width:22px;height:22px;color:var(--c)}\
.kal label{display:block;margin:0 0 8px;font-size:12.5px;color:#6b7280;font-weight:600}\
.kal input{display:block;width:100%;margin-top:4px;padding:11px 12px;border:0;border-radius:12px;background:#f5f7fa;box-shadow:inset 0 0 0 1px #e7eaf0;font-size:16px;color:#111318;outline:none}\
.kal input:focus{background:#fff;box-shadow:inset 0 0 0 2px var(--c)}\
.kal .knop{width:100%;margin-top:6px;padding:13px;border:0;border-radius:14px;background:var(--c);color:#fff;font-size:15px;font-weight:700;cursor:pointer}\
.kal .knop:disabled{opacity:.6;cursor:default}\
.kal .terug{border:0;background:none;padding:0;color:var(--c);font-size:12.5px;font-weight:600;cursor:pointer}\
.kal .err{margin:8px 0 0;font-size:13px;color:#c4211b}\
.kal.ok{background:#eefaf3;box-shadow:0 0 0 1px #bfe8cf}.kal.ok h4{color:#157a42}\
.donker .kal{background:#1b2230;color:#eef1f6;box-shadow:none}.donker .kal .opt,.donker .kal .dag,.donker .kal input{background:#232a36;color:#eef1f6}.donker .kal .tijd{background:#1b2230;color:#eef1f6;box-shadow:inset 0 0 0 1.5px #334}.donker .chip{background:#1b2230;color:#eef1f6}\
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
    if (config && !state.msgs.length) chips();
  }
  // Quick buttons under the greeting, so nobody has to think about what to type.
  function chips() {
    var c = document.createElement("div"); c.className = "chips";
    var lijst = [];
    if (config.boeken) lijst.push([K.chipBoek, function () { c.remove(); kalender(); }, true]);
    lijst.push([K.chipPrijs, function () { c.remove(); ta.value = K.chipPrijs; verstuur(); }]);
    lijst.push([K.chipVraag, function () { c.remove(); ta.focus(); }]);
    lijst.forEach(function (x) {
      var b = document.createElement("button"); b.type = "button"; b.className = "chip" + (x[2] ? " hoofd" : ""); b.textContent = x[0];
      b.addEventListener("click", x[1]); c.appendChild(b);
    });
    log.appendChild(c);
  }

  // ---------- Appointment calendar inside the chat (3 simple steps) ----------
  var ICOON = {
    bellen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    langs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    kantoor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h2a2 2 0 0 1 2 2v10"/><path d="M8 7h4M8 11h4M8 15h4M3 21h18"/></svg>',
    kal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  };
  var esc = function (t) { var d = document.createElement("div"); d.textContent = t == null ? "" : String(t); return d.innerHTML; };
  function dagLabel(datum) {
    var d = new Date(datum + "T12:00:00Z");
    var nu = new Date(), vandaag = nu.getFullYear() + "-" + String(nu.getMonth() + 1).padStart(2, "0") + "-" + String(nu.getDate()).padStart(2, "0");
    var morgen = new Date(nu.getTime() + 864e5), m = morgen.getFullYear() + "-" + String(morgen.getMonth() + 1).padStart(2, "0") + "-" + String(morgen.getDate()).padStart(2, "0");
    var wd = datum === vandaag ? K.vandaag : datum === m ? K.morgen : d.toLocaleDateString(TAAL, { weekday: "short", timeZone: "UTC" });
    return { wd: wd, dt: d.toLocaleDateString(TAAL, { day: "numeric", month: "short", timeZone: "UTC" }) };
  }
  function eindTijd(t, duur) { var m = +t.slice(0, 2) * 60 + +t.slice(3, 5) + duur; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
  function kalender() {
    var oud = log.querySelector(".kal:not(.ok)"); if (oud) oud.remove();
    var kaart = document.createElement("div"); kaart.className = "kal";
    kaart.innerHTML = '<p class="hulp">' + K.laden + "</p>";
    log.appendChild(kaart); log.scrollTop = log.scrollHeight;
    var k = { stap: 1, soort: null, dag: 0, tijd: null, data: null, fout: "" };
    function laad(dan) {
      post({ actie: "agenda", sleutel: KEY, token: state.token }).then(function (d) { k.data = d; if (dan) dan(); teken(); }).catch(function () { kaart.innerHTML = '<p class="err">' + T.net + "</p>"; });
    }
    function stappen() { return k.data && k.data.soorten.length > 1 ? 3 : 2; }
    function kop(n, titel, hulp) {
      var m = stappen(), nn = m === 2 ? n - 1 : n, balk = "";
      for (var i = 1; i <= m; i++) balk += '<i class="' + (i <= nn ? "aan" : "") + '"></i>';
      var terug = n > (m === 2 ? 2 : 1) ? '<button class="terug" type="button" data-terug>‹ ' + K.terug + "</button>" : "<span></span>";
      return '<div class="stp">' + terug + "<span>" + K.stap.replace("{n}", nn).replace("{m}", m) + '</span></div><div class="bal">' + balk + "</div><h4>" + titel + '</h4><p class="hulp">' + hulp + "</p>";
    }
    function teken() {
      var d = k.data; if (!d) return;
      if (!d.soorten || !d.soorten.length) { kaart.innerHTML = '<p class="hulp">' + K.geen + "</p>"; return; }
      if (d.soorten.length === 1) k.soort = d.soorten[0];
      if (k.stap === 1 && k.soort && d.soorten.length === 1) k.stap = 2;
      var h = "";
      if (k.stap === 1) {
        h = kop(1, K.s1, K.s1h);
        d.soorten.forEach(function (s) { h += '<button class="opt" type="button" data-soort="' + s + '">' + ICOON[s] + "<span><b>" + K[s][0] + "</b><small>" + K[s][1] + "</small></span></button>"; });
      } else if (k.stap === 2) {
        h = kop(2, K.s2, K.s2h);
        if (!d.dagen.length) h += '<p class="hulp">' + K.geen + "</p>";
        else {
          h += '<div class="dagen">';
          d.dagen.forEach(function (dg, i) { var l = dagLabel(dg.datum); h += '<button class="dag' + (i === k.dag ? " aan" : "") + '" type="button" data-dag="' + i + '"><b>' + esc(l.wd) + "</b>" + esc(l.dt) + "<small>" + dg.tijden.length + " " + K.vrij + "</small></button>"; });
          h += '</div><div class="tijden">';
          d.dagen[k.dag].tijden.forEach(function (t) { h += '<button class="tijd" type="button" data-tijd="' + t + '">' + t + "</button>"; });
          h += "</div>";
          var eigen = ""; try { eigen = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
          if (eigen && eigen !== d.tijdzone) h += '<p class="tz">' + K.tz.replace("{tz}", esc(d.tijdzone.split("/").pop().replace(/_/g, " "))) + "</p>";
        }
      } else {
        var dg = d.dagen[k.dag], l = dagLabel(dg.datum);
        h = kop(3, K.s3, K.s3h);
        h += '<div class="sam">' + ICOON.kal + "<span><b>" + K[k.soort][0] + "</b><br>" + esc(l.wd + " " + l.dt) + " · " + k.tijd + "–" + eindTijd(k.tijd, d.duur) + "</span></div>";
        h += '<form class="kf"><label>' + K.naam + '<input name="naam" autocomplete="name" required value="' + esc(d.naam || "") + '"></label>';
        h += "<label>" + K.contact + '<input name="contact" autocomplete="tel" required value="' + esc(d.contact || "") + '"></label>';
        if (k.soort === "langs") h += "<label>" + K.adres + '<input name="adres" autocomplete="street-address" required></label>';
        h += '<button class="knop" type="submit">' + K.bevestig + "</button>" + (k.fout ? '<p class="err">' + esc(k.fout) + "</p>" : "") + "</form>";
      }
      kaart.innerHTML = h;
      log.scrollTop = log.scrollHeight;
    }
    kaart.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("button"); if (!t) return;
      if (t.hasAttribute("data-terug")) { k.fout = ""; k.stap = k.stap === 3 ? 2 : 1; if (k.stap === 1) k.soort = null; teken(); }
      else if (t.hasAttribute("data-soort")) { k.soort = t.getAttribute("data-soort"); k.stap = 2; teken(); }
      else if (t.hasAttribute("data-dag")) { k.dag = +t.getAttribute("data-dag"); teken(); }
      else if (t.hasAttribute("data-tijd")) { k.tijd = t.getAttribute("data-tijd"); k.stap = 3; teken(); setTimeout(function () { var i = kaart.querySelector("input"); if (i && !i.value) i.focus(); }, 50); }
    });
    kaart.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, v = function (n) { return f.elements[n] ? f.elements[n].value.trim() : ""; };
      if (!v("naam") || !v("contact") || (k.soort === "langs" && !v("adres"))) { k.fout = K.nodig; teken(); return; }
      var knop = f.querySelector(".knop"); knop.disabled = true; knop.textContent = K.bezig;
      var dg = k.data.dagen[k.dag];
      var body = { actie: "boek", sleutel: KEY, token: state.token, start: dg.datum + "T" + k.tijd, soort: k.soort, naam: v("naam"), contact: v("contact") };
      if (v("adres")) body.adres = v("adres");
      post(body).then(function (r) {
        if (r && r.token) state.token = r.token;
        if (!r || !r.ok) { k.fout = (r && (r.reden || r.antwoord)) || T.fout; k.stap = 2; k.tijd = null; laad(); return; }
        var l = dagLabel(dg.datum), sam = K[k.soort][0] + " · " + l.wd + " " + l.dt + " · " + k.tijd + "–" + eindTijd(k.tijd, k.data.duur);
        kaart.className = "kal ok";
        kaart.innerHTML = '<div class="sam">' + ICOON.kal + "<span><b>✓ " + K.klaar + "</b><br>" + esc(sam) + "</span></div>";
        state.msgs.push({ r: "s", t: "✓ " + K.klaar + ": " + sam });
        if (r.antwoord) { state.msgs.push({ r: "a", t: r.antwoord }); bubble("a", r.antwoord); }
        save(state);
      }).catch(function () { k.fout = T.net; teken(); });
    });
    laad();
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
  window.VolgoAva = { open: open, close: close, afspraak: function () { open(); kalender(); } };
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest("[data-ava-open],[data-ava-book]");
    if (!t) return;
    e.preventDefault(); open();
    if (t.hasAttribute("data-ava-book") && config && config.boeken) kalender();
  });
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
    var ch = log.querySelector(".chips"); if (ch) ch.remove();
    state.msgs.push({ r: "u", t: t }); save(state); bubble("u", t);
    var typ = document.createElement("p"); typ.className = "b a typ"; typ.innerHTML = "<span></span><span></span><span></span>"; log.appendChild(typ); log.scrollTop = log.scrollHeight;
    post({ actie: "bericht", sleutel: KEY, token: state.token, tekst: t }).then(function (r) {
      typ.remove();
      if (r.token) state.token = r.token;
      if (r.laatste_id) state.na = Math.max(state.na || 0, r.laatste_id);
      if (r.mens) { mens = r.mens; zetKop(); save(state); poll(); return; }
      var a = r.antwoord || T.fout;
      state.msgs.push({ r: "a", t: a }); save(state); bubble("a", a);
      if (r.agenda) kalender();
    }).catch(function () {
      typ.remove(); bubble("a", T.net);
    }).then(function () { busy = false; send.disabled = !ta.value.trim(); });
  }
})();
