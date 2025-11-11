"use client";

import { useState, useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";

type Note = {
  session_date: string;
  created_at?: string;
  mood?: string;
  participation?: string;
  promptsRequired?: string;
  activityType?: string;
  activity_type?: string;
  structured_json?: any;
};

type ChartInsights = {
  multiMetric?: string;
  moodStacked?: string;
  correlation?: string;
  moodTrend?: string;
  participation?: string;
  activity?: string;
};

export default function InsightsSection({ notes }: { notes: Note[] }) {
  const [chartInsights, setChartInsights] = useState<ChartInsights>({});
  const [loadingInsights, setLoadingInsights] = useState<Record<string, boolean>>({});

  if (!notes || notes.length === 0) return null;

  // Sort notes by date
  const sortedNotes = [...notes].sort((a, b) => {
    const dateA = new Date(a.session_date || a.created_at || 0).getTime();
    const dateB = new Date(b.session_date || b.created_at || 0).getTime();
    return dateA - dateB;
  });

  // Mood scoring map (matching noteEmbeddings.ts)
  const moodScoreMap: Record<string, number> = {
    engaged: 2,
    calm: 1,
    happy: 2,
    neutral: 0,
    anxious: -1,
    agitated: -2,
    frustrated: -1,
    withdrawn: -2,
  };

  // Participation scoring map
  const participationScoreMap: Record<string, number> = {
    high: 3,
    medium: 2,
    moderate: 2,
    low: 1,
  };

  // Prompts scoring map
  const promptsScoreMap: Record<string, number> = {
    none: 0,
    minimal: 1,
    moderate: 2,
    max: 3,
    maximum: 3,
  };

  // ----- Data Preparation -----
  
  // 1. Multi-Metric Trend Line Chart (Mood, Participation, Prompts over time)
  const trendData = useMemo(() => sortedNotes
    .filter((n) => n.mood || n.participation || n.promptsRequired)
    .map((n) => {
      const structured = n.structured_json || {};
      const mood = (n.mood || structured.mood || "").toLowerCase();
      const participation = (n.participation || structured.participation || "").toLowerCase();
      const prompts = (n.promptsRequired || structured.promptsRequired || "").toLowerCase();
      
      const date = new Date(n.session_date || n.created_at || Date.now());
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      return {
        date: dateStr,
        fullDate: date.getTime(),
        mood: moodScoreMap[mood] ?? null,
        participation: participationScoreMap[participation] ?? null,
        prompts: promptsScoreMap[prompts] ?? null,
      };
    }), [sortedNotes]);

  const multiMetricData = useMemo(() => [
    {
      id: "Mood",
      data: trendData
        .filter((d) => d.mood !== null)
        .map((d) => ({ x: d.date, y: d.mood })),
      color: "#4f46e5",
    },
    {
      id: "Participation",
      data: trendData
        .filter((d) => d.participation !== null)
        .map((d) => ({ x: d.date, y: d.participation })),
      color: "#10b981",
    },
    {
      id: "Independence",
      data: trendData
        .filter((d) => d.prompts !== null)
        .map((d) => ({ x: d.date, y: 3 - d.prompts })), // Invert: lower prompts = higher independence
      color: "#f59e0b",
    },
  ], [trendData]);

  // 2. Mood Distribution Over Time (Stacked Area)
  const moodDistributionData = useMemo(() => sortedNotes
    .filter((n) => n.mood || n.structured_json?.mood)
    .map((n) => {
      const mood = ((n.mood || n.structured_json?.mood || "") as string).toLowerCase();
      const date = new Date(n.session_date || n.created_at || Date.now());
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      const category = 
        moodScoreMap[mood] >= 1.5 ? "Positive" :
        moodScoreMap[mood] >= 0 ? "Neutral" : "Negative";
      
      return { date: dateStr, category, value: 1 };
    }), [sortedNotes]);

  // Group by date and category
  const moodStackedData = useMemo(() => {
    const moodByDate: Record<string, Record<string, number>> = {};
    moodDistributionData.forEach((d) => {
      if (!moodByDate[d.date]) moodByDate[d.date] = { Positive: 0, Neutral: 0, Negative: 0 };
      moodByDate[d.date][d.category] = (moodByDate[d.date][d.category] || 0) + 1;
    });
    return Object.entries(moodByDate).map(([date, counts]) => ({
      date,
      Positive: counts.Positive || 0,
      Neutral: counts.Neutral || 0,
      Negative: counts.Negative || 0,
    }));
  }, [moodDistributionData]);

  const moodStackedChartData = useMemo(() => [
    { id: "Positive", data: moodStackedData.map((d) => ({ x: d.date, y: d.Positive })), color: "#10b981" },
    { id: "Neutral", data: moodStackedData.map((d) => ({ x: d.date, y: d.Neutral })), color: "#6b7280" },
    { id: "Negative", data: moodStackedData.map((d) => ({ x: d.date, y: d.Negative })), color: "#ef4444" },
  ], [moodStackedData]);

  // 3. Participation vs Prompts Correlation (Scatter Plot)
  const correlationData = useMemo(() => sortedNotes
    .filter((n) => (n.participation || n.structured_json?.participation) && (n.promptsRequired || n.structured_json?.promptsRequired))
    .map((n) => {
      const structured = n.structured_json || {};
      const participation = (n.participation || structured.participation || "").toLowerCase();
      const prompts = (n.promptsRequired || structured.promptsRequired || "").toLowerCase();
      
      return {
        x: promptsScoreMap[prompts] ?? 0,
        y: participationScoreMap[participation] ?? 0,
        size: 1,
      };
    }), [sortedNotes]);

  // Legacy data for existing charts
  const moodData = useMemo(() => {
    if (!notes.some((n) => n.mood || n.structured_json?.mood)) {
      return false;
    }
    return [
      {
        id: "Mood Trend",
        data: sortedNotes.map((n) => {
          const mood = (n.mood || n.structured_json?.mood || "").toLowerCase();
          return {
            x: new Date(n.session_date || n.created_at || Date.now()).toLocaleDateString(),
            y: moodScoreMap[mood] ?? null,
          };
        }).filter((p) => p.y !== null),
      },
    ];
  }, [sortedNotes, notes]);

  const participationData = useMemo(() => {
    const participationCount: Record<string, number> = {};
    notes.forEach((n) => {
      const participation = n.participation || n.structured_json?.participation;
      if (participation) {
        participationCount[participation] =
          (participationCount[participation] || 0) + 1;
      }
    });
    return Object.entries(participationCount).map(
      ([label, value]) => ({ label, value })
    );
  }, [notes]);

  const activityData = useMemo(() => {
    const activityCount: Record<string, number> = {};
    notes.forEach((n) => {
      const activity = n.activityType || n.activity_type || n.structured_json?.activityType;
      if (activity) {
        activityCount[activity] = (activityCount[activity] || 0) + 1;
      }
    });
    return Object.entries(activityCount).map(([label, value]) => ({
      id: label,
      label,
      value,
    }));
  }, [notes]);

  // Prepare correlation chart data
  const correlationChartData = useMemo(() => {
    // Group correlation data by prompts level
    const grouped: Record<string, { Low: number; Medium: number; High: number }> = {
      "None": { Low: 0, Medium: 0, High: 0 },
      "Minimal": { Low: 0, Medium: 0, High: 0 },
      "Moderate": { Low: 0, Medium: 0, High: 0 },
      "Max": { Low: 0, Medium: 0, High: 0 },
    };
    
    correlationData.forEach((d) => {
      const promptsLabel = d.x === 0 ? "None" : d.x === 1 ? "Minimal" : d.x === 2 ? "Moderate" : "Max";
      const participationLabel = d.y === 1 ? "Low" : d.y === 2 ? "Medium" : "High";
      grouped[promptsLabel][participationLabel] += 1;
    });
    
    return Object.entries(grouped).map(([prompts, counts]) => ({
      prompts,
      ...counts,
    }));
  }, [correlationData]);

  const nivoTheme = {
    text: { fill: "#374151", fontSize: 12 },
    axis: {
      domain: { line: { stroke: "#d1d5db" } },
      ticks: { line: { stroke: "#9ca3af" }, text: { fill: "#374151" } },
    },
    grid: { line: { stroke: "#f3f4f6" } },
    legends: { text: { fill: "#374151" } },
    tooltip: { container: { background: "white", color: "#111827" } },
  };

  // Function to fetch AI insight for a chart (called on button click)
  const handleFetchInsight = async (chartType: string, chartData: any) => {
    // Map chart type to the key used in state
    const insightKey = chartType === "multi-metric" ? "multiMetric" :
                      chartType === "mood-distribution" ? "moodStacked" :
                      chartType === "participation-correlation" ? "correlation" :
                      chartType === "mood-trend" ? "moodTrend" :
                      chartType === "participation-levels" ? "participation" :
                      "activity";

    if (loadingInsights[chartType] || chartInsights[insightKey as keyof ChartInsights]) {
      return; // Already loading or loaded
    }

    setLoadingInsights((prev) => ({ ...prev, [chartType]: true }));

    try {
      const response = await fetch("/api/insights/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartType,
          chartData,
          notes: sortedNotes,
        }),
      });

      if (response.ok) {
        const { insight } = await response.json();
        setChartInsights((prev) => ({ ...prev, [insightKey]: insight }));
      }
    } catch (error) {
      console.error(`Error fetching insight for ${chartType}:`, error);
    } finally {
      setLoadingInsights((prev) => ({ ...prev, [chartType]: false }));
    }
  };

  // ----- Conditionally Render Charts -----
  const hasMultiMetric = multiMetricData.some((series) => series.data.length > 0);
  const hasMoodStacked = moodStackedChartData.some((series) => series.data.length > 0);
  const hasCorrelation = correlationData.length > 0;
  const hasMood = moodData && moodData[0].data.length > 0;
  const hasParticipation = participationData.length > 0;
  const hasActivity = activityData.length > 0;


  if (!hasMultiMetric && !hasMoodStacked && !hasCorrelation && !hasMood && !hasParticipation && !hasActivity) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Not enough data to generate insights. Add more notes to see charts.</p>
      </div>
    );
  }

  return (
    <section className="bg-white border rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">
        Performance Insights
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Multi-Metric Trend Line Chart */}
        {hasMultiMetric && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Multi-Metric Trends Over Time
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Track mood, participation, and independence across all sessions
            </p>
            <div className="h-72">
              <ResponsiveLine
                data={multiMetricData}
                margin={{ top: 30, right: 80, bottom: 80, left: 50 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: -2, max: 3, nice: true }}
                axisBottom={{
                  tickRotation: -45,
                  legend: "Date",
                  legendOffset: 50,
                  legendPosition: "middle",
                }}
                axisLeft={{
                  legend: "Score",
                  legendOffset: -40,
                  legendPosition: "middle",
                }}
                pointSize={6}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                useMesh={true}
                legends={[
                  {
                    anchor: "top-right",
                    direction: "column",
                    justify: false,
                    translateX: 60,
                    translateY: 0,
                    itemsSpacing: 0,
                    itemDirection: "left-to-right",
                    itemWidth: 70,
                    itemHeight: 18,
                    symbolSize: 10,
                  },
                ]}
                theme={nivoTheme}
              />
            </div>
            {/* AI Insight Button */}
            <div className="mt-3 flex justify-center">
              {!chartInsights.multiMetric && !loadingInsights["multi-metric"] ? (
                <button
                  onClick={() => handleFetchInsight("multi-metric", multiMetricData)}
                  className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Generate AI Insight
                </button>
              ) : (
                <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-900 mb-1">AI Insight</p>
                      {loadingInsights["multi-metric"] ? (
                        <p className="text-xs text-blue-700">Generating insight...</p>
                      ) : (
                        <p className="text-xs text-blue-800">{chartInsights.multiMetric}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Mood Distribution Over Time - Using Stacked Bar */}
        {hasMoodStacked && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Mood Distribution Over Time
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              See how positive, neutral, and negative moods are distributed across sessions
            </p>
            <div className="h-72">
              <ResponsiveBar
                data={moodStackedData}
                keys={["Positive", "Neutral", "Negative"]}
                indexBy="date"
                margin={{ top: 30, right: 80, bottom: 80, left: 50 }}
                padding={0.3}
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={["#10b981", "#6b7280", "#ef4444"]}
                axisBottom={{
                  tickRotation: -45,
                  legend: "Date",
                  legendOffset: 50,
                  legendPosition: "middle",
                }}
                axisLeft={{
                  legend: "Sessions",
                  legendOffset: -40,
                  legendPosition: "middle",
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                legends={[
                  {
                    dataFrom: "keys",
                    anchor: "top-right",
                    direction: "column",
                    justify: false,
                    translateX: 60,
                    translateY: 0,
                    itemsSpacing: 0,
                    itemWidth: 70,
                    itemHeight: 18,
                    symbolSize: 10,
                  },
                ]}
                theme={nivoTheme}
              />
            </div>
            {/* AI Insight Button */}
            <div className="mt-3 flex justify-center">
              {!chartInsights.moodStacked && !loadingInsights["mood-distribution"] ? (
                <button
                  onClick={() => handleFetchInsight("mood-distribution", moodStackedData)}
                  className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Generate AI Insight
                </button>
              ) : (
                <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-900 mb-1">AI Insight</p>
                      {loadingInsights["mood-distribution"] ? (
                        <p className="text-xs text-blue-700">Generating insight...</p>
                      ) : (
                        <p className="text-xs text-blue-800">{chartInsights.moodStacked}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Participation vs Prompts Correlation - Heatmap-style visualization */}
        {hasCorrelation && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Participation vs Support Needed
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Relationship between prompts required and participation levels
            </p>
            <div className="h-72">
              <ResponsiveBar
                data={correlationChartData}
                keys={["Low", "Medium", "High"]}
                indexBy="prompts"
                margin={{ top: 30, right: 80, bottom: 80, left: 50 }}
                padding={0.3}
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={["#ef4444", "#f59e0b", "#10b981"]}
                axisBottom={{
                  legend: "Prompts Required",
                  legendPosition: "middle",
                  legendOffset: 50,
                }}
                axisLeft={{
                  legend: "Sessions",
                  legendPosition: "middle",
                  legendOffset: -40,
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                legends={[
                  {
                    dataFrom: "keys",
                    anchor: "top-right",
                    direction: "column",
                    justify: false,
                    translateX: 60,
                    translateY: 0,
                    itemsSpacing: 0,
                    itemWidth: 70,
                    itemHeight: 18,
                    symbolSize: 10,
                  },
                ]}
                theme={nivoTheme}
              />
            </div>
            {/* AI Insight Button */}
            <div className="mt-3 flex justify-center">
              {!chartInsights.correlation && !loadingInsights["participation-correlation"] ? (
                <button
                  onClick={() => handleFetchInsight("participation-correlation", correlationChartData)}
                  className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Generate AI Insight
                </button>
              ) : (
                <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-900 mb-1">AI Insight</p>
                      {loadingInsights["participation-correlation"] ? (
                        <p className="text-xs text-blue-700">Generating insight...</p>
                      ) : (
                        <p className="text-xs text-blue-800">{chartInsights.correlation}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legacy charts - keep for backward compatibility */}
        {hasMood && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Mood Trend
            </h3>
            <div className="h-72">
            <ResponsiveLine
              data={moodData}
                margin={{ top: 30, right: 40, bottom: 60, left: 50 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: 0, max: 5 }}
              axisBottom={{ tickRotation: -30 }}
              axisLeft={{
                tickValues: [1, 2, 3, 4, 5],
                legend: "Mood Score",
                legendOffset: -40,
                legendPosition: "middle",
              }}
              colors={["#4f46e5"]}
              pointSize={6}
              pointBorderWidth={1}
              useMesh={true}
              theme={nivoTheme}
            />
            </div>
            {/* AI Insight Button */}
            <div className="mt-3 flex justify-center">
              {!chartInsights.moodTrend && !loadingInsights["mood-trend"] ? (
                <button
                  onClick={() => handleFetchInsight("mood-trend", moodData)}
                  className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Generate AI Insight
                </button>
              ) : (
                <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-900 mb-1">AI Insight</p>
                      {loadingInsights["mood-trend"] ? (
                        <p className="text-xs text-blue-700">Generating insight...</p>
                      ) : (
                        <p className="text-xs text-blue-800">{chartInsights.moodTrend}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Participation Levels */}
        {hasParticipation && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Participation Levels
            </h3>
            <div className="h-72">
            <ResponsiveBar
              data={participationData}
              keys={["value"]}
              indexBy="label"
              margin={{ top: 20, right: 20, bottom: 60, left: 40 }}
              colors={["#6366f1"]}
              axisBottom={{
                legend: "Participation",
                legendPosition: "middle",
                legendOffset: 32,
              }}
              axisLeft={{
                legend: "Sessions",
                legendPosition: "middle",
                legendOffset: -32,
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              borderRadius={4}
              theme={nivoTheme}
            />
            </div>
            {/* AI Insight Button */}
            <div className="mt-3 flex justify-center">
              {!chartInsights.participation && !loadingInsights["participation-levels"] ? (
                <button
                  onClick={() => handleFetchInsight("participation-levels", participationData)}
                  className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Generate AI Insight
                </button>
              ) : (
                <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-900 mb-1">AI Insight</p>
                      {loadingInsights["participation-levels"] ? (
                        <p className="text-xs text-blue-700">Generating insight...</p>
                      ) : (
                        <p className="text-xs text-blue-800">{chartInsights.participation}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Distribution */}
        {hasActivity && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Activity Distribution
            </h3>
            <div className="h-72">
            <ResponsivePie
              data={activityData}
              margin={{ top: 20, right: 100, bottom: 60, left: 100 }}
              innerRadius={0.5}
              padAngle={1}
              cornerRadius={3}
              activeOuterRadiusOffset={6}
              colors={{ scheme: "set3" }}
              borderWidth={1}
              borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
              arcLabelsSkipAngle={10}
              theme={nivoTheme}
            />
            </div>
            {/* AI Insight Button */}
            <div className="mt-3 flex justify-center">
              {!chartInsights.activity && !loadingInsights["activity-distribution"] ? (
                <button
                  onClick={() => handleFetchInsight("activity-distribution", activityData)}
                  className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Generate AI Insight
                </button>
              ) : (
                <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-900 mb-1">AI Insight</p>
                      {loadingInsights["activity-distribution"] ? (
                        <p className="text-xs text-blue-700">Generating insight...</p>
                      ) : (
                        <p className="text-xs text-blue-800">{chartInsights.activity}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}