"use client";

import { useState } from "react";
import { Program } from "./ProgramSuggestions";

type ProgramSuggestionsSidebarProps = {
  programs: Program[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  loading?: boolean;
  noteTime?: string;
};

export default function ProgramSuggestionsSidebar({
  programs,
  selectedIds,
  onSelectionChange,
  loading = false,
  noteTime,
}: ProgramSuggestionsSidebarProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleProgram = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((pid) => pid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  // Group programs by category
  const programsByCategory = programs.reduce((acc, program) => {
    const category = program.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(program);
    return acc;
  }, {} as Record<string, Program[]>);

  if (programs.length === 0 && !loading) {
    return null;
  }

  return (
    <div
      className={`absolute right-0 top-0 h-full bg-white border-l border-gray-200 shadow-lg z-40 transition-all duration-300 ${
        isMinimized ? "w-12" : "w-80 sm:w-96"
      }`}
    >
      {/* Header with minimize button */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className={`flex items-center gap-2 ${isMinimized ? "hidden" : ""}`}>
          <span className="text-lg">🔗</span>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Suggested Programs</h3>
            {noteTime && (
              <p className="text-xs text-gray-500">
                {new Date(noteTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title={isMinimized ? "Expand" : "Minimize"}
        >
          {isMinimized ? (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="h-[calc(100%-60px)] overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  <div className="space-y-1">
                    <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selection count */}
              {selectedIds.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-md p-2 text-xs text-indigo-700">
                  <strong>{selectedIds.length}</strong> program{selectedIds.length !== 1 ? "s" : ""} selected
                </div>
              )}

              {/* Programs by category */}
              {Object.entries(programsByCategory).map(([category, categoryPrograms]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {category}
                  </h4>
                  <div className="space-y-1.5">
                    {categoryPrograms.map((program) => {
                      const isSelected = selectedIds.includes(program.id);
                      return (
                        <button
                          key={program.id}
                          onClick={() => toggleProgram(program.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                            isSelected
                              ? "bg-indigo-600 text-white border border-indigo-700 shadow-sm"
                              : "bg-white text-gray-700 border border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
                          }`}
                          title={program.description || `${program.category} → ${program.name}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{program.name}</span>
                            {program.similarity !== undefined && (
                              <span className={`text-xs ${isSelected ? "opacity-90" : "opacity-60"}`}>
                                {Math.round(program.similarity * 100)}%
                              </span>
                            )}
                          </div>
                          {program.description && (
                            <p className={`text-xs mt-0.5 ${isSelected ? "opacity-80" : "text-gray-500"}`}>
                              {program.description}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Help text */}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Select programs that match this note. They'll be linked for tracking and analytics.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

