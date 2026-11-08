import { esc } from "./util.js";

export const CSS = `
:root{--ink:#0B0D10;--slab:#14171C;--line:#262A31;--chalk:#F2F1EC;--mute:#9A9EA6;--volt:#FF5B2E;--good:#3FCF8E;--warn:#F2B544;--bad:#FF6B6B;
--display:"Bricolage Grotesque",ui-sans-serif,system-ui,sans-serif;--body:"Geist",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:dark}
*{box-sizing:border-box}
html,body{margin:0;background:var(--ink);color:var(--chalk);font-family:var(--body);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:inherit}
h1,h2,h3{font-family:var(--display);text-wrap:balance;margin:0;letter-spacing:-.02em}
button{font:inherit;cursor:pointer}
:focus-visible{outline:2px solid var(--volt);outline-offset:3px;border-radius:8px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;padding:13px 22px;font-weight:600;text-decoration:none;transition:transform .15s,background .15s;font-size:15px}
.btn-main{background:var(--volt);color:#fff}.btn-main:hover{background:#ff6c43}
.btn-ghost{background:transparent;color:var(--chalk);border:1px solid var(--line)}.btn-ghost:hover{border-color:var(--mute)}
.btn:disabled{opacity:.5;cursor:default}
.small{font-size:14px;color:var(--mute)}
.top{position:sticky;top:0;z-index:20;background:rgba(11,13,16,.88);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.top .in{display:flex;align-items:center;justify-content:space-between;height:60px;gap:12px;padding:0 20px;max-width:1280px;margin:0 auto}
.logo{display:flex;align-items:center;gap:10px;font-family:var(--display);font-weight:800;font-size:19px;text-decoration:none}
.mark{width:26px;height:26px;border-radius:8px;background:var(--volt);display:grid;place-items:center}
.who-top{display:flex;gap:14px;align-items:center;font-size:14px;color:var(--mute)}
.who-top a{text-decoration:none}.who-top a:hover{color:var(--chalk)}
/* auth */
.auth{min-height:calc(100vh - 60px);display:grid;place-items:center;padding:40px 16px}
.card{width:100%;max-width:440px;background:var(--slab);border:1px solid var(--line);border-radius:24px;padding:32px}
.card h1{font-size:32px;font-weight:800;margin-bottom:6px}
.card .sub{color:var(--mute);margin:0 0 22px}
.form{display:grid;gap:16px}
.field label{display:block;font-weight:600;font-size:15px;margin-bottom:6px}
.field .hint{font-size:13px;color:var(--mute);margin:-2px 0 8px}
.field input,.field textarea,.field select{width:100%;background:var(--ink);border:1px solid var(--line);color:var(--chalk);border-radius:12px;padding:12px 14px;font:inherit;font-size:15px}
.field textarea{min-height:84px;resize:vertical}
.err{background:rgba(255,107,107,.12);border:1px solid rgba(255,107,107,.4);color:#ffb3b3;border-radius:12px;padding:10px 14px;font-size:14px}
.ok{background:rgba(63,207,142,.12);border:1px solid rgba(63,207,142,.4);color:#9ff0c7;border-radius:12px;padding:10px 14px;font-size:14px}
.note{background:rgba(255,91,46,.10);border:1px solid rgba(255,91,46,.45);border-radius:14px;padding:14px 18px;font-size:15px}
/* app */
.shell{display:grid;grid-template-columns:230px 1fr;min-height:calc(100vh - 60px);max-width:1280px;margin:0 auto}
.side{border-right:1px solid var(--line);padding:20px 12px;display:flex;flex-direction:column;gap:4px}
.side a{padding:10px 14px;border-radius:12px;color:var(--mute);font-size:15px;display:flex;justify-content:space-between;align-items:center;text-decoration:none}
.side a:hover,.side a.on{color:var(--chalk);background:var(--slab)}
.side .sep{height:1px;background:var(--line);margin:12px 6px}
.count{font-size:12px;background:var(--volt);color:#fff;border-radius:999px;padding:1px 8px}
.main{padding:28px;min-width:0}
.main h2{font-size:30px;font-weight:800}
.lede{color:var(--mute);margin:6px 0 24px}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.tile{background:var(--slab);border:1px solid var(--line);border-radius:18px;padding:18px}
.tile span{font-size:13px;color:var(--mute)}
.tile b{display:block;font-family:var(--display);font-size:34px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:4px}
.panel{background:var(--slab);border:1px solid var(--line);border-radius:18px;margin-top:16px;overflow:hidden}
.panel h3{font-size:17px;padding:16px 18px;border-bottom:1px solid var(--line)}
.panel .pad{padding:18px}
.row{display:grid;grid-template-columns:40px 1fr auto;gap:12px;align-items:center;padding:14px 18px;border-bottom:1px solid var(--line);text-decoration:none;color:inherit}
.row:last-child{border-bottom:0}
a.row:hover{background:#181B21}
.row b{font-size:15px}
.row p{margin:2px 0 0;color:var(--mute);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row p.wrap{white-space:normal}
.av{width:36px;height:36px;border-radius:50%;background:#2A2E36;display:grid;place-items:center;font-weight:700;font-size:13px;color:#fff;flex:none}
.av.hot{background:linear-gradient(135deg,#FF5B2E,#FFB36B)}
.pill{font-size:12px;border-radius:999px;padding:3px 10px;white-space:nowrap;font-weight:500}
.p-booked,.p-link_sent{background:rgba(63,207,142,.14);color:var(--good)}
.p-qualifying{background:rgba(242,181,68,.14);color:var(--warn)}
.p-needs_you{background:rgba(255,91,46,.16);color:#FF8B6B}
.p-new,.p-not_fit,.p-paused{background:#23272E;color:var(--mute)}
.empty{padding:28px 18px;color:var(--mute);text-align:center}
.msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px}
.bub{max-width:82%;padding:10px 14px;border-radius:20px;font-size:14.5px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}
.bub.lead{align-self:flex-start;background:#3A3F48;border-bottom-left-radius:6px}
.bub.bot,.bub.coach{align-self:flex-end;background:#22262D;border-bottom-right-radius:6px}
.bub.coach{background:#1E3A5F}
.bub .by{display:block;font-size:11px;color:var(--mute);margin-bottom:2px}
.thread{background:var(--slab);border:1px solid var(--line);border-radius:18px;display:flex;flex-direction:column;min-height:520px}
.thread-head{padding:16px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}
.composer{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line)}
.composer input{flex:1;min-width:0;background:#0B0D10;border:1px solid var(--line);color:var(--chalk);border-radius:999px;padding:11px 16px;font:inherit;font-size:14.5px}
.composer button{border:0;border-radius:999px;background:var(--volt);color:#fff;padding:0 16px;font-weight:600}
.composer button:disabled{opacity:.5}
.typing{align-self:flex-start;color:var(--mute);font-size:13px;padding:4px 6px}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{border:1px solid var(--line);background:transparent;color:var(--mute);border-radius:999px;padding:8px 14px;font-size:14px}
.chip.on{border-color:var(--volt);color:var(--chalk);background:rgba(255,91,46,.12)}
.setter-grid{display:grid;grid-template-columns:1fr 380px;gap:28px;align-items:start}
.phone{background:#000;border:1px solid var(--line);border-radius:36px;padding:10px;width:100%;max-width:380px}
.screen{background:var(--slab);border-radius:28px;overflow:hidden;display:flex;flex-direction:column;height:540px}
.chat-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line)}
.chat-head b{display:block;font-size:15px}.chat-head span{font-size:12px;color:var(--mute)}
.phone .bub.lead{align-self:flex-end;border-bottom-right-radius:6px;border-bottom-left-radius:20px}
.phone .bub.bot{align-self:flex-start;border-bottom-left-radius:6px;border-bottom-right-radius:20px}
.bub.link{background:rgba(63,207,142,.14);border:1px solid rgba(63,207,142,.4)}
.steps{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}
.steps span{font-size:13px;border:1px solid var(--line);border-radius:999px;padding:5px 12px;color:var(--mute)}
.steps span.on{border-color:var(--volt);color:var(--chalk)}
.steps span.done{color:var(--good);border-color:rgba(63,207,142,.4)}
.status{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dot{width:9px;height:9px;border-radius:50%;background:var(--mute)}.dot.on{background:var(--good);box-shadow:0 0 0 4px rgba(63,207,142,.15)}.dot.off{background:var(--bad)}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--mute);font-weight:500}
td.num{font-variant-numeric:tabular-nums}
.tablewrap{overflow-x:auto}
.legal{max-width:760px;margin:0 auto;padding:48px 20px}
.legal h1{font-size:40px;margin-bottom:8px}.legal h2{font-size:22px;margin:28px 0 8px}.legal p,.legal li{color:#cfd0cc}
@media (max-width:900px){
  .shell{grid-template-columns:1fr}
  .side{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid var(--line);padding:10px}
  .side .sep{display:none}.side a{white-space:nowrap}
  .main{padding:20px 16px}
  .tiles{grid-template-columns:1fr 1fr}
  .setter-grid{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Geist:wght@400;500;600&display=swap" rel="stylesheet">`;

