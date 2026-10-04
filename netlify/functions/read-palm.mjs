// 掌中書：手相解讀後端
// 接收前端傳來的手掌照片，轉交 Claude API 解讀，再把結果回傳。
// API 金鑰只存在伺服器的環境變數，不會出現在前端。

const HANDS = ["左手", "右手"];
const FOCUSES = ["整體", "感情與人際", "工作與事業", "個性與思考方式"];
const MAX_BASE64 = 5_500_000; // 約 4 MB 圖片

// 允許呼叫此後端的網頁來源（網頁放在 GitHub Pages 時需要）
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://johnnyweb-art.github.io";
const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS },
  });

function buildPrompt(hand, focus) {
  return [
    "你是熟悉華人傳統手相學的解說者。附上的圖片是使用者拍攝的手掌照片，使用者表示這是" + hand + "。",
    "使用者想多了解的面向：" + focus + "。",
    "",
    "規則：",
    "1. 先判斷圖片是否為可辨識掌紋的手掌照片。若不是，或太暗、太模糊、手掌未完整入鏡，valid 填 false，並在 reason 用一句話說明該怎麼重拍。",
    "2. observation 只寫照片上實際看得到的特徵（長短、深淺、弧度、起點終點、分岔、斷續）。看不清楚的線，observation 寫「照片中不清楚」，reading 留空字串。不可臆測看不到的細節。",
    "3. reading 一律以「傳統手相認為」開頭，說明這種特徵在傳統手相中的性格或傾向解讀，每項 2 至 3 句。",
    "4. 不可預測壽命、疾病、死亡、意外、災禍或任何具體日期與事件；不可提供醫療、投資或法律建議。",
    "5. summary 用 3 至 4 句整合各線特徵，並回應使用者想了解的面向，語氣平實、不誇大。",
    "6. 使用繁體中文與臺灣用語。",
    "",
    "只回覆一個 JSON 物件，不要其他文字，也不要 Markdown 標記，格式如下：",
    '{"valid":true,"reason":"","handShape":{"type":"手型名稱","observation":"","reading":""},"lines":[{"name":"生命線","observation":"","reading":""},{"name":"智慧線","observation":"","reading":""},{"name":"感情線","observation":"","reading":""},{"name":"命運線","observation":"","reading":""}],"summary":""}',
  ].join("\n");
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: "not_configured" }, 500);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_image" }, 400);
  }

  const image = typeof body?.image === "string" ? body.image : "";
  if (!image || !/^[A-Za-z0-9+/=]+$/.test(image)) return json({ error: "bad_image" }, 400);
  if (image.length > MAX_BASE64) return json({ error: "too_large" }, 413);

  // 只接受白名單內的選項，不把使用者輸入的文字直接放進提示詞
  const hand = HANDS.includes(body.hand) ? body.hand : "左手";
  const focus = FOCUSES.includes(body.focus) ? body.focus : "整體";

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
              { type: "text", text: buildPrompt(hand, focus) },
            ],
          },
        ],
      }),
    });
  } catch {
    return json({ error: "upstream" }, 502);
  }

  if (upstream.status === 429 || upstream.status === 529) return json({ error: "busy" }, 503);
  if (!upstream.ok) {
    console.error("Claude API error", upstream.status, await upstream.text().catch(() => ""));
    return json({ error: "upstream" }, 502);
  }

  const data = await upstream.json().catch(() => null);
  const text = (data?.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const parsed = JSON.parse(text.slice(start, end + 1));
    return json(parsed);
  } catch {
    return json({ error: "bad_output" }, 502);
  }
};

export const config = { path: "/api/read-palm" };
