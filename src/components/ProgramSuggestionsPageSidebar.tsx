"use client";

import { useState, useEffect } from "react";
import { Program } from "./ProgramSuggestions";

type ProgramSuggestionsPageSidebarProps = {
  programs: Program[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  loading?: boolean;
  noteTime?: string;
};

export default function ProgramSuggestionsPageSidebar({
  programs,
  selectedIds,
  onSelectionChange,
  loading = false,
  noteTime,
}: ProgramSuggestionsPageSidebarProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const STORAGE_KEY = "kibu-program-sidebar-minimized";

  // Load persisted state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setIsMinimized(JSON.parse(saved));
    }
  }, []);

  // Persist state to localStorage
  const toggleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  };

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

  return (
    <>
      {/* Backdrop overlay when expanded */}
      {!isMinimized && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 transition-opacity duration-300"
          onClick={toggleMinimize}
        />
      )}
      
      {/* Sidebar */}
      {isMinimized ? (
        /* Collapsed: Small button on right edge */
        <button
          onClick={toggleMinimize}
          className="fixed right-0 top-16 z-30 bg-white border-l border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-l-md"
          title="Show day wise suggestions"
        >
          <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="whitespace-nowrap text-[10px] sm:text-xs">Day Wise Suggestions</span>
        </button>
      ) : (
        /* Expanded: Full sidebar */
        <div
          className="fixed right-0 top-16 bottom-0 bg-white border-l border-gray-200 shadow-2xl z-30 transition-all duration-300 w-80 sm:w-96 flex flex-col"
        >
          {/* Header with minimize button */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 h-16">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔗</span>
              <div className="flex-1">
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
              onClick={toggleMinimize}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Minimize"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
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
            ) : programs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <span className="text-4xl mb-3">🔗</span>
                <p className="text-sm font-medium text-gray-700 mb-1">No programs to show</p>
                <p className="text-xs text-gray-500">
                  Program suggestions will appear here after adding a note.
                </p>
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
                          <div
                            key={program.id}
                            className={`rounded-md text-sm transition-all ${
                              isSelected
                                ? "bg-indigo-600 text-white border border-indigo-700 shadow-sm"
                                : "bg-white text-gray-700 border border-gray-300"
                            }`}
                          >
                            <button
                              onClick={() => toggleProgram(program.id)}
                              className="w-full text-left px-3 py-2"
                            >
                              <div className="flex items-center justify-between mb-1">
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
                            {/* Link to program */}
                            <div className="px-3 pb-2">
                              <a
                                href={program.link || `/programs/${program.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className={`text-xs underline ${
                                  isSelected ? "text-indigo-200 hover:text-indigo-100" : "text-indigo-600 hover:text-indigo-800"
                                }`}
                              >
                                View Program Details →
                              </a>
                            </div>
                          </div>
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
        </div>
      )}
    </>
  );
}

