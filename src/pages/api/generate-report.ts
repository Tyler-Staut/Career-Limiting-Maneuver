import type { APIRoute } from "astro";

function generateFallbackReport(): string {
  const reports = [
    "Incident Report: Employee was observed deploying to production on a Friday at 4:58pm. The deployment contained 47 untested commits and a comment reading 'this should be fine.' Subsequent investigation revealed it was, in fact, not fine. HR has been notified. IT is still crying.",
    "Incident Report: Subject accidentally replied-all to the company-wide email chain with their lunch order instead of the requested budget spreadsheet. The subject line read 'URGENT: PIZZA IS LIFE.' Management has requested a meeting. The meeting could have been an email.",
    "Incident Report: Developer named production database table 'stuff_i_dont_care_about' and left it there for 6 months. When asked about it, responded 'works on my machine.' Currently being investigated for crimes against engineering. Recommended sentence: mandatory code review training.",
  ];
  return reports[Math.floor(Math.random() * reports.length)];
}

function generateWalletData() {
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
  return {
    reason: reasons[Math.floor(Math.random() * reasons.length)],
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    id: generateId(),
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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
  return data.choices?.[0]?.message?.content || generateFallbackReport();
}

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json();
  const { turnstileToken } = body;

  if (!turnstileToken) {
    return new Response(JSON.stringify({ error: "Turnstile token required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const turnstileSecret = import.meta.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";

  const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: turnstileSecret,
      response: turnstileToken,
    }).toString(),
  });

  const verifyData = await verifyRes.json();

  if (!verifyData.success) {
    return new Response(JSON.stringify({ error: "Turnstile verification failed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompts = [
    "Write a funny, sarcastic incident report about someone committing a 'Career Limiting Maneuver' at work. Make it exactly 2-3 sentences. Include a fake but funny reason like 'accidentally replied-all to the entire company with lunch order drama' or 'pushed to production on Friday at 4:59pm'. Keep it light and absurd.",
    "Generate a humorous corporate incident report for a 'Career Limiting Maneuver'. 2-3 sentences max. The reason should be something hilariously irresponsible like 'named a variable after their ex' or 'used git push --force on the main branch during a company demo'. Make it sound official but ridiculous.",
    "Write a funny HR incident report about an employee's Career Limiting Maneuver. Keep it to 2-3 sentences. The offense should be absurd like 'scheduled a mandatory meeting at 4:45pm on Friday' or 'put works on my machine in their email signature'. Sound professional but completely unhinged.",
  ];

  const prompt = prompts[Math.floor(Math.random() * prompts.length)];

  try {
    let report: string;

    try {
      report = await generateReportViaGateway(prompt);
    } catch {
      const ai = (locals as any).ai;
      if (ai) {
        const response = await ai.run("@cf/meta/llama-3.2-1b-instruct", {
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150,
        });
        report = response.response || generateFallbackReport();
      } else {
        report = generateFallbackReport();
      }
    }

    const wallet = generateWalletData();

    const reportData = {
      report,
      wallet,
      timestamp: Date.now(),
    };

    // Store to KV
    try {
      const kv = (locals as any).REPORTS_KV;
      if (kv) {
        const id = new Date().getTime().toString();
        await kv.put(`report:${id}`, JSON.stringify(reportData), {
          expirationTtl: 60 * 60 * 24 * 30, // 30 days
        });
      }
    } catch {
      // Silently fail - KV storage is optional
    }

    return new Response(JSON.stringify({ report, wallet }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({
      report: generateFallbackReport(),
      wallet: generateWalletData(),
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
