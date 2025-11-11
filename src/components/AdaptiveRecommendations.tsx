"use client";

import { useState, useEffect } from "react";
import { Program } from "./ProgramSuggestions";

type AdaptiveRecommendationsProps = {
  memberId: string;
  onProgramsLoaded?: (programs: Program[]) => void;
};

type AdaptiveInsights = {
  trend_direction: "improving" | "stable" | "declining";
  avg_mood_score: number;
  avg_participation_score: number;
  avg_prompt_score: number;
  focus_areas: string[];
  ai_recommendation: string;
};

type AdaptiveContext = {
  notes_analyzed: number;
  time_period_days: number;
};

export default function AdaptiveRecommendations({
  memberId,
  onProgramsLoaded,
}: AdaptiveRecommendationsProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [insights, setInsights] = useState<AdaptiveInsights | null>(null);
  const [context, setContext] = useState<AdaptiveContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) return;

    const fetchAdaptiveRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/programs/adaptive?memberId=${memberId}&days=21&topK=10`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch adaptive recommendations");
        }

        const data = await response.json();
        setPrograms(data.recommendations || []);
        setInsights(data.insights || null);
        setContext(data.context || null);

        if (onProgramsLoaded) {
          onProgramsLoaded(data.recommendations || []);
        }
      } catch (err) {
        console.error("[AdaptiveRecommendations] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    };

    fetchAdaptiveRecommendations();
  }, [memberId, onProgramsLoaded]);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "improving":
        return "📈";
      case "declining":
        return "📉";
      default:
        return "➡️";
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case "improving":
        return "text-green-600 bg-green-50 border-green-200";
      case "declining":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  // Helper functions to convert scores to meaningful labels
  const getMoodLabel = (score: number): { label: string; color: string; description: string } => {
    if (score >= 1.5) return { label: "Positive", color: "text-green-600", description: "Engaged, Happy, or Calm" };
    if (score >= 0.5) return { label: "Neutral", color: "text-gray-600", description: "Neutral mood" };
    if (score >= -0.5) return { label: "Slightly Low", color: "text-yellow-600", description: "Mild concerns" };
    return { label: "Low", color: "text-red-600", description: "Anxious, Frustrated, or Withdrawn" };
  };

  const getParticipationLabel = (score: number): { label: string; color: string; description: string } => {
    if (score >= 2.5) return { label: "High", color: "text-green-600", description: "Actively participating" };
    if (score >= 1.5) return { label: "Medium", color: "text-yellow-600", description: "Moderate participation" };
    return { label: "Low", color: "text-red-600", description: "Limited participation" };
  };

  const getPromptsLabel = (score: number): { label: string; color: string; description: string } => {
    if (score <= 0.5) return { label: "None/Minimal", color: "text-green-600", description: "Independent, needs little support" };
    if (score <= 1.5) return { label: "Minimal", color: "text-yellow-600", description: "Some prompts needed" };
    if (score <= 2.5) return { label: "Moderate", color: "text-orange-600", description: "Regular prompts required" };
    return { label: "High", color: "text-red-600", description: "Frequent prompts needed" };
  };

  const getScorePercentage = (score: number, min: number, max: number): number => {
    return Math.max(0, Math.min(100, ((score - min) / (max - min)) * 100));
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!insights || programs.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
        <p className="text-sm text-gray-600">
          {context && context.notes_analyzed === 0
            ? "Add more notes to get personalized recommendations based on progress trends."
            : "No adaptive recommendations available."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trend Indicator */}
      <div className={`p-3 rounded-lg border ${getTrendColor(insights.trend_direction)}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{getTrendIcon(insights.trend_direction)}</span>
          <span className="text-sm font-semibold capitalize">
            Trend: {insights.trend_direction}
          </span>
        </div>
        {/* Metrics with meaningful labels and visual indicators */}
        <div className="space-y-3 mt-3">
          {/* Mood Metric */}
          {(() => {
            const moodInfo = getMoodLabel(insights.avg_mood_score);
            const moodPercent = getScorePercentage(insights.avg_mood_score, -2, 2);
            return (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="opacity-70">Mood:</span>
                    <span className={`font-semibold ${moodInfo.color}`}>{moodInfo.label}</span>
                    <span className="text-gray-500">({insights.avg_mood_score.toFixed(1)})</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      moodInfo.color.includes("green") ? "bg-green-500" :
                      moodInfo.color.includes("yellow") ? "bg-yellow-500" :
                      moodInfo.color.includes("red") ? "bg-red-500" : "bg-gray-500"
                    }`}
                    style={{ width: `${moodPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500">{moodInfo.description}</p>
              </div>
            );
          })()}

          {/* Participation Metric */}
          {(() => {
            const partInfo = getParticipationLabel(insights.avg_participation_score);
            const partPercent = getScorePercentage(insights.avg_participation_score, 1, 3);
            return (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="opacity-70">Participation:</span>
                    <span className={`font-semibold ${partInfo.color}`}>{partInfo.label}</span>
                    <span className="text-gray-500">({insights.avg_participation_score.toFixed(1)})</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      partInfo.color.includes("green") ? "bg-green-500" :
                      partInfo.color.includes("yellow") ? "bg-yellow-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${partPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500">{partInfo.description}</p>
              </div>
            );
          })()}

          {/* Prompts Metric */}
          {(() => {
            const promptsInfo = getPromptsLabel(insights.avg_prompt_score);
            const promptsPercent = getScorePercentage(insights.avg_prompt_score, 0, 3);
            // For prompts, lower is better, so we invert the percentage
            const invertedPercent = 100 - promptsPercent;
            return (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="opacity-70">Prompts Needed:</span>
                    <span className={`font-semibold ${promptsInfo.color}`}>{promptsInfo.label}</span>
                    <span className="text-gray-500">({insights.avg_prompt_score.toFixed(1)})</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      promptsInfo.color.includes("green") ? "bg-green-500" :
                      promptsInfo.color.includes("yellow") ? "bg-yellow-500" :
                      promptsInfo.color.includes("orange") ? "bg-orange-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${invertedPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500">{promptsInfo.description}</p>
              </div>
            );
          })()}
        </div>
        
        {/* Context note */}
        {context && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <p className="text-[10px] text-gray-500">
              Average calculated from {context.notes_analyzed} notes over the last {context.time_period_days} days
            </p>
          </div>
        )}
      </div>

      {/* AI Recommendation */}
      {insights.ai_recommendation && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-900 mb-1">AI Insight</p>
              <p className="text-sm text-blue-800 leading-relaxed">
                {insights.ai_recommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Focus Areas */}
      {insights.focus_areas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Focus Areas
          </p>
          <div className="flex flex-wrap gap-2">
            {insights.focus_areas.map((area, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Programs */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          Recommended Programs ({programs.length})
        </p>
        <div className="space-y-2">
          {programs.map((program) => (
            <div
              key={program.id}
              className="p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{program.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{program.category}</p>
                </div>
                {program.similarity !== undefined && (
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {Math.round(program.similarity * 100)}%
                  </span>
                )}
              </div>
              {program.description && (
                <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                  {program.description}
                </p>
              )}
              {program.link && (
                <a
                  href={program.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 mt-2 inline-block"
                >
                  View Details →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Context Info */}
      {context && (
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Based on {context.notes_analyzed} notes from the last {context.time_period_days} days
          </p>
        </div>
      )}
    </div>
  );
}

