import { NextResponse } from "next/server";

export async function POST() {
  console.log("[NVIDIA RAW] started");
  const start = Date.now();

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "Missing API Key" }, { status: 500 });
  }

  const baseUrl = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
  const model = process.env.NVIDIA_MODEL || "openai/gpt-oss-20b";

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: "Reply with exactly: OK",
          },
        ],
        temperature: 0,
        max_tokens: 10,
        stream: false,
        reasoning_effort: "low",
      }),
    });

    const duration = Date.now() - start;
    const status = response.status;
    
    // Some APIs return requestId in headers, others in body
    const headerRequestId = response.headers.get("x-request-id") || response.headers.get("nv-request-id");
    
    let responseBody: Record<string, unknown> = {};
    try {
      responseBody = await response.json();
    } catch {
      const text = await response.text();
      responseBody = { raw_text: text };
    }

    const requestId = responseBody.id || responseBody.requestId || headerRequestId || "unknown";

    console.log(`[NVIDIA RAW] status: ${status}`);
    console.log(`[NVIDIA RAW] duration: ${duration} ms`);
    console.log(`[NVIDIA RAW] requestId: ${requestId}`);

    if (status === 200) {
      return NextResponse.json({
        status: 200,
        success: true,
        response: responseBody
      });
    } else if (status === 202) {
      return NextResponse.json({
        status: 202,
        success: false,
        pending: true,
        requestId: requestId
      });
    } else {
      return NextResponse.json(
        {
          status: status,
          success: false,
          error: responseBody
        },
        { status: status >= 400 && status < 600 ? status : 500 }
      );
    }
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[NVIDIA RAW] network error after ${duration} ms:`, errorMsg);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
