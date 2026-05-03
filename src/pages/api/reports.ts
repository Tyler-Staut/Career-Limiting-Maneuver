import type { APIRoute } from "astro";

function getRuntimeEnv(locals: unknown) {
  return (locals as any).runtime?.env ?? locals;
}

export const GET: APIRoute = async ({ locals }) => {
  const kv = (getRuntimeEnv(locals) as any).REPORTS_KV;
  
  if (!kv) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const list = await kv.list({ prefix: "report:", limit: 20 });
    const reports = [];
    
    for (const key of list.keys) {
      const report = await kv.get(key.name, "json");
      if (report) {
        reports.push(report);
      }
    }
    
    reports.sort((a: any, b: any) => b.timestamp - a.timestamp);
    
    return new Response(JSON.stringify(reports), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const kv = (getRuntimeEnv(locals) as any).REPORTS_KV;
  
  if (!kv) {
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const report = await request.json();
    const id = new Date().getTime().toString();
    const key = `report:${id}`;
    
    await kv.put(key, JSON.stringify({
      ...report,
      timestamp: Date.now(),
      id,
    }), {
      expirationTtl: 60 * 60 * 24 * 30, // 30 days
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
