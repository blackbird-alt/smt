import { auth } from "../firebase";
import { getChapterReference } from "./apStatsReference";

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
  "pitched at the AP Statistics level (algebra-based, no calculus). A student is working",
  "on a specific problem (given to you as grounding) and may ask about it OR about related",
  "statistics ideas. Teach with plain language and a Socratic style.",
  "",
  "WHAT YOU CAN DO:",
  "- Answer the student's question even if it's TANGENTIAL, as long as it's about probability",
  "  or statistics (concepts, formulas, intuition, definitions, related techniques, when to",
  "  use what). Be generous with genuine statistical curiosity — don't force them back to the",
  "  current problem.",
  "- You MAY create NEW practice/sample problems that are DIFFERENT from the current one, and",
  "  you SHOULD give their FULL worked solution and final answer. Choose examples solved with a",
  "  similar method or technique to the current problem, so the student learns the approach by",
  "  analogy. (These are your own examples, so showing the complete solution is encouraged.)",
  "- Use a short worked example when it helps understanding.",
  "",
  "HARD RULES:",
  "- For the student's CURRENT problem (the one in the grounding): NEVER reveal its final",
  "  numeric answer and never say which option is correct. Guide with a hint and ONE next step.",
  "  This rule applies ONLY to the current problem, NOT to sample problems you invent.",
  "- Keep replies focused and reasonably concise: a few sentences, or a compact worked example.",
  "- If the question is clearly NOT about statistics/probability/math, gently redirect to the",
  "  course material.",
  "- Don't invent facts or formulas; if unsure, suggest reviewing the concept.",
  "- Write ALL math in plain Unicode text (e.g., n - 1, x̄, p̂, σ², √(n), ≤, ÷, π, 1/2).",
  "  Do NOT use LaTeX or markdown math: no \\( \\), \\[ \\], $...$, and no commands like",
  "  \\frac, \\sqrt, \\times, \\cdot. The chat shows plain text, so LaTeX renders as gibberish.",
].join("\n");

function strip(text) {
  return (text || "").replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

// The chat and review renderers show plain text (no math engine), so any LaTeX
// the model emits would appear as raw "\( n - 1 \)" gibberish. Convert the common
// constructs to readable Unicode and strip the delimiters/commands.
const LATEX_SYMBOLS = {
  "\\times": "×",
  "\\cdot": "·",
  "\\div": "÷",
  "\\pm": "±",
  "\\mp": "∓",
  "\\leq": "≤",
  "\\le": "≤",
  "\\geq": "≥",
  "\\ge": "≥",
  "\\neq": "≠",
  "\\ne": "≠",
  "\\approx": "≈",
  "\\equiv": "≡",
  "\\infty": "∞",
  "\\sum": "Σ",
  "\\alpha": "α",
  "\\beta": "β",
  "\\mu": "μ",
  "\\sigma": "σ",
  "\\Sigma": "Σ",
  "\\pi": "π",
  "\\rho": "ρ",
  "\\theta": "θ",
  "\\lambda": "λ",
  "\\chi": "χ",
  "\\left": "",
  "\\right": "",
  "\\displaystyle": "",
  "\\quad": " ",
  "\\qquad": " ",
  "\\,": " ",
  "\\;": " ",
  "\\!": "",
  "\\%": "%",
  "\\$": "$",
};

function cleanMath(text) {
  if (!text) return "";
  let t = String(text);

  // Drop math-mode delimiters but keep the inner content.
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, "$1");
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, "$1");
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  t = t.replace(/\$([^$\n]+?)\$/g, "$1");

  // Structural commands.
  t = t.replace(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
  t = t.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
  t = t.replace(/\\sqrt\s*/g, "√");
  t = t.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, "$1");
  t = t.replace(/\\bar\s*\{([^{}]*)\}/g, (_, c) => `${c}\u0304`);
  t = t.replace(/\\hat\s*\{([^{}]*)\}/g, (_, c) => `${c}\u0302`);
  t = t.replace(/\\vec\s*\{([^{}]*)\}/g, "$1");

  // Superscripts: ^{...} -> ^(...) for multi-char, single digits to Unicode.
  t = t.replace(/\^\{([^{}]+)\}/g, (_, e) => (e.length === 1 ? `^${e}` : `^(${e})`));
  t = t.replace(/\^2\b/g, "²").replace(/\^3\b/g, "³");
  // Subscripts: x_{1} -> x_1
  t = t.replace(/_\{([^{}]*)\}/g, "_$1");

  for (const [command, replacement] of Object.entries(LATEX_SYMBOLS)) {
    t = t.split(command).join(replacement);
  }

  // Remove markdown emphasis markers (chat renders raw text).
  t = t.replace(/\*\*/g, "");

  // Strip any leftover backslash before a letter or paren (orphan commands).
  t = t.replace(/\\(?=[a-zA-Z(])/g, "");

  return t.trim();
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

// Single entry point to the proxy: attaches the signed-in user's Firebase token,
// sends the OpenAI-style messages, and surfaces the real error text on failure.
async function chat(messages) {
  if (!PROXY_URL) throw new Error("AI is not configured.");

  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to use AI.");
  const idToken = await user.getIdToken();

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errData = await response.json();
      detail = errData.detail || errData.error || "";
    } catch {
      /* ignore */
    }
    throw new Error(
      detail ? `${detail}`.slice(0, 300) : `AI request failed (${response.status}).`,
    );
  }
  const data = await response.json();
  return data.text || "";
}

