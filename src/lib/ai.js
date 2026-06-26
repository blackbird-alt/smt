import { auth } from "../firebase";

// AI is an *addition* — the app must work fully with it off. The "Ask for help"
// feature is only enabled when a proxy URL is configured (and not disabled).
// The OpenAI key never lives in this client; requests go to a Cloudflare Worker
// that holds the key and verifies the signed-in user (see /worker).
const AI_ENABLED = import.meta.env.VITE_AI_ENABLED !== "false";
const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || "";

export function isAiHelpEnabled() {
  return AI_ENABLED && Boolean(PROXY_URL);
}

const TUTOR_SYSTEM = [
  "You are a warm, patient tutor inside a learn-by-doing Probability & Statistics app,",
  "pitched at the AP Statistics level (algebra-based, no calculus).",
  "A student is stuck on a specific problem and will tell you what confuses them.",
  "Help them understand using plain language and a Socratic style: clarify the idea,",
  "point to the concept that applies, and offer ONE small next step.",
  "",
  "HARD RULES:",
  "- NEVER reveal the final numeric answer, and never say which option is correct.",
  "- Guide the student to work it out themselves; give a hint, not the solution.",
  "- Keep replies short: 2-4 sentences, no walls of text.",
  "- Stay strictly on this problem and its underlying concept. If asked something",
  "  off-topic, gently redirect to the problem.",
  "- Don't invent facts or formulas; if unsure, suggest reviewing the concept.",
].join("\n");

function strip(text) {
  return (text || "").replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function describeAttempt(step, attempt) {
  if (!attempt) return null;
  if (attempt.value !== undefined && attempt.value !== "") {
    return `they entered "${attempt.value}"`;
  }
  if (attempt.selectedId && Array.isArray(step.options)) {
    const chosen = step.options.find((o) => o.id === attempt.selectedId);
    if (chosen) return `they selected "${chosen.label}"`;
  }
  return null;
}

// Build grounding from the lesson's STRUCTURED state (not raw text), including
// the known-correct solution as private reference so the model guides toward
// the right idea but is told never to reveal it.
function buildGrounding(step, attempt) {
  const lines = ["The student is working on this problem:"];
  if (step.title) lines.push(`Title: ${strip(step.title)}`);
  if (step.context) lines.push(`Context: ${strip(step.context)}`);
  lines.push(`Question: ${strip(step.prompt)}`);
  if (Array.isArray(step.options)) {
    lines.push(`Answer options: ${step.options.map((o) => strip(o.label)).join(" | ")}`);
  }

  const ref = [];
  if (step.solution?.body) ref.push(strip(step.solution.body));
  if (step.solution?.takeaway) ref.push(`Key idea: ${strip(step.solution.takeaway)}`);
  if (step.correct !== undefined) ref.push(`Correct value: ${step.correct}`);
  const correctOption = step.options?.find((o) => o.correct);
  if (correctOption) ref.push(`Correct option: ${strip(correctOption.label)}`);
  if (ref.length) {
    lines.push(
      `FOR YOUR REFERENCE ONLY — never state this to the student: ${ref.join(". ")}`,
    );
  }

  const attemptText = describeAttempt(step, attempt);
  if (attemptText) lines.push(`The student's latest attempt: ${attemptText}.`);

  return lines.join("\n");
}

// history: [{ role: "user" | "model", text }]
export async function requestHelp({ step, attempt, history = [], question }) {
  if (!PROXY_URL) throw new Error("AI help is not configured.");

  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to use AI help.");
  const idToken = await user.getIdToken();

  const messages = [
    { role: "system", content: TUTOR_SYSTEM },
    { role: "user", content: buildGrounding(step, attempt) },
    {
      role: "assistant",
      content: "Got it — I'll help you understand this without giving away the answer.",
    },
    ...history.map((message) => ({
      role: message.role === "model" ? "assistant" : "user",
      content: message.text,
    })),
    { role: "user", content: question },
  ];

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error("AI request failed.");
  }
  const data = await response.json();
  return data.text || "";
}
