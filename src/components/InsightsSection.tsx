"use client";

import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";

type Note = {
  session_date: string;
  mood?: string;
  participation?: string;
  promptsRequired?: string;
  activityType?: string;
  activity_type?: string;
};

export default function InsightsSection({ notes }: { notes: Note[] }) {
  if (!notes || notes.length === 0) return null;

  const moodMap: Record<string, number> = {
    Disengaged: 1,
    Neutral: 2,
    Calm: 3,
    Engaged: 4,
    Happy: 5,
  };

  // ----- Data Preparation -----
  const moodData =
    notes.some((n) => n.mood) &&
    [
      {
        id: "Mood Trend",
        data: notes.map((n) => ({
          x: new Date(n.session_date).toLocaleDateString(),
          y: moodMap[n.mood || ""] || null,
        })).filter((p) => p.y !== null),
      },
    ];

  const participationCount: Record<string, number> = {};
  notes.forEach((n) => {
    if (n.participation) {
      participationCount[n.participation] =
        (participationCount[n.participation] || 0) + 1;
    }
  });
  const participationData = Object.entries(participationCount).map(
    ([label, value]) => ({ label, value })
  );

  const activityCount: Record<string, number> = {};
  notes.forEach((n) => {
    const activity = n.activityType || n.activity_type;
    if (activity) {
      activityCount[activity] = (activityCount[activity] || 0) + 1;
    }
  });
  const activityData = Object.entries(activityCount).map(([label, value]) => ({
    id: label,
    label,
    value,
  }));

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

  // ----- Conditionally Render Charts -----
  const hasMood = moodData && moodData[0].data.length > 0;
  const hasParticipation = participationData.length > 0;
  const hasActivity = activityData.length > 0;

  if (!hasMood && !hasParticipation && !hasActivity) return null;

  return (
    <section className="bg-white border rounded-xl p-6 shadow-sm mt-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Performance Insights
      </h2>

      <div
        className={`grid ${
          hasActivity && (hasMood || hasParticipation)
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-1"
        } gap-6`}
      >
        {/* Mood Trend */}
        {hasMood && (
          <div className="h-72">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Mood Trend
            </h3>
            <ResponsiveLine
              data={moodData}
              margin={{ top: 30, right: 40, bottom: 40, left: 50 }}
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
        )}

        {/* Participation Levels */}
        {hasParticipation && (
          <div className="h-72">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Participation Levels
            </h3>
            <ResponsiveBar
              data={participationData}
              keys={["value"]}
              indexBy="label"
              margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
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
        )}

        {/* Activity Distribution */}
        {hasActivity && (
          <div
            className={`h-72 ${
              hasMood || hasParticipation ? "col-span-1 lg:col-span-2" : ""
            }`}
          >
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Activity Distribution
            </h3>
            <ResponsivePie
              data={activityData}
              margin={{ top: 20, right: 100, bottom: 40, left: 100 }}
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
        )}
      </div>
    </section>
  );
}