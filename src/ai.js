// Talking to Claude. One function decides the next DM, the lead's stage and a short brief for the coach.

export const DEFAULT_PROFILE = {
  name: "",
  program: "",
  price: "",
  fit: "",
  link: "",
  tone: "Warm and encouraging",
  language: "the language the lead writes in",
  extra: "",
};

export const TONES = ["Warm and encouraging", "Direct and no-nonsense", "Hype and high energy", "Calm and professional"];

export const profileComplete = (p) => !!(p && p.name && p.program && p.price && p.fit && p.link);

const STAGES = ["qualifying", "link_sent", "booked", "not_fit", "needs_you"];

function systemPrompt(p, extraRules = "") {
  const first = String(p.name || "the coach").replace(/^coach\s+/i, "");
  return `You are the Instagram DM setter for an online fitness coach. You write AS the coach's team, casually, in first person plural or singular as fits the tone.

COACH: ${p.name}
PROGRAM: ${p.program}
PRICE: ${p.price}
IDEAL CLIENT: ${p.fit}
BOOKING LINK: ${p.link}
TONE: ${p.tone}
${p.extra ? `EXTRA INFO FROM THE COACH: ${p.extra}\n` : ""}
YOUR JOB: turn a DM into a booked call, with the right people only.
Find out, one question at a time and roughly in this order: 1) their goal, 2) why now / timeline, 3) what they tried and what got in the way, 4) whether they're ready to invest in 1:1 coaching if it's the right fit.
When those are clear and they fit the ideal client, invite them to a free strategy call with ${first} and include the booking link exactly as given.
If they clearly don't fit or only want free help, be kind, give one genuinely useful tip, and don't send the link.

RULES
- Instagram DM style: 1 to 2 short sentences, casual, at most one emoji, never lists or markdown.
- Ask only ONE question per message.
- Never invent results, testimonials, discounts, guarantees or facts that are not given above.
- Only mention the price if they ask. Then give it and steer back to the call.
- If they ask whether you're a bot or AI, be honest: you're ${first}'s assistant and ${first} does every call personally.
- Medical issues (injuries, pregnancy, eating disorders, medication), complaints, refunds or anything you can't answer from the info above: tell them ${first} will reply personally, and set stage to needs_you.
- Reply in ${p.language || "the language the lead writes in"}.
${extraRules}`;
}

const TOOL = {
  name: "send_dm",
  description: "Send your next Instagram DM to the lead and record where the lead stands.",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string", description: "The DM text to send. Empty only if no reply is needed." },
      stage: { type: "string", enum: STAGES, description: "qualifying = still asking questions; link_sent = this message contains the booking link; booked = lead says they booked; not_fit = not a fit; needs_you = the coach must reply personally." },
      brief: { type: "string", description: "One or two sentences for the coach: goal, timeline, obstacles, readiness. Facts the lead said only." },
    },
    required: ["reply", "stage", "brief"],
  },
};

export async function callClaude(env, { system, messages, model, tool = TOOL, maxTokens = 400 }) {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("no_ai_key");
  const r = await fetch((env.ANTHROPIC_URL || "https://api.anthropic.com") + "/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: model || env.AI_MODEL || "claude-sonnet-5-5",
      max_tokens: maxTokens,
      system,
      messages,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
    }),
  });
  if (!r.ok) throw new Error(`ai_${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json();
  const use = (data.content || []).find((b) => b.type === "tool_use");
  if (!use) throw new Error("ai_no_tool");
  return use.input;
}

// history: [{role:'lead'|'bot'|'coach', text}] oldest first. Returns {reply, stage, brief}.
export async function nextDm(env, profile, history, { fast = false, followUp = false } = {}) {
  const msgs = toClaudeMessages(history, followUp);
  const extra = followUp
    ? "\nThe lead went quiet. Write ONE short, friendly follow-up that picks up where you left off (no guilt-tripping, no 'just checking in'). Keep the same stage unless it changes."
    : "";
  const out = await callClaude(env, {
    system: systemPrompt({ ...profile }, extra),
    messages: msgs,
    model: fast ? env.AI_MODEL_FAST || "claude-haiku-5-5" : env.AI_MODEL,
  });
  let stage = STAGES.includes(out.stage) ? out.stage : "qualifying";
  const reply = String(out.reply || "").trim();
  if (profile.link && reply.includes(String(profile.link).replace(/^https?:\/\//, "")) && stage === "qualifying") stage = "link_sent";
  return { reply, stage, brief: String(out.brief || "").trim().slice(0, 500) };
}

function toClaudeMessages(history, followUp) {
  // Claude needs alternating user/assistant turns that start and end with user.
  const turns = [];
  for (const m of history) {
    const role = m.role === "lead" ? "user" : "assistant";
    const text = m.role === "coach" ? `${m.text}` : m.text;
    if (turns.length && turns[turns.length - 1].role === role) turns[turns.length - 1].content += "\n" + text;
    else turns.push({ role, content: text });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length) turns.push({ role: "user", content: "hi" });
  if (turns[turns.length - 1].role !== "user") {
    turns.push({ role: "user", content: followUp ? "(no reply from the lead for almost a day; write your follow-up)" : "(continue)" });
  }
  return turns;
}

// Scripted fallback so the demo keeps working without an AI key.
export function scriptedDm(profile, history) {
  const n = history.filter((m) => m.role === "bot").length;
  const lines = [
    "love that you reached out! what's the main thing you want to change in the next few months?",
    "that's a great goal. what makes now the right time to go for it?",
    "makes sense. what have you tried before, and what got in the way?",
    "super common, honestly. if we found a plan that fits your life, are you ready to invest in 1:1 coaching?",
    `amazing, sounds like a real fit 🙌 grab a free call here: ${profile.link || "calendly.com/your-coach"}`,
  ];
  return { reply: lines[Math.min(n, lines.length - 1)], stage: n >= 4 ? "link_sent" : "qualifying", brief: "" };
}
