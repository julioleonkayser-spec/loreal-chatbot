// Cloudflare Worker: keeps your API key off the website.
// The site sends { messages }, the Worker adds the secret key and calls the AI.
//
// Add ONE of these secrets in Cloudflare (Settings > Variables and Secrets):
//   OPENAI_API_KEY      -> uses OpenAI
//   ANTHROPIC_API_KEY   -> uses Anthropic (Claude)
// Either way the Worker answers in OpenAI's format, so script.js never changes.

const CORS = {
  "Access-Control-Allow-Origin": "*", // after deploying, you can swap * for your GitHub Pages URL
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }
    if (request.method !== "POST") {
      return json({ error: "Use POST" }, 405);
    }

    const { messages } = await request.json();
    if (!Array.isArray(messages)) {
      return json({ error: "messages must be an array" }, 400);
    }

    // OpenAI
    if (env.OPENAI_API_KEY) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ model: "gpt-4o", messages, max_tokens: 300 }),
      });
      return json(await res.json(), res.status);
    }

    // Anthropic: system prompt goes in its own field
    if (env.ANTHROPIC_API_KEY) {
      const system = messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n");
      const chat = messages.filter((m) => m.role !== "system");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 300,
          system,
          messages: chat,
        }),
      });
      const data = await res.json();
      if (!res.ok) return json(data, res.status);

      // Reshape to OpenAI's format
      return json({
        choices: [{ message: { role: "assistant", content: data.content[0].text } }],
      });
    }

    return json({ error: "No API key set in the Worker" }, 500);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
