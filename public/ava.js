/* Volgo chat. Usage: <script src="https://…/ava.js" data-key="SLEUTEL" defer></script> */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || window.__volgoAva) return;
  // Widget texts follow the language of the website (<html lang="...">); Volgo itself replies in the visitor's language.
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
    en: { chipBoek: "Book an appointment", chipPrijs: "What does it cost?", chipVraag: "I have a question", stap: "Step {n} of {m}", s1: "How would you like to meet?", s1h: "Tap one option.", bellen: ["Phone call", "We call you at the time you pick"], langs: ["Visit at your address", "We come to you, for example to measure"], chat: ["Chat appointment", "We chat with you here at the time you pick"], kantoor: ["At our office", "You visit us"], insta: ["DM on Instagram", "Chat with us on Instagram, whenever suits you"], instaT: "Send us a DM on Instagram", instaH: "Tap the button to open Instagram. Start your message with what you need, we reply there.", instaK: "Open Instagram DM", s2: "Pick a day and time", s2h: "Light days still have room. Tap a day, then a time.", dicht: "Closed", vol: "Fully booked", beschikbaar: "Available", nietBeschikbaar: "Not available", vrij: "free", tz: "Times are in {tz} time", geen: "There are no free moments in the coming weeks. Type your phone number in the chat and we'll call you to plan.", s3: "Your details", s3h: "So we know who to expect and how to reach you.", naam: "Your name", contact: "Phone number or email", adres: "Address (street, number, town)", adresOpt: "Address (optional)", bevestig: "Confirm appointment", terug: "Back", bezig: "Booking…", klaar: "Booked", vandaag: "Today", morgen: "Tomorrow", laden: "Loading free moments…", nodig: "Please fill in all fields.", opnieuw: "Pick a time" },
    nl: { chipBoek: "Afspraak maken", chipPrijs: "Wat kost het?", chipVraag: "Ik heb een vraag", stap: "Stap {n} van {m}", s1: "Hoe wil je afspreken?", s1h: "Tik op één keuze.", bellen: ["Telefoongesprek", "We bellen je op het moment dat jij kiest"], langs: ["Langskomen bij jou", "We komen bij je langs, bijvoorbeeld om op te meten"], chat: ["Chatafspraak", "We chatten hier met je op het moment dat jij kiest"], kantoor: ["Bij ons op kantoor", "Jij komt bij ons langs"], insta: ["DM via Instagram", "Stuur ons een bericht op Instagram, wanneer het jou uitkomt"], instaT: "Stuur ons een DM op Instagram", instaH: "Tik op de knop om Instagram te openen. Zet in je bericht waar je hulp bij zoekt, we antwoorden daar.", instaK: "Instagram-DM openen", s2: "Kies een dag en tijd", s2h: "Lichte dagen hebben nog plek. Tik op een dag, daarna op een tijd.", dicht: "Gesloten", vol: "Vol", beschikbaar: "Beschikbaar", nietBeschikbaar: "Niet beschikbaar", vrij: "vrij", tz: "Tijden zijn in {tz}-tijd", geen: "Er zijn de komende weken geen vrije momenten. Typ je telefoonnummer in de chat, dan bellen we je om te plannen.", s3: "Jouw gegevens", s3h: "Zodat we weten wie we verwachten en hoe we je bereiken.", naam: "Je naam", contact: "Telefoonnummer of e-mail", adres: "Adres (straat, nummer, plaats)", adresOpt: "Adres (optioneel)", bevestig: "Afspraak bevestigen", terug: "Terug", bezig: "Bezig met boeken…", klaar: "Geboekt", vandaag: "Vandaag", morgen: "Morgen", laden: "Vrije momenten laden…", nodig: "Vul alle velden in.", opnieuw: "Kies een tijd" },
  };
  var K = KAL[TAAL] || KAL.en;
  // Consent screen: the visitor chooses before using the site (both choices let them in).
  var OK = {
    en: { t: "Before you continue", p: "{b} uses Volgo to answer your questions and to understand how visitors use this website: your approximate location (city and country), device, browser, language and the pages you visit. This helps them help you faster. Nothing is sold or shared with others.", ja: "Accept", nee: "Only necessary", meer: "Privacy", klein: "You can visit the website either way." },
    nl: { t: "Voordat je verdergaat", p: "{b} gebruikt Volgo om je vragen te beantwoorden en om te zien hoe bezoekers deze website gebruiken: je globale locatie (stad en land), apparaat, browser, taal en de pagina's die je bekijkt. Zo kunnen ze je sneller helpen. Er wordt niets verkocht of gedeeld met anderen.", ja: "Accepteren", nee: "Alleen noodzakelijk", meer: "Privacy", klein: "Je kunt de website in beide gevallen bekijken." },
  };
  var O = OK[TAAL] || OK.en;
  window.__volgoAva = true;
  var KEY = script.getAttribute("data-key");
  var BASE = new URL(script.src).origin;
  var API = BASE + "/api/ava";
  var STORE = "volgo-ava-" + KEY;
  var MONO = BASE + "/assets/volgo/ava-mono.svg";
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
.fab{position:fixed;right:18px;bottom:18px;z-index:2147483000;display:flex;align-items:center;gap:10px;padding:6px 18px 6px 6px;border:0;border-radius:999px;background:#fff;color:#111318;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 0 0 1px rgba(17,19,24,.06),0 14px 40px rgba(17,19,24,.18);transition:transform .35s cubic-bezier(.16,1,.3,1),opacity .2s;animation:in .7s cubic-bezier(.16,1,.3,1) .4s both}\
.fab:hover{transform:translateY(-3px) scale(1.03)}\
.fab img{width:48px;height:48px;border-radius:50%;display:block}\
.fab.open{opacity:0;pointer-events:none;transform:scale(.85)}\
.dot{position:absolute;top:6px;left:42px;width:12px;height:12px;border-radius:50%;background:var(--c);border:2px solid #fff}\
@keyframes in{from{transform:translateY(30px) scale(.8);opacity:0}}\
.panel{position:fixed;right:18px;bottom:18px;z-index:2147483001;width:min(380px,calc(100vw - 36px));height:min(600px,calc(100vh - 100px));display:flex;flex-direction:column;border-radius:28px;overflow:hidden;background:linear-gradient(180deg,#eef7ff 0%,#fff 30%);box-shadow:0 0 0 1px rgba(17,19,24,.06),0 30px 80px rgba(17,19,24,.22);transform-origin:bottom right;transform:scale(.6) translateY(20px);opacity:0;visibility:hidden;transition:transform .4s cubic-bezier(.16,1,.3,1),opacity .2s,visibility 0s linear .4s}\
.panel.open{transform:none;opacity:1;visibility:visible;transition:transform .4s cubic-bezier(.16,1,.3,1),opacity .2s,visibility 0s}\
.head{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid #e7eaf0}\
.head img{width:40px;height:40px;border-radius:50%}\
.head strong{display:block;font-size:16px;color:#111318}\
.head small{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#6b7280}\
.head small i{width:7px;height:7px;border-radius:50%;background:#2fbf71}\
.x{margin-left:auto;width:34px;height:34px;border:0;border-radius:50%;background:rgba(17,19,24,.05);cursor:pointer;font-size:18px;line-height:1;color:#111318}\
.log{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:8px}\
.b{max-width:84%;padding:10px 14px;border-radius:20px;font-size:15px;line-height:1.45;white-space:pre-line;word-break:break-word;animation:pop .3s cubic-bezier(.16,1,.3,1)}\
.b.a{align-self:flex-start;background:#fff;color:#111318;box-shadow:0 1px 2px rgba(17,19,24,.08);border-bottom-left-radius:6px}\
.b a{color:var(--c);font-weight:600;text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere}\
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
.fab img,.head img{object-fit:cover;background:#111}\
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 4px}\
.chip{border:0;padding:9px 14px;border-radius:999px;background:#fff;color:#111318;font-size:14px;font-weight:600;cursor:pointer;box-shadow:inset 0 0 0 1.5px var(--c);transition:background .15s,color .15s}\
.chip:hover,.chip.hoofd{background:var(--c);color:#fff}\
.kal{align-self:stretch;margin:4px 0;padding:14px;border-radius:20px;background:#fff;box-shadow:0 0 0 1px #e7eaf0,0 8px 24px rgba(17,19,24,.08);color:#111318;animation:pop .3s cubic-bezier(.16,1,.3,1)}\
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
.kal .mnd{font-size:14px;font-weight:700;margin:0 0 8px}\
.kal .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}\
.kal .wd{text-align:center;font-size:11px;font-weight:700;color:#9aa3af;text-transform:uppercase;padding-bottom:2px}\
.kal .dg{aspect-ratio:1;border:0;border-radius:10px;background:#fff;box-shadow:inset 0 0 0 1.5px var(--c);color:#111318;font-size:14px;font-weight:700;cursor:pointer;transition:transform .12s}\
.kal .dg:hover{transform:scale(1.06)}\
.kal .dg.aan{background:var(--c);color:#fff}\
.kal .dg.nu{text-decoration:underline;text-underline-offset:3px}\
.kal .dg.weg{background:#2b313b;box-shadow:none;color:#6b7280;font-weight:500;cursor:not-allowed;opacity:.55}\
.kal .dg.weg:hover{transform:none}\
.kal .leg{display:flex;gap:14px;margin:8px 0 2px;font-size:11.5px;color:#6b7280}\
.kal .leg span{display:flex;align-items:center;gap:5px}\
.kal .leg i{width:10px;height:10px;border-radius:3px;background:#2b313b;opacity:.55}\
.kal .leg i.vrij{background:#fff;box-shadow:inset 0 0 0 1.5px var(--c);opacity:1}\
.kal .dagkop{margin:12px 0 6px;font-size:13px;font-weight:700}\
.kal .tijd.weg{background:#eceef2;box-shadow:none;color:#a3aab5;text-decoration:line-through;cursor:not-allowed}\
.kal .tijd.weg:hover{box-shadow:none;color:#a3aab5}\
.kal .tijden{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}\
.kal .tijd{padding:11px 0;border:0;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1.5px #e1e6ee;font-size:15px;font-weight:600;cursor:pointer;color:#111318}\
.kal .tijd:hover{box-shadow:inset 0 0 0 2px var(--c);color:var(--c)}\
.kal .tz{margin:10px 0 0;font-size:12px;color:#6b7280}\
.kal .sam{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;background:#eef4ff;margin-bottom:12px;font-size:14px}\
.kal .sam svg{flex:none;width:22px;height:22px;color:var(--c)}\
.kal form{display:block;margin:0;padding:0;background:none;box-shadow:none;border-radius:0}\
.kal form:focus-within{background:none;box-shadow:none}\
.kal label{display:block;margin:0 0 8px;font-size:12.5px;color:#6b7280;font-weight:600}\
.kal input{display:block;width:100%;margin-top:4px;padding:11px 12px;border:0;border-radius:12px;background:#f5f7fa;box-shadow:inset 0 0 0 1px #e7eaf0;font-size:16px;color:#111318;outline:none}\
.kal input:focus{background:#fff;box-shadow:inset 0 0 0 2px var(--c)}\
.kal .knop{width:100%;margin-top:6px;padding:13px;border:0;border-radius:14px;background:var(--c);color:#fff;font-size:15px;font-weight:700;cursor:pointer}\
.kal .knop:disabled{opacity:.6;cursor:default}\
.kal .terug{border:0;background:none;padding:0;color:var(--c);font-size:12.5px;font-weight:600;cursor:pointer}\
.kal .err{margin:8px 0 0;font-size:13px;color:#c4211b}\
.kal.ok{background:#eefaf3;box-shadow:0 0 0 1px #bfe8cf}.kal.ok h4{color:#157a42}\
.donker .kal{background:#1b2230;color:#eef1f6;box-shadow:none}.donker .kal .opt,.donker .kal .dag,.donker .kal input{background:#232a36;color:#eef1f6}.donker .kal .tijd{background:#1b2230;color:#eef1f6;box-shadow:inset 0 0 0 1.5px #334}.donker .chip{background:#1b2230;color:#eef1f6}\
.ok-laag{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:16px;background:rgba(15,20,28,.45);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);animation:okin .3s ease both}\
@keyframes okin{from{opacity:0}}\
.ok-kaart{width:min(460px,100%);padding:24px;border-radius:24px;background:#fff;color:#111318;box-shadow:0 30px 80px rgba(0,0,0,.3);animation:pop .4s cubic-bezier(.16,1,.3,1)}\
.ok-kaart h3{margin:0 0 8px;font-size:19px}\
.ok-kaart p{margin:0 0 18px;font-size:14.5px;line-height:1.55;color:#3c4048}\
.ok-knoppen{display:flex;gap:8px;flex-wrap:wrap}\
.ok-knoppen button{flex:1;min-width:140px;padding:13px 16px;border:0;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer}\
.ok-ja{background:var(--c);color:#fff}.ok-nee{background:#f1f3f6;color:#111318}\
.ok-voet{display:flex;justify-content:space-between;gap:10px;margin-top:12px;font-size:12px;color:#6b7280}.ok-voet a{color:#6b7280}\
.ok-taal{display:flex;align-items:center;gap:8px;margin:0 0 14px;padding:8px 12px;border-radius:12px;background:#f5f7fa;font-size:14px}.ok-taal select{flex:1;border:0;background:transparent;font:inherit;font-weight:600;color:#111318;outline:none}\
.fab .ico{display:none;width:26px;height:26px}\
.knop-bol .fab{padding:5px}.knop-bol .fab .lbl{display:none}.knop-bol .fab img{width:54px;height:54px}.knop-bol .dot{left:46px}\
.knop-icoon .fab{padding:0;width:62px;height:62px;justify-content:center;background:var(--c);color:#fff}.knop-icoon .fab img,.knop-icoon .fab .lbl{display:none}.knop-icoon .fab .ico{display:block}.knop-icoon .dot{top:2px;left:44px;background:#e5484d}\
.zacht .fab{border-radius:22px}.zacht .fab img{border-radius:16px}.zacht .panel{border-radius:22px}.zacht .b{border-radius:16px}.zacht form{border-radius:16px}.zacht .head img{border-radius:12px}.zacht .send{border-radius:12px}\
.knop-icoon.strak .fab{border-radius:16px}.knop-icoon.zacht .fab{border-radius:22px}\
.fab,.panel{bottom:var(--off,18px)}.fab,.panel,.teaser{right:var(--zij,18px)}.links .fab,.links .panel,.links .teaser{right:auto;left:var(--zij,18px)}\
.g-compact .panel{width:min(340px,calc(100vw - 36px));height:min(520px,calc(100vh - 100px))}\
.g-groot .panel{width:min(430px,calc(100vw - 36px));height:min(690px,calc(100vh - 60px))}\
.teaser{position:fixed;bottom:calc(var(--off,18px) + 78px);z-index:2147483000;max-width:260px;padding:12px 34px 12px 14px;border-radius:18px;background:#fff;color:#111318;font-size:14.5px;line-height:1.4;box-shadow:0 0 0 1px rgba(17,19,24,.06),0 14px 40px rgba(17,19,24,.18);cursor:pointer;animation:pop .4s cubic-bezier(.16,1,.3,1)}\
.teaser button{position:absolute;top:6px;right:6px;width:24px;height:24px;border:0;border-radius:50%;background:rgba(17,19,24,.06);cursor:pointer;font-size:14px;line-height:1;color:#111318}\
.strak .teaser{border-radius:12px}.donker .teaser{background:#161b24;color:#f3f5f8}.donker .teaser button{background:rgba(255,255,255,.1);color:#f3f5f8}\
\
/* ---- Premium finish ---- */\
*{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}\
.fab{padding:5px 18px 5px 5px;gap:10px;background:#fff;color:#0a0a0a;font-size:14.5px;font-weight:500;letter-spacing:-.01em;box-shadow:0 0 0 1px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.04),0 12px 32px -6px rgba(0,0,0,.18)}\
.fab:hover{transform:translateY(-2px)}\
.fab img{width:44px;height:44px}\
.dot{left:38px;top:5px;width:11px;height:11px}\
.panel{background:#fff;border-radius:22px;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 2px 6px rgba(0,0,0,.04),0 32px 72px -16px rgba(0,0,0,.28)}\
.head{gap:12px;padding:16px 16px 14px 18px;border-bottom:1px solid #efefef}\
.head img{width:38px;height:38px}\
.wie{min-width:0;display:flex;flex-direction:column;gap:2px}\
.head strong{font-size:15px;font-weight:600;letter-spacing:-.01em;color:#0a0a0a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.head small{font-size:12px;color:#737373;white-space:nowrap;overflow:hidden}\
.head small span{overflow:hidden;text-overflow:ellipsis}\
.head small i{flex:none;width:6px;height:6px;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.15)}\
.x{display:grid;place-items:center;width:32px;height:32px;background:transparent;color:#737373;transition:background .2s,color .2s}\
.x:hover{background:#f4f4f5;color:#0a0a0a}\
.x svg{width:16px;height:16px}\
.log{padding:18px 16px;gap:6px}\
.b{max-width:82%;padding:10px 14px;border-radius:18px;font-size:14.5px;line-height:1.5;letter-spacing:-.003em}\
.b.a,.b.h{background:#f4f4f5;color:#0a0a0a;box-shadow:none;border-bottom-left-radius:6px}\
.b.h{border-left:0;box-shadow:inset 2px 0 0 #0a0a0a}\
.b.h b{color:#525252;font-weight:600;letter-spacing:.01em}\
.b.u{border-bottom-right-radius:6px}\
.b.s{background:transparent;color:#a3a3a3;font-size:11.5px;letter-spacing:.02em}\
.chips{gap:6px;margin:6px 0 4px}\
.chip{padding:8px 14px;background:#fff;color:#0a0a0a;font-size:13.5px;font-weight:500;box-shadow:inset 0 0 0 1px #e5e5e5;transition:background .2s,box-shadow .2s,color .2s}\
.chip:hover{background:#fafafa;color:#0a0a0a;box-shadow:inset 0 0 0 1px #0a0a0a}\
.chip.hoofd,.chip.hoofd:hover{background:var(--c);color:#fff;box-shadow:none}\
form{align-items:center;margin:0 14px;padding:5px 5px 5px 16px;border-radius:16px;background:#fff;box-shadow:inset 0 0 0 1px #e5e5e5;transition:box-shadow .2s}\
form:focus-within{background:#fff;box-shadow:inset 0 0 0 1px #0a0a0a,0 0 0 4px rgba(0,0,0,.05)}\
textarea{font-size:15px;color:#0a0a0a}\
textarea::placeholder{color:#a3a3a3}\
.send{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;transition:opacity .2s,transform .2s}\
.send svg{width:17px;height:17px}\
.send:not(:disabled):hover{transform:translateY(-1px)}\
.send:disabled{opacity:.18}\
.note{margin:10px 16px 12px;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#a3a3a3}\
.note a{color:#a3a3a3;text-decoration:none}\
.typ span{width:6px;height:6px;background:#a3a3a3}\
.kal{border-radius:18px;box-shadow:0 0 0 1px #ececec,0 10px 28px -10px rgba(0,0,0,.12)}\
.kal .opt{background:#fafafa;box-shadow:inset 0 0 0 1px #efefef}\
.kal .opt:hover{background:#fff;box-shadow:inset 0 0 0 1px #0a0a0a}\
.kal .opt svg{background:#fff;color:#0a0a0a;box-shadow:0 0 0 1px #ececec}\
.kal .dag,.kal input{background:#fafafa}\
.kal .sam{background:#f4f4f5}\
.kal .sam svg{color:#0a0a0a}\
.kal .tijd{box-shadow:inset 0 0 0 1px #e5e5e5}\
.kal .tijd:hover{box-shadow:inset 0 0 0 1px #0a0a0a;color:#0a0a0a}\
.kal input:focus{box-shadow:inset 0 0 0 1px #0a0a0a,0 0 0 4px rgba(0,0,0,.05)}\
.kal .bal i{height:3px}\
.kal .knop{border-radius:12px;font-weight:600;letter-spacing:-.005em}\
.ok-kaart{border-radius:20px}\
.ok-nee{background:#f4f4f5}\
.teaser{font-size:14px;box-shadow:0 0 0 1px rgba(0,0,0,.07),0 14px 36px -8px rgba(0,0,0,.2)}\
.donker .fab{background:#0f0f0f;color:#fafafa;box-shadow:0 0 0 1px rgba(255,255,255,.1),0 14px 36px -6px rgba(0,0,0,.6)}\
.donker .panel{background:#0a0a0a;box-shadow:0 0 0 1px rgba(255,255,255,.09),0 32px 72px -16px rgba(0,0,0,.7)}\
.donker .head{border-color:#1f1f1f}.donker .head strong{color:#fafafa}.donker .head small,.donker .note,.donker .note a{color:#8c8c8c}\
.donker .x{background:transparent;color:#8c8c8c}.donker .x:hover{background:#1a1a1a;color:#fafafa}\
.donker .b.a,.donker .b.h{background:#171717;color:#f5f5f5}.donker .b.h{box-shadow:inset 2px 0 0 #fafafa}\
.donker .chip{background:#0a0a0a;color:#f5f5f5;box-shadow:inset 0 0 0 1px #2a2a2a}.donker .chip:hover{background:#141414;box-shadow:inset 0 0 0 1px #fafafa}\
.donker .chip.hoofd{background:var(--c);color:#fff;box-shadow:none}\
.donker form,.donker form:focus-within{background:#0f0f0f;box-shadow:inset 0 0 0 1px #2a2a2a}.donker form:focus-within{box-shadow:inset 0 0 0 1px #fafafa}\
.donker textarea{color:#fafafa}\
.donker .kal{background:#121212;color:#f5f5f5;box-shadow:0 0 0 1px #222}.donker .kal .opt,.donker .kal .dag,.donker .kal input,.donker .kal .sam{background:#1a1a1a;color:#f5f5f5;box-shadow:none}.donker .kal .tijd{background:#121212;color:#f5f5f5;box-shadow:inset 0 0 0 1px #2a2a2a}\
.donker .kal .opt svg{background:#0a0a0a;color:#fafafa;box-shadow:0 0 0 1px #2a2a2a}\
.donker .teaser{background:#0f0f0f;color:#fafafa}\
.strak .panel{border-radius:14px}.strak form{border-radius:10px}.strak .send{border-radius:8px}.strak .chip{border-radius:8px}\
@media (max-width:640px){.panel{border-radius:0}}\
.donker .kal .bal i{background:#2a2a2a}.donker .kal .bal i.aan{background:var(--c)}\
.omkeer :is(.b.u,.chip.hoofd,.chip.hoofd:hover,.send,.kal .knop,.kal .dag.aan,.kal .dg.aan,.ok-ja){color:#0a0a0a}.omkeer .kal .dag.aan small{color:rgba(0,0,0,.6)}.omkeer.knop-icoon .fab{color:#0a0a0a}\
@media (max-width:640px){.teaser{max-width:calc(100vw - 110px)}.links .panel{left:0}.fab span{display:none}.fab{padding:6px}.panel{right:0;bottom:0;width:100%;height:100%;border-radius:0}}\
";
  root.innerHTML = "<style>" + css + "</style><div class=\"w\">" +
    '<button class="fab" type="button" aria-label="' + T.open + '"><img alt="" src="' + MONO + '"><span class="lbl">' + T.vraag + '</span><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/></svg><i class="dot" hidden></i></button>' +
    '<section class="panel" role="dialog" aria-label="Chat"><div class="head"><img alt="" src="' + MONO + '"><div class="wie"><strong class="nm">Volgo</strong><small><i></i><span class="sub">' + T.snel + '</span></small></div><button class="x" type="button" aria-label="' + T.sluit + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    '<div class="log" role="log" aria-live="polite"></div>' +
    '<form><textarea rows="1" maxlength="1500" placeholder="' + T.typ + '" aria-label="' + T.typ + '"></textarea><button class="send" type="submit" aria-label="' + T.stuur + '" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></form>' +
    '<p class="note">' + T.ai + '<span class="merk"> · <a href="' + BASE + '" target="_blank" rel="noopener">Volgo</a></span></p></section></div>';

  var $ = function (s) { return root.querySelector(s); };
  var fab = $(".fab"), panel = $(".panel"), log = $(".log"), form = $("form"), ta = $("textarea"), send = $(".send");
  var config = null, busy = false;

  // Web addresses in Volgo's answers become clickable links (safe: only http/https).
  function linkjes(el, tekst) {
    String(tekst).split(/(https?:\/\/[^\s<>"')]+)/g).forEach(function (stuk, i) {
      if (i % 2) {
        var url = stuk.replace(/[.,!?;:]+$/, ""), rest = stuk.slice(url.length);
        var a = document.createElement("a"); a.href = url; a.textContent = url.replace(/^https?:\/\//, ""); a.target = "_top"; a.rel = "noopener";
        el.appendChild(a); if (rest) el.appendChild(document.createTextNode(rest));
      } else if (stuk) el.appendChild(document.createTextNode(stuk));
    });
  }
  function bubble(rol, tekst, wie) {
    var p = document.createElement("p");
    p.className = "b " + (rol === "u" ? "u" : rol === "h" ? "h" : rol === "s" ? "s" : "a");
    if (rol === "h" && wie) { var n = document.createElement("b"); n.textContent = wie; p.appendChild(n); p.appendChild(document.createTextNode(tekst)); }
    else if (rol === "a" || rol === "h") linkjes(p, tekst);
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
    insta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16A2.5 2.5 0 0 1 4 13.5z"/></svg>',
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
    gebeurtenis("agenda_open");
    var ch = log.querySelector(".chips"); if (ch) ch.remove();
    var kaart = document.createElement("div"); kaart.className = "kal";
    kaart.innerHTML = '<p class="hulp">' + K.laden + "</p>";
    log.appendChild(kaart); log.scrollTop = log.scrollHeight;
    var k = { stap: 1, soort: null, dag: null, tijd: null, data: null, fout: "" };
    function laad(dan) {
      post({ actie: "agenda", sleutel: KEY, token: state.token }).then(function (d) { k.data = d; if (dan) dan(); teken(); }).catch(function () { kaart.innerHTML = '<p class="err">' + T.net + "</p>"; });
    }
    function stappen() { return k.data && k.data.soorten.length > 1 ? 3 : 2; }
    function instaKaart() {
      var u = String(k.data.instagram || "").replace(/[^A-Za-z0-9._]/g, "");
      return kop(2, K.instaT, K.instaH) + '<a class="knop" style="display:block;text-align:center;text-decoration:none" href="https://ig.me/m/' + u + '" target="_blank" rel="noopener">' + ICOON.insta.replace("<svg ", '<svg style="width:18px;height:18px;vertical-align:-3px;margin-right:6px" ') + K.instaK + "</a><p class=\"tz\">@" + esc(u) + "</p>";
    }
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
      } else if (k.stap === 2 && k.soort === "insta") {
        h = instaKaart();
      } else if (k.stap === 2) {
        h = kop(2, K.s2, K.s2h);
        var eerste = -1;
        d.dagen.forEach(function (dg, i) { if (eerste < 0 && dg.status === "open") eerste = i; });
        if (eerste < 0) h += '<p class="hulp">' + K.geen + "</p>";
        else {
          if (k.dag == null || !d.dagen[k.dag] || d.dagen[k.dag].status !== "open") k.dag = eerste;
          var gekozen = d.dagen[k.dag];
          var maand = new Date(gekozen.datum + "T12:00:00Z").toLocaleDateString(TAAL, { month: "long", year: "numeric", timeZone: "UTC" });
          h += '<div class="mnd">' + esc(maand.charAt(0).toUpperCase() + maand.slice(1)) + "</div><div class=\"grid\">";
          for (var w = 0; w < 7; w++) h += '<span class="wd">' + esc(new Date(Date.UTC(2024, 0, 1 + w)).toLocaleDateString(TAAL, { weekday: "narrow", timeZone: "UTC" })) + "</span>";
          var vandaagIso = (function () { var n = new Date(); return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"); })();
          d.dagen.forEach(function (dg, i) {
            var nr = +dg.datum.slice(8, 10), kan = dg.status === "open";
            var titel = kan ? dg.tijden.filter(function (x) { return x.vrij; }).length + " " + K.vrij : dg.status === "dicht" ? K.dicht : dg.status === "vol" ? K.vol : "";
            h += '<button type="button" class="dg' + (kan ? "" : " weg") + (i === k.dag ? " aan" : "") + (dg.datum === vandaagIso ? " nu" : "") + '"' + (kan ? ' data-dag="' + i + '"' : " disabled") + ' title="' + esc(titel) + '" aria-label="' + esc(dg.datum + " " + titel) + '">' + nr + "</button>";
          });
          h += '</div><div class="leg"><span><i class="vrij"></i>' + K.beschikbaar + '</span><span><i></i>' + K.nietBeschikbaar + "</span></div>";
          var l2 = dagLabel(gekozen.datum);
          h += '<p class="dagkop">' + esc(l2.wd + " " + l2.dt) + "</p><div class=\"tijden\">";
          gekozen.tijden.forEach(function (x) { h += '<button class="tijd' + (x.vrij ? "" : " weg") + '" type="button"' + (x.vrij ? ' data-tijd="' + x.t + '"' : " disabled") + ">" + x.t + "</button>"; });
          h += "</div>" + (k.fout ? '<p class="err">' + esc(k.fout) + "</p>" : "");
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
        else if (k.soort !== "kantoor") h += "<label>" + (K.adresOpt || K.adres) + '<input name="adres" autocomplete="street-address"></label>';
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
      else if (t.hasAttribute("data-tijd")) { k.fout = ""; k.tijd = t.getAttribute("data-tijd"); k.stap = 3; teken(); setTimeout(function () { var i = kaart.querySelector("input"); if (i && !i.value) i.focus(); }, 50); }
    });
    kaart.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, v = function (n) { return f.elements[n] ? f.elements[n].value.trim() : ""; };
      if (!v("naam") || !v("contact") || (k.soort === "langs" && !v("adres"))) { k.fout = K.nodig; teken(); return; }
      var knop = f.querySelector(".knop"); knop.disabled = true; knop.textContent = K.bezig;
      var dg = k.data.dagen[k.dag];
      var body = { actie: "boek", sleutel: KEY, token: state.token, start: dg.datum + "T" + k.tijd, soort: k.soort, naam: v("naam"), contact: v("contact"), sessie: SESSIE, toestemming: TOESTEMMING };
      if (v("adres")) body.adres = v("adres");
      post(body).then(function (r) {
        if (r && r.token) state.token = r.token;
        if (!r || !r.ok) { k.fout = (r && (r.reden || r.antwoord)) || T.fout; k.stap = 2; k.tijd = null; k.dag = null; laad(); return; }
        var l = dagLabel(dg.datum), sam = K[k.soort][0] + " · " + l.wd + " " + l.dt + " · " + k.tijd + "–" + eindTijd(k.tijd, k.data.duur);
        kaart.className = "kal ok";
        gebeurtenis("geboekt");
        kaart.innerHTML = '<div class="sam">' + ICOON.kal + "<span><b>✓ " + K.klaar + "</b><br>" + esc(sam) + "</span></div>";
        state.msgs.push({ r: "s", t: "✓ " + K.klaar + ": " + sam });
        if (r.antwoord) { state.msgs.push({ r: "a", t: r.antwoord }); bubble("a", r.antwoord); }
        save(state);
      }).catch(function () { k.fout = T.net; teken(); });
    });
    laad();
  }
  // Short invitation bubble next to the chat button (optional).
  var PREVIEW = script.getAttribute("data-preview") === "1";
  var teaserTekst = "", teaserTimer = 0;
  function teaserZetten(t) {
    teaserTekst = String(t || "").slice(0, 90);
    var oud = $(".teaser"); if (oud) oud.remove();
    clearTimeout(teaserTimer);
    if (!teaserTekst) return;
    var weg = false; try { weg = sessionStorage.getItem("volgo-t-" + KEY) === "1"; } catch (e) {}
    if (weg && !PREVIEW) return;
    teaserTimer = setTimeout(function () {
      if (panel.classList.contains("open") || $(".teaser")) return;
      var d = document.createElement("div"); d.className = "teaser"; d.setAttribute("role", "button");
      d.innerHTML = '<span></span><button type="button" aria-label="' + T.sluit + '">×</button>';
      d.querySelector("span").textContent = teaserTekst;
      d.addEventListener("click", function (e) {
        if (e.target.tagName === "BUTTON") { try { sessionStorage.setItem("volgo-t-" + KEY, "1"); } catch (x) {} d.remove(); e.stopPropagation(); return; }
        d.remove(); open();
      });
      $(".w").appendChild(d);
    }, PREVIEW ? 300 : 5000);
  }
  function applyConfig(c) {
    config = c;
    var donker0 = c.thema === "donker" || (c.thema === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    // A very dark brand colour disappears on the dark theme: use white there instead.
    var kl = /^#[0-9a-f]{6}$/i.test(c.kleur || "") ? c.kleur : "#0a0a0a";
    var lum = (0.2126 * parseInt(kl.slice(1, 3), 16) + 0.7152 * parseInt(kl.slice(3, 5), 16) + 0.0722 * parseInt(kl.slice(5, 7), 16)) / 255;
    var omkeer = donker0 && lum < 0.18;
    var kleur = omkeer ? "#fafafa" : kl;
    host.style.setProperty("--c", kleur);
    root.querySelector(".panel").style.setProperty("--c", kleur);
    fab.style.setProperty("--c", kleur);
    $(".nm").textContent = c.naam; var sb = $(".sub"); if (sb && sb.textContent === T.snel && c.bedrijf) sb.textContent = c.bedrijf + " · " + T.snel;
    $(".lbl").textContent = c.knoptekst || T.vraagNaam + c.naam;
    // Own style (Pro and Premium): photo, position, theme, shape, font, no Volgo mention.
    var w = $(".w");
    var donker = c.thema === "donker" || (c.thema === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    w.className = "w" + (c.positie === "links" ? " links" : "") + (donker ? " donker" : "") + (c.vorm === "strak" ? " strak" : c.vorm === "zacht" ? " zacht" : "") + (c.lettertype === "website" ? " wf" : "") +
      " knop-" + (c.knop || "pil") + " g-" + (c.grootte || "normaal") + (omkeer ? " omkeer" : "");
    host.style.setProperty("--off", Math.max(8, Math.min(140, +c.afstand || 18)) + "px");
    host.style.setProperty("--zij", Math.max(8, Math.min(60, +c.zij || 18)) + "px");
    teaserZetten(c.uitnodiging || "");
    if (c.lettertype === "website") { try { host.style.fontFamily = getComputedStyle(document.body).fontFamily; } catch (e) {} }
    var foto = c.avatar || MONO;
    Array.prototype.forEach.call(root.querySelectorAll(".fab img,.head img"), function (img) { if (img.getAttribute("src") !== foto) img.src = foto; });
    var merk = $(".merk"); if (merk) merk.hidden = c.branding === false;
    render();
  }
  host.style.setProperty("--c", "#0a0a0a");
  // Live preview in the Volgo dashboard editor: the style comes from the editor, nothing is measured.
  if (PREVIEW) window.addEventListener("message", function (e) {
    if (e.origin !== BASE || !e.data || !e.data.volgo) return;
    if (e.data.volgo === "stijl" && config) applyConfig(Object.assign({}, config, e.data.c));
    if (e.data.volgo === "open") open();
    if (e.data.volgo === "dicht") close();
  });
  post({ actie: "config", sleutel: KEY }).then(function (c) {
    // Subscription ended: remove the chat from the website.
    if (c && c.uit) { host.remove(); return; }
    if (c && !c.fout) {
      if (PREVIEW) { applyConfig(c); try { parent.postMessage({ volgo: "klaar" }, "*"); } catch (e) {} return; }
      applyConfig(c); toestemmingVragen(c);
    }
  }).catch(function () {});
  if (!state.msgs.length) setTimeout(function () { var d = $(".dot"); if (d && !panel.classList.contains("open")) d.hidden = false; }, 4000);

  // ---------- Website analytics for the business (no cookies, nothing personal) ----------
  // Skipped entirely when the visitor's browser asks not to be tracked.
  var NIET = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  var IN_FRAME = false; try { IN_FRAME = window.top !== window.self; } catch (e) { IN_FRAME = true; }
  var EIGEN_SITE = false; try { EIGEN_SITE = location.hostname === new URL(BASE).hostname && !IN_FRAME; } catch (e) {}
  var SESSIE = (function () {
    try { var x = sessionStorage.getItem("volgo-s"); if (!x) { x = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("volgo-s", x); } return x; }
    catch (e) { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  })();
  var view = { id: 0, pad: "", zicht: 0, sinds: 0, scroll: 0 };
  function beacon(body) {
    var t = JSON.stringify(body);
    try { if (navigator.sendBeacon && navigator.sendBeacon(API, new Blob([t], { type: "text/plain" }))) return; } catch (e) {}
    try { fetch(API, { method: "POST", body: t, keepalive: true, headers: { "content-type": "text/plain" } }); } catch (e) {}
  }
  var KEUZE_SLEUTEL = "volgo-ok-" + KEY, TOESTEMMING = false, VAST = "";
  function keuzeLezen() {
    try { var k = JSON.parse(localStorage.getItem(KEUZE_SLEUTEL) || "null"); if (k && Date.now() - k.op < 180 * 864e5) return k.ja ? "ja" : "nee"; } catch (e) {}
    return "";
  }
  function keuzeKlaar(ja) {
    TOESTEMMING = !!ja;
    if (ja) { try { VAST = localStorage.getItem("volgo-v") || ""; if (!VAST) { VAST = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("volgo-v", VAST); } } catch (e) {} }
    meten();
  }
  function toestemmingVragen(c) {
    var k = keuzeLezen();
    var inFrame = false; try { inFrame = window.top !== window.self; } catch (e) { inFrame = true; }
    if (!c.toestemming || NIET || inFrame) { keuzeKlaar(false); return; }
    if (k) { keuzeKlaar(k === "ja"); return; }
    // Volgo's own site: count the visit right away in the anonymous mode ("Only necessary": no location, browser or
    // returning-visitor id), so ad visitors who leave before choosing still show up. Accepting later adds nothing to it.
    if (EIGEN_SITE) meten();
    var laag = document.createElement("div"); laag.className = "ok-laag"; laag.setAttribute("role", "dialog"); laag.setAttribute("aria-modal", "true");
    laag.innerHTML = '<div class="ok-kaart"><h3></h3><p></p><div class="ok-knoppen"><button class="ok-nee" type="button"></button><button class="ok-ja" type="button"></button></div><div class="ok-voet"><span></span><a target="_blank" rel="noopener"></a></div></div>';
    laag.querySelector("h3").textContent = O.t;
    laag.querySelector("p").textContent = O.p.replace("{b}", c.bedrijf || "This website");
    laag.querySelector(".ok-ja").textContent = O.ja;
    laag.querySelector(".ok-nee").textContent = O.nee;
    laag.querySelector(".ok-voet span").textContent = O.klein;
    var a = laag.querySelector(".ok-voet a"); a.textContent = O.meer; a.href = BASE + "/privacy";
    // On Volgo's own website: pick the language of the site right here.
    if (location.hostname === new URL(BASE).hostname) {
      var TALEN = [["en","English"],["nl","Nederlands"],["de","Deutsch"],["fr","Français"],["es","Español"],["pt","Português"],["it","Italiano"],["pl","Polski"],["sv","Svenska"],["da","Dansk"],["fi","Suomi"],["el","Ελληνικά"],["cs","Čeština"],["sk","Slovenčina"],["hu","Magyar"],["ro","Română"],["bg","Български"],["hr","Hrvatski"],["sl","Slovenščina"],["et","Eesti"],["lv","Latviešu"],["lt","Lietuvių"],["ga","Gaeilge"],["mt","Malti"]];
      var huidig = "en"; try { huidig = localStorage.getItem("volgo-taal") || ((navigator.language || "en").slice(0, 2).toLowerCase()); } catch (e) {}
      var rij = document.createElement("label"); rij.className = "ok-taal";
      var sel = document.createElement("select"); sel.setAttribute("aria-label", "Language");
      TALEN.forEach(function (t) { var o = document.createElement("option"); o.value = t[0]; o.textContent = t[1]; if (t[0] === huidig) o.selected = true; sel.appendChild(o); });
      var lbl = document.createElement("span"); lbl.textContent = "🌐"; rij.appendChild(lbl); rij.appendChild(sel);
      sel.addEventListener("change", function () { try { localStorage.setItem("volgo-taal", sel.value); } catch (e) {} window.dispatchEvent(new CustomEvent("volgo-taal", { detail: sel.value })); });
      laag.querySelector(".ok-kaart").insertBefore(rij, laag.querySelector(".ok-knoppen"));
    }
    var kies = function (ja) { try { localStorage.setItem(KEUZE_SLEUTEL, JSON.stringify({ ja: ja, op: Date.now() })); } catch (e) {} laag.remove(); keuzeKlaar(ja); try { window.dispatchEvent(new CustomEvent("volgo-ok", { detail: ja })); } catch (e) {} };
    laag.querySelector(".ok-ja").addEventListener("click", function () { kies(true); });
    laag.querySelector(".ok-nee").addEventListener("click", function () { kies(false); });
    root.querySelector(".w").appendChild(laag);
    setTimeout(function () { var b = laag.querySelector(".ok-ja"); if (b) b.focus(); }, 50);
  }
  function actief() { return view.zicht + (view.sinds ? (Date.now() - view.sinds) / 1000 : 0); }
  function ping() { if (!NIET && view.id) beacon({ actie: "ping", sleutel: KEY, sessie: SESSIE, id: view.id, duur: Math.round(actief()), scroll: view.scroll }); }
  function gebeurtenis(soort) { if (!NIET) beacon({ actie: "event", sleutel: KEY, sessie: SESSIE, soort: soort }); }
  function nieuweView() {
    if (NIET) return;
    var pad = location.pathname + (location.hash && location.hash.length < 40 ? "" : "");
    if (pad === view.pad) return;
    ping();
    view = { id: 0, pad: pad, zicht: 0, sinds: document.visibilityState === "visible" ? Date.now() : 0, scroll: 0 };
    var eerste = false;
    try { eerste = !sessionStorage.getItem("volgo-r"); sessionStorage.setItem("volgo-r", "1"); } catch (e) {}
    var utm = ""; try { utm = new URLSearchParams(location.search).get("utm_source") || ""; } catch (e) {}
    var huidig = view;
    post({ actie: "view", sleutel: KEY, sessie: SESSIE, pad: pad.slice(0, 480), titel: (document.title || "").slice(0, 280), ref: eerste ? (document.referrer || "").slice(0, 480) : "", utm: utm.slice(0, 70), host: location.hostname, breedte: window.innerWidth || 0, toestemming: TOESTEMMING, vast: TOESTEMMING ? VAST : undefined, taal: TOESTEMMING ? (navigator.language || "").slice(0, 12) : undefined })
      .then(function (r) { if (r && r.id) huidig.id = r.id; }).catch(function () {});
  }
  function meten() {
    if (NIET || window.__volgoMeet) return;
    window.__volgoMeet = true;
    nieuweView();
    window.addEventListener("scroll", function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.round((window.scrollY / h) * 100) : 100;
      if (p > view.scroll) view.scroll = Math.min(100, p);
    }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") { if (view.sinds) { view.zicht += (Date.now() - view.sinds) / 1000; view.sinds = 0; } ping(); }
      else view.sinds = Date.now();
    });
    window.addEventListener("pagehide", ping);
    setInterval(function () { if (document.visibilityState === "visible") ping(); }, 20000);
    // Websites that change pages without reloading (React, Shopify themes, …).
    ["pushState", "replaceState"].forEach(function (f) {
      var orig = history[f];
      history[f] = function () { var r = orig.apply(this, arguments); setTimeout(nieuweView, 300); return r; };
    });
    window.addEventListener("popstate", function () { setTimeout(nieuweView, 300); });
  }

  var chatGeteld = false, berichtGeteld = false;
  function open() { var tz = $(".teaser"); if (tz) tz.remove(); if (!chatGeteld) { chatGeteld = true; gebeurtenis("chat_open"); } panel.classList.add("open"); fab.classList.add("open"); $(".dot").hidden = true; setTimeout(function () { ta.focus(); }, 250); }
  function close() { panel.classList.remove("open"); fab.classList.remove("open"); }
  fab.addEventListener("click", open);
  $(".x").addEventListener("click", close);
  root.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  // Any button on the website with data-ava-open (e.g. "Request a quote") opens Volgo. Also available as window.VolgoAva.open().
  // Ask a question for the visitor, e.g. from a "Start free trial" button.
  function vraag(t) { if (!t) return; var ch = log.querySelector(".chips"); if (ch) ch.remove(); setTimeout(function () { if (busy) return; ta.value = t; verstuur(); }, 350); }
  // Landing-page funnel steps (only these names; just the step and the session, never any content).
  var STAPPEN = { demo_klik: 1, demo_bericht: 1, abo_klik: 1 };
  window.VolgoAva = { open: open, close: close, afspraak: function () { open(); kalender(); }, vraag: function (t) { open(); vraag(t); }, meet: function (s) { if (STAPPEN[s] === 1) gebeurtenis(s); } };
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest("[data-ava-open],[data-ava-book],[data-ava-ask]");
    if (!t) return;
    e.preventDefault(); open();
    if (t.hasAttribute("data-ava-book") && config && config.boeken) kalender();
    if (t.hasAttribute("data-ava-ask")) vraag(t.getAttribute("data-ava-ask"));
  });
  ta.addEventListener("input", function () { send.disabled = !ta.value.trim() || busy; });
  ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); verstuur(); } });
  form.addEventListener("submit", function (e) { e.preventDefault(); verstuur(); });

  // A team member can take over the chat from the dashboard: fetch their messages.
  var mens = null;
  function zetKop() {
    var sub = $(".sub");
    if (sub) sub.textContent = mens ? mens + T.team : (config && config.bedrijf ? config.bedrijf + " · " : "") + T.snel;
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
    if (!berichtGeteld) {
      berichtGeteld = true; gebeurtenis("chat_bericht");
      // Inside Volgo's live demo: tell the page around it that the visitor sent a first message (no text, nothing personal).
      if (IN_FRAME) { try { parent.postMessage({ volgo: "demo-bericht" }, location.origin); } catch (e) {} }
    }
    state.msgs.push({ r: "u", t: t }); save(state); bubble("u", t);
    var typ = document.createElement("p"); typ.className = "b a typ"; typ.innerHTML = "<span></span><span></span><span></span>"; log.appendChild(typ); log.scrollTop = log.scrollHeight;
    post({ actie: "bericht", sleutel: KEY, token: state.token, tekst: t, sessie: SESSIE, toestemming: TOESTEMMING }).then(function (r) {
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
