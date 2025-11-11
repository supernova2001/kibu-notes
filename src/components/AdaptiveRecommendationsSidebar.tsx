"use client";

import { useState, useEffect } from "react";
import AdaptiveRecommendations from "./AdaptiveRecommendations";
import { Program } from "./ProgramSuggestions";

type AdaptiveRecommendationsSidebarProps = {
  memberId: string;
  onProgramsLoaded?: (programs: Program[]) => void;
};

export default function AdaptiveRecommendationsSidebar({
  memberId,
  onProgramsLoaded,
}: AdaptiveRecommendationsSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const STORAGE_KEY = "kibu-adaptive-panel-expanded";

  // Load persisted state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setIsExpanded(JSON.parse(saved));
    }
  }, []);

  // Persist state to localStorage
  const toggleExpand = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  };

  return (
    <>
      {/* Backdrop overlay when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={toggleExpand}
        />
      )}

      {/* Left Panel */}
      {isExpanded ? (
        /* Expanded: Panel with content */
        <div className="fixed left-0 top-16 bottom-0 z-40 bg-white border-r border-gray-200 shadow-xl transition-all duration-300 w-80 sm:w-96 flex flex-col">
          {/* Header with minimize button */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-800">Adaptive Recommendations</h3>
                <p className="text-xs text-gray-500">Based on progress trends</p>
              </div>
            </div>
            <button
              onClick={toggleExpand}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Collapse"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <AdaptiveRecommendations memberId={memberId} onProgramsLoaded={onProgramsLoaded} />
          </div>
        </div>
      ) : (
        /* Collapsed: Small button on left edge */
        <button
          onClick={toggleExpand}
          className="fixed left-0 top-16 z-40 bg-white border-r border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-r-md"
          title="Show historical recommendations"
        >
          <span className="whitespace-nowrap text-[10px] sm:text-xs">Historical Recommendations</span>
          <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </>
  );
}

