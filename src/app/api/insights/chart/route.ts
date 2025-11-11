import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/insights/chart
 * 
 * Generates AI-powered insights for a specific chart based on the data provided.
 * 
 * Body:
 * {
 *   chartType: "multi-metric" | "mood-distribution" | "participation-correlation" | "mood-trend" | "participation-levels" | "activity-distribution",
 *   chartData: any, // The data used in the chart
 *   notes: any[], // Optional: related notes for context
 *   memberName?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { chartType, chartData, notes, memberName } = await req.json();

    if (!chartType || !chartData) {
      return NextResponse.json(
        { error: "chartType and chartData are required" },
        { status: 400 }
      );
    }

    // Build context based on chart type
    let dataSummary = "";
    let prompt = "";

    switch (chartType) {
      case "multi-metric":
        const moodData = chartData.find((s: any) => s.id === "Mood")?.data || [];
        const participationData = chartData.find((s: any) => s.id === "Participation")?.data || [];
        const independenceData = chartData.find((s: any) => s.id === "Independence")?.data || [];
        
        dataSummary = `Mood trend: ${moodData.length} data points, Participation trend: ${participationData.length} data points, Independence trend: ${independenceData.length} data points.`;
        
        prompt = `Analyze this multi-metric trend chart showing mood, participation, and independence (inverse of prompts needed) over time. 
        
Data: ${dataSummary}
${moodData.length > 0 ? `Recent mood values: ${moodData.slice(-3).map((d: any) => d.y).join(", ")}` : ""}
${participationData.length > 0 ? `Recent participation values: ${participationData.slice(-3).map((d: any) => d.y).join(", ")}` : ""}
${independenceData.length > 0 ? `Recent independence values: ${independenceData.slice(-3).map((d: any) => d.y).join(", ")}` : ""}

Generate a brief, insightful summary (2-3 sentences) that:
1. Identifies the overall trend (improving, stable, or declining)
2. Highlights any notable patterns or correlations between the metrics
3. Provides actionable insight for care planning

Be specific, professional, and encouraging.`;
        break;

      case "mood-distribution":
        const positiveCount = chartData.reduce((sum: number, d: any) => sum + (d.Positive || 0), 0);
        const neutralCount = chartData.reduce((sum: number, d: any) => sum + (d.Neutral || 0), 0);
        const negativeCount = chartData.reduce((sum: number, d: any) => sum + (d.Negative || 0), 0);
        const totalSessions = positiveCount + neutralCount + negativeCount;
        
        dataSummary = `Total sessions: ${totalSessions}. Positive moods: ${positiveCount} (${totalSessions > 0 ? Math.round((positiveCount/totalSessions)*100) : 0}%), Neutral: ${neutralCount} (${totalSessions > 0 ? Math.round((neutralCount/totalSessions)*100) : 0}%), Negative: ${negativeCount} (${totalSessions > 0 ? Math.round((negativeCount/totalSessions)*100) : 0}%).`;
        
        prompt = `Analyze this mood distribution chart showing how positive, neutral, and negative moods are distributed across sessions over time.

${dataSummary}
Date range: ${chartData.length > 0 ? `${chartData[0].date} to ${chartData[chartData.length - 1].date}` : "N/A"}

Generate a brief, insightful summary (2-3 sentences) that:
1. Describes the overall mood pattern (mostly positive, balanced, or concerning)
2. Identifies any time-based patterns (e.g., better moods on certain days)
3. Suggests what this means for care planning

Be specific, professional, and person-centered.`;
        break;

      case "participation-correlation":
        const noneCount = chartData.find((d: any) => d.prompts === "None") || { Low: 0, Medium: 0, High: 0 };
        const minimalCount = chartData.find((d: any) => d.prompts === "Minimal") || { Low: 0, Medium: 0, High: 0 };
        const moderateCount = chartData.find((d: any) => d.prompts === "Moderate") || { Low: 0, Medium: 0, High: 0 };
        const maxCount = chartData.find((d: any) => d.prompts === "Max") || { Low: 0, Medium: 0, High: 0 };
        
        dataSummary = `Sessions with None prompts: Low participation ${noneCount.Low}, Medium ${noneCount.Medium}, High ${noneCount.High}. Minimal prompts: Low ${minimalCount.Low}, Medium ${minimalCount.Medium}, High ${minimalCount.High}. Moderate prompts: Low ${moderateCount.Low}, Medium ${moderateCount.Medium}, High ${moderateCount.High}. Max prompts: Low ${maxCount.Low}, Medium ${maxCount.Medium}, High ${maxCount.High}.`;
        
        prompt = `Analyze this correlation chart showing the relationship between prompts required (support needed) and participation levels.

${dataSummary}

Generate a brief, insightful summary (2-3 sentences) that:
1. Identifies the relationship pattern (e.g., does less support correlate with higher participation?)
2. Highlights what this means for the member's independence and engagement
3. Suggests implications for care planning (e.g., when to provide more/less support)

Be specific, professional, and focused on empowerment.`;
        break;

      case "mood-trend":
        const moodValues = chartData[0]?.data?.map((d: any) => d.y).filter((v: any) => v !== null) || [];
        const avgMood = moodValues.length > 0 ? moodValues.reduce((a: number, b: number) => a + b, 0) / moodValues.length : 0;
        
        dataSummary = `${moodValues.length} data points. Average mood score: ${avgMood.toFixed(1)} (scale: -2 to 2). Recent trend: ${moodValues.length >= 3 ? (moodValues.slice(-3).reduce((a: number, b: number) => a + b, 0) / 3 > avgMood ? "improving" : "declining") : "insufficient data"}.`;
        
        prompt = `Analyze this mood trend chart showing mood scores over time.

${dataSummary}

Generate a brief, insightful summary (2-3 sentences) that:
1. Describes the overall mood trend
2. Identifies any patterns or changes
3. Provides context for care planning

Be specific and professional.`;
        break;

      case "participation-levels":
        const highCount = chartData.find((d: any) => d.label === "High")?.value || 0;
        const mediumCount = chartData.find((d: any) => d.label === "Medium")?.value || 0;
        const lowCount = chartData.find((d: any) => d.label === "Low")?.value || 0;
        const total = highCount + mediumCount + lowCount;
        
        dataSummary = `High participation: ${highCount} sessions (${total > 0 ? Math.round((highCount/total)*100) : 0}%), Medium: ${mediumCount} (${total > 0 ? Math.round((mediumCount/total)*100) : 0}%), Low: ${lowCount} (${total > 0 ? Math.round((lowCount/total)*100) : 0}%).`;
        
        prompt = `Analyze this participation levels chart showing the distribution of participation across sessions.

${dataSummary}

Generate a brief, insightful summary (2-3 sentences) that:
1. Describes the overall participation pattern
2. Highlights what this indicates about engagement
3. Suggests opportunities for improvement

Be specific and professional.`;
        break;

      case "activity-distribution":
        const activityNames = chartData.map((d: any) => `${d.label} (${d.value} sessions)`).join(", ");
        const topActivity = chartData[0]?.label || "N/A";
        
        dataSummary = `Activities: ${activityNames}. Most common: ${topActivity}.`;
        
        prompt = `Analyze this activity distribution chart showing which activities are most common.

${dataSummary}

Generate a brief, insightful summary (2-3 sentences) that:
1. Describes the activity mix and diversity
2. Identifies if there's good variety or if certain activities dominate
3. Suggests opportunities for activity planning

Be specific and professional.`;
        break;

      default:
        return NextResponse.json(
          { error: "Unknown chart type" },
          { status: 400 }
        );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that provides clear, insightful analysis of care data charts for disability services. Be specific, professional, and person-centered in your insights.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const insight = completion.choices[0]?.message?.content?.trim() || 
      "This chart provides valuable insights into the member's progress and patterns.";

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("[POST /api/insights/chart] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate chart insight",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