const LOGO = `<a class="logo" href="/"><span class="mark"><svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="6" width="3" height="4" rx="1" fill="#fff"/><rect x="12" y="6" width="3" height="4" rx="1" fill="#fff"/><rect x="4" y="4" width="2" height="8" rx="1" fill="#fff"/><rect x="10" y="4" width="2" height="8" rx="1" fill="#fff"/><rect x="6" y="7.2" width="4" height="1.6" fill="#fff"/></svg></span>Spotter</a>`;

export function page({ title, body, coach = null, script = "" }) {
  const right = coach
    ? `<div class="who-top"><span>${esc(coach.email)}</span><a href="/logout">Log out</a></div>`
    : `<div class="who-top"><a href="/login">Log in</a><a class="btn btn-main" style="padding:9px 16px" href="/start">Start</a></div>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} · Spotter</title>${FONTS}<style>${CSS}</style></head><body>
<nav class="top"><div class="in">${LOGO}${right}</div></nav>
${body}
${script ? `<script>${script}</script>` : ""}
</body></html>`;
}

export function appPage({ title, coach, active, body, script = "", needs = 0 }) {
  const link = (href, label, key, extra = "") => `<a href="${href}" class="${active === key ? "on" : ""}">${label}${extra}</a>`;
  const side = `<aside class="side">
    ${link("/dashboard", "Today", "today")}
    ${link("/inbox", "Inbox", "inbox", needs ? ` <span class="count">${needs}</span>` : "")}
    ${link("/calls", "Calls", "calls")}
    <div class="sep"></div>
    ${link("/setter", "Your setter", "setter")}
    ${link("/connect", "Instagram", "connect")}
    ${link("/billing", "Billing", "billing")}
    ${coach.isAdmin ? `<div class="sep"></div>${link("/admin", "Owner", "admin")}` : ""}
  </aside>`;
  return page({ title, coach, script, body: `<div class="shell">${side}<div class="main">${body}</div></div>` });
}

