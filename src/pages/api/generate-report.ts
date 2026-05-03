import type { APIRoute } from "astro";

type IncidentReport = {
  id: string;
  reason: string;
  report: string;
  timestamp: number;
  date: string;
};

function generateReason(): string {
  const reasons = [
    "Deployed to production on Friday at 4:59pm",
    "Replied-all to company with lunch order drama",
    "Named production database 'stuff_i_dont_care_about'",
    "Used git push --force during company demo",
    "Scheduled mandatory meeting at 4:45pm Friday",
    "Put 'works on my machine' in email signature",
    "Named variable after their ex in production code",
    "Accidentally shared meme in all-hands Slack channel",
    "Wrote 'TODO: fix this later' and never did",
    "Committed node_modules to the repo",
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function generateFallbackReport(reason: string): string {
  return `Incident Report: ${reason}. The maneuver was detected, documented, and quietly forwarded to everyone who asked why the roadmap just changed. Recommended action: take a short walk, then stop touching production for the rest of the day.`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function normalizeReport(report: string, reason: string): string {
  return (report || generateFallbackReport(reason))
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateReportViaGateway(prompt: string): Promise<string> {
  const gatewayUrl = import.meta.env.AI_GATEWAY_URL;
  const gatewayToken = import.meta.env.AI_GATEWAY_TOKEN;

  if (!gatewayUrl || !gatewayToken) {
    throw new Error("AI Gateway not configured");
  }

  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "cf-aig-authorization": `Bearer ${gatewayToken}`,
    },
    body: JSON.stringify({
      model: "workers-ai/@cf/meta/llama-3.2-1b-instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gateway request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function getRuntimeEnv(locals: unknown) {
  return (locals as any).runtime?.env ?? locals;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json();
  const { turnstileToken } = body;
  const url = new URL(request.url);
  const isLocalRequest = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  const turnstileSecret = import.meta.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";
  const allowTurnstileFallback = import.meta.env.DEV || isLocalRequest || turnstileSecret === "1x0000000000000000000000000000000AA";

  if (!turnstileToken && !allowTurnstileFallback) {
    return new Response(JSON.stringify({ error: "Turnstile token required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (turnstileToken) {
    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: turnstileToken,
      }).toString(),
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.success && !allowTurnstileFallback) {
      return new Response(JSON.stringify({ error: "Turnstile verification failed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const reason = generateReason();
  const prompt = `Write a plain-text, funny corporate incident report for this Career Limiting Maneuver: "${reason}". Use 2-3 concise sentences. Do not use Markdown, headings, labels, employee names, dates, bullets, or fields.`;

  try {
    let report: string;
    const env = getRuntimeEnv(locals);

    try {
      report = normalizeReport(await generateReportViaGateway(prompt), reason);
    } catch {
      const ai = (env as any).AI ?? (env as any).ai;
      if (ai) {
        const response = await ai.run("@cf/meta/llama-3.2-1b-instruct", {
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150,
        });
        report = normalizeReport(response.response, reason);
      } else {
        report = generateFallbackReport(reason);
      }
    }

    const reportData: IncidentReport = {
      id: generateId(),
      reason,
      report,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    };

    try {
      const kv = (env as any).REPORTS_KV;
      if (kv) {
        await kv.put(`report:${reportData.timestamp}:${reportData.id}`, JSON.stringify(reportData), {
          expirationTtl: 60 * 60 * 24 * 30,
        });
      }
    } catch {
      // KV storage is optional in local development.
    }

    return new Response(JSON.stringify(reportData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    const reason = generateReason();
    const reportData: IncidentReport = {
      id: generateId(),
      reason,
      report: generateFallbackReport(reason),
      timestamp: Date.now(),
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    };

    return new Response(JSON.stringify(reportData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
