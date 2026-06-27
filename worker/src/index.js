// Brillyant AI proxy (Cloudflare Worker).
//
// Keeps the OpenAI API key OFF the public website: the browser calls this
// Worker, the Worker holds the key as a secret and forwards to OpenAI.
// Locked down so it can't be abused to burn your OpenAI credits:
//   1) only requests from your app's origins are allowed (CORS), and
//   2) the caller must present a valid Firebase ID token (a signed-in user).
import { createRemoteJWKSet, jwtVerify } from "jose";

const PROJECT_ID = "stuff-18453";

const ALLOWED_ORIGINS = [
  "https://stuff-18453.web.app",
  "https://stuff-18453.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:5174",
];

// Google's public keys for verifying Firebase ID tokens.
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, cors);
    }
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "Forbidden origin" }, 403, cors);
    }

    // 1) Require a valid signed-in Firebase user.
    const authz = request.headers.get("Authorization") || "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!token) return json({ error: "Sign-in required" }, 401, cors);
    try {
      await jwtVerify(token, JWKS, {
        issuer: `https://securetoken.google.com/${PROJECT_ID}`,
        audience: PROJECT_ID,
      });
    } catch {
      return json({ error: "Invalid sign-in token" }, 401, cors);
    }

    // 2) Read the chat payload from the client.
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, cors);
    }
    const messages = Array.isArray(body.messages) ? body.messages : null;
    if (!messages || messages.length === 0) {
      return json({ error: "Missing messages" }, 400, cors);
    }

    // 3) Forward to OpenAI with the secret key.
    let upstream;
    try {
      upstream = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(env.OPENAI_API_KEY || "").trim()}`,
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-4o-mini",
          messages,
          temperature: 0.4,
          // High enough for a batch of generated review problems with full
          // worked solutions; short tutor replies stay short regardless.
          max_tokens: 2000,
        }),
      });
    } catch {
      return json({ error: "Could not reach the AI service" }, 502, cors);
    }

    if (!upstream.ok) {
      const raw = await upstream.text();
      const detail = raw.slice(0, 600);
      console.log(
        "OpenAI upstream error",
        upstream.status,
        upstream.statusText,
        "bodyLen=" + raw.length,
        "keyLen=" + (env.OPENAI_API_KEY || "").trim().length,
        "model=" + (env.OPENAI_MODEL || "gpt-4o-mini"),
        JSON.stringify(detail),
      );
      return json(
        { error: "AI service error", status: upstream.status, detail },
        502,
        cors,
      );
    }

    const data = await upstream.json();
    const text = data.choices?.[0]?.message?.content || "";

    // Log token usage and an estimated dollar cost so spend is visible in
    // `wrangler tail`. OpenAI returns a `usage` object on every completion.
    const model = env.OPENAI_MODEL || "gpt-4o-mini";
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const cost = estimateCostUsd(model, promptTokens, completionTokens);
    console.log(
      "OpenAI ok",
      "model=" + model,
      "prompt=" + promptTokens,
      "completion=" + completionTokens,
      "total=" + (usage.total_tokens || promptTokens + completionTokens),
      "cost=$" + cost.toFixed(6),
    );

    return json({ text }, 200, cors);
  },
};

// USD per 1M tokens (input, output). Extend as you change models.
const PRICING = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4.1-mini": { in: 0.4, out: 1.6 },
};

function estimateCostUsd(model, promptTokens, completionTokens) {
  const price = PRICING[model] || PRICING["gpt-4o-mini"];
  return (promptTokens * price.in + completionTokens * price.out) / 1_000_000;
}
