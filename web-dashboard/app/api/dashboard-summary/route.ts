import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { dataMode, selectedDateTime, bins } = body;

    const prompt = `
You are generating concise dashboard insights for BinTwin, a smart waste management system.

Data mode: ${dataMode}
Selected snapshot time: ${selectedDateTime}

Bins data:
${JSON.stringify(bins, null, 2)}

Return ONLY valid JSON in this format:
{
  "citywideInsights": ["...", "...", "..."],
  "dailySummary": "...",
  "alerts": ["...", "..."]
}

Rules:
- Keep each insight short.
- Mention real data or synthetic data depending on mode.
- Focus on fill levels, forecast risk, urgent bins, and operational meaning.
- Do not invent exact values not present in the data.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        input: prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    const outputText =
      data.output_text ??
      data.output?.[0]?.content?.[0]?.text ??
      "";

    const parsed = JSON.parse(outputText);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Dashboard summary error:", error);

    return NextResponse.json(
      {
        citywideInsights: ["Unable to generate insights right now."],
        dailySummary: "AI summary is temporarily unavailable.",
        alerts: ["Check dashboard metrics manually."],
      },
      { status: 200 }
    );
  }
}