// history: [{ role: "user" | "model", text }]
export async function requestHelp({
  step,
  attempt,
  history = [],
  question,
  lessonId,
}) {
  if (!PROXY_URL) throw new Error("AI help is not configured.");

  const reference = getChapterReference(lessonId);
  const messages = [
    { role: "system", content: TUTOR_SYSTEM },
    ...(reference
      ? [
          {
            role: "system",
            content:
              "Accurate reference notes for THIS chapter (AP-Statistics level). Use them to keep " +
              "your explanations correct and to model your own sample problems. You may share " +
              "concepts, formulas, and your own worked examples from this material — but still " +
              "never reveal the current problem's final answer.\n\n" +
              reference,
          },
        ]
      : []),
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

  return cleanMath(await chat(messages));
}

// ---------------------------------------------------------------------------
// AI-generated daily review: fresh problems modeled on ones the learner missed.
// ---------------------------------------------------------------------------

const REVIEW_SYSTEM = [
  "You generate fresh practice problems for a Probability & Statistics daily review,",
  "at the AP Statistics level (algebra-based, no calculus). You are given problems a",
  "student previously got WRONG. Produce NEW problems that test the SAME underlying",
  "concept and use a SIMILAR solution method, but with DIFFERENT numbers, context, and",
  "wording. NEVER reproduce an original problem or just tweak one number — change the",
  "scenario meaningfully while keeping the skill identical.",
  "",
  "Return ONLY a JSON array (no prose, no markdown fences). Each element is one problem:",
  "{",
  '  "type": "tap-choice" | "number-input",',
  '  "lessonTitle": string,            // copy from the source problem it is based on',
  '  "context": string (optional),     // setup/data; may use \\n and **bold**',
  '  "prompt": string,                 // the question being asked',
  '  "hints": [string, ...],           // 1-3 progressive hints that do NOT reveal the answer',
  '  "feedback": { "wrong": string },  // short nudge on a wrong attempt; no answer',
  '  "solution": { "body": string, "takeaway": string }, // full worked solution WITH final answer',
  '  // tap-choice ONLY:',
  '  "options": [ { "id": string, "label": string, "correct": boolean }, ... ], // 3-4 options, EXACTLY ONE correct',
  '  // number-input ONLY:',
  '  "correct": number,                // the exact correct numeric answer',
  '  "decimalPlaces": number (optional), // if the answer is a rounded decimal',
  '  "unit": string (optional),        // prefix shown before the box, e.g. "$"',
  '  "unitSuffix": string (optional)   // suffix shown after the box, e.g. "%"',
  "}",
  "",
  "RULES:",
  "- Compute every numeric answer carefully and make sure it is correct and solvable from",
  "  the information you provide. For tap-choice, exactly one option may be correct and the",
  "  distractors must be plausible (common mistakes).",
  "- Keep each problem self-contained: include any data/values needed to solve it.",
  "- Prefer tap-choice or number-input only (these are the only renderable types).",
  "- Write all math in plain Unicode (n - 1, x̄, σ², √(n), ≤, π, 1/2). NO LaTeX or math",
  "  delimiters (\\( \\), $...$, \\frac, \\sqrt): the app shows plain text.",
  "- Keep wording concise and clear. Output the JSON array and nothing else.",
].join("\n");

function describeReviewSource(source, index) {
  const lines = [`Source problem ${index + 1} (chapter: ${source.lessonTitle || "?"}):`];
  if (source.title) lines.push(`Title: ${strip(source.title)}`);
  if (source.context) lines.push(`Context: ${strip(source.context)}`);
  if (source.prompt) lines.push(`Question: ${strip(source.prompt)}`);
  if (Array.isArray(source.options)) {
    lines.push(`Options: ${source.options.map((o) => strip(o.label)).join(" | ")}`);
  }
  if (source.correct !== undefined) lines.push(`Correct value: ${source.correct}`);
  if (source.solution?.takeaway) lines.push(`Key idea: ${strip(source.solution.takeaway)}`);
  return lines.join("\n");
}

function normalizeProblem(raw, index) {
  if (!raw || typeof raw !== "object") return null;
  const type =
    raw.type === "number-input"
      ? "number-input"
      : raw.type === "tap-choice"
        ? "tap-choice"
        : null;
  if (!type) return null;
  if (typeof raw.prompt !== "string" || !raw.prompt.trim()) return null;

  const body = typeof raw.solution?.body === "string" ? raw.solution.body.trim() : "";
  if (!body) return null;

  const problem = {
    id: `gen-${index}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    lessonTitle: typeof raw.lessonTitle === "string" ? raw.lessonTitle : "Review",
    prompt: cleanMath(raw.prompt),
    hints: Array.isArray(raw.hints)
      ? raw.hints.filter((h) => typeof h === "string").map(cleanMath).slice(0, 3)
      : [],
    feedback: {
      wrong:
        typeof raw.feedback?.wrong === "string"
          ? cleanMath(raw.feedback.wrong)
          : "Not quite, re-check your steps and try again.",
    },
    solution: {
      body: cleanMath(body),
      takeaway:
        typeof raw.solution?.takeaway === "string"
          ? cleanMath(raw.solution.takeaway)
          : undefined,
    },
  };
  if (typeof raw.context === "string" && raw.context.trim()) {
    problem.context = cleanMath(raw.context);
  }

  if (type === "tap-choice") {
    if (!Array.isArray(raw.options)) return null;
    const options = raw.options
      .filter((o) => o && typeof o.label === "string")
      .map((o, j) => ({
        id: typeof o.id === "string" && o.id ? o.id : `o${j}`,
        label: cleanMath(o.label),
        correct: Boolean(o.correct),
      }));
    if (options.length < 2) return null;
    if (options.filter((o) => o.correct).length !== 1) return null;
    return { ...problem, options };
  }

  const correct = Number(raw.correct);
  if (!Number.isFinite(correct)) return null;
  const numberProblem = { ...problem, correct };
  if (Number.isInteger(raw.decimalPlaces)) numberProblem.decimalPlaces = raw.decimalPlaces;
  if (typeof raw.unit === "string") numberProblem.unit = raw.unit;
  if (typeof raw.unitSuffix === "string") numberProblem.unitSuffix = raw.unitSuffix;
  return numberProblem;
}

function parseProblems(text, max) {
  let trimmed = (text || "").trim();
  trimmed = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];

  let parsed;
  try {
    parsed = JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out = [];
  parsed.forEach((item, index) => {
    const normalized = normalizeProblem(item, index);
    if (normalized) out.push(normalized);
  });
  return out.slice(0, max);
}

// Generate `count` fresh review problems from the learner's missed problems.
// Returns [] (so callers can fall back) if AI is off, unavailable, or unparsable.
export async function generateReviewProblems(sources, { count = 5 } = {}) {
  if (!isAiHelpEnabled()) return [];
  if (!Array.isArray(sources) || sources.length === 0) return [];

  const seen = new Set();
  const refs = [];
  for (const source of sources) {
    if (!source.lessonId || seen.has(source.lessonId)) continue;
    seen.add(source.lessonId);
    const reference = getChapterReference(source.lessonId, 1200);
    if (reference) refs.push(`# ${source.lessonTitle}\n${reference}`);
    if (refs.length >= 3) break;
  }

  const sourceText = sources
    .slice(0, 10)
    .map((source, index) => describeReviewSource(source, index))
    .join("\n\n");

  const messages = [
    { role: "system", content: REVIEW_SYSTEM },
    ...(refs.length
      ? [
          {
            role: "system",
            content:
              "Reference notes to keep the math correct (use them; do not copy verbatim):\n\n" +
              refs.join("\n\n"),
          },
        ]
      : []),
    {
      role: "user",
      content:
        `Here are problems the student got wrong recently. Generate ${count} NEW review ` +
        `problems that practice the SAME skills with different numbers and scenarios. ` +
        `Output ONLY the JSON array.\n\n${sourceText}`,
    },
  ];

  const text = await chat(messages);
  return parseProblems(text, count);
}
