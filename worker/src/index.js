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
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-4o-mini",
          messages,
          temperature: 0.4,
          max_tokens: 400,
        }),
      });
    } catch {
      return json({ error: "Could not reach the AI service" }, 502, cors);
    }

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 500);
      return json({ error: "AI service error", detail }, 502, cors);
    }

    const data = await upstream.json();
    const text = data.choices?.[0]?.message?.content || "";
    return json({ text }, 200, cors);
  },
};
