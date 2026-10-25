import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST() {
  console.log("[NVIDIA TEST] started");
  const start = Date.now();

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "Missing API Key" }, { status: 500 });
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000); // 30 seconds

  try {
    const completion = await client.chat.completions.create(
      {
        model: process.env.NVIDIA_MODEL || "openai/gpt-oss-20b",
        messages: [
          {
            role: "user",
            content: "Reply with exactly: OK",
          },
        ],
        temperature: 0,
        max_tokens: 10,
        reasoning_effort: "low",
        stream: false,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const duration = Date.now() - start;
    console.log(`[NVIDIA TEST] response received`);
    console.log(`[NVIDIA TEST] duration: ${duration} ms`);

    const content = completion.choices?.[0]?.message?.content;

    return NextResponse.json({
      success: true,
      durationMs: duration,
      content: content,
    });
  } catch (error: unknown) {
    clearTimeout(timeout);
    const err = error as { name?: string; message?: string };
    
    if (err.name === "AbortError" || err.message?.includes("abort")) {
      console.error("[NVIDIA TEST] duration:", Date.now() - start, "ms (TIMEOUT)");
      return NextResponse.json({
        success: false,
        error: "timeout",
      });
    }

    const duration = Date.now() - start;
    console.error("[NVIDIA TEST] error received after", duration, "ms:", err.message);
    
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