export const STAGE_LABEL = { new: "New", qualifying: "Qualifying", link_sent: "Link sent", booked: "Booked", not_fit: "Not a fit", needs_you: "Needs you" };

export const initials = (s) => (String(s || "?").replace(/^@/, "").split(/[\s._]+/).map((x) => x[0]).join("").slice(0, 2) || "?").toUpperCase();

// The chat widget used for the test phone (setter page + onboarding).
export const TEST_CHAT_JS = `
(function(){
  const box=document.getElementById("t-msgs"), form=document.getElementById("t-form"), input=document.getElementById("t-input"), btn=form.querySelector("button");
  let history=[], busy=false;
  const seed=[{role:"lead",text:"hi! how much is your coaching?"}];
  function bubble(role,text){const d=document.createElement("div");d.className="bub "+(role==="lead"?"lead":"bot");if(role!=="lead"&&/calendly|cal\\.com|http|\\.com\\//i.test(text))d.classList.add("link");d.textContent=text;box.appendChild(d);box.scrollTop=box.scrollHeight;}
  async function ask(){
    busy=true;btn.disabled=true;
    const t=document.createElement("div");t.className="typing";t.textContent="typing…";box.appendChild(t);box.scrollTop=box.scrollHeight;
    let reply="";
    try{const r=await fetch("/api/test-chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({history})});const d=await r.json();reply=d.reply||d.error||"";}catch(e){reply="Connection hiccup. Try again.";}
    t.remove();if(reply){bubble("bot",reply);history.push({role:"bot",text:reply});}
    busy=false;btn.disabled=false;
  }
  window.spotterResetChat=function(){history=seed.map(m=>({...m}));box.innerHTML="";history.forEach(m=>bubble(m.role,m.text));ask();};
  form.addEventListener("submit",e=>{e.preventDefault();const v=input.value.trim();if(!v||busy)return;input.value="";history.push({role:"lead",text:v});bubble("lead",v);ask();});
  document.getElementById("t-reset").addEventListener("click",()=>window.spotterResetChat());
  window.spotterResetChat();
})();`;

export function testPhone(name) {
  return `<div class="phone"><div class="screen">
    <div class="chat-head"><div class="av hot">${esc(initials(name || "S"))}</div><div><b>${esc(name || "Your name")}</b><span>Test chat · not sent to Instagram</span></div></div>
    <div class="msgs" id="t-msgs" aria-live="polite"></div>
    <form class="composer" id="t-form"><label for="t-input" style="position:absolute;left:-9999px">Your test message</label><input id="t-input" autocomplete="off" placeholder="Reply as the lead…"><button type="submit">Send</button></form>
  </div></div>
  <p class="small" style="margin-top:10px">You play the lead. <button type="button" id="t-reset" style="background:none;border:0;color:var(--mute);text-decoration:underline;padding:0;font-size:14px">Start over</button></p>`;
}
