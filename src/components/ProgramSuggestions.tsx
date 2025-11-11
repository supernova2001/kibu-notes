"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export type Program = {
  id: string;
  category: string; // e.g., "Daily Living", "Social Skills"
  name: string; // e.g., "Meal Preparation", "Turn-taking"
  description?: string;
  similarity?: number; // relevance score (0-1)
  link?: string; // URL to program details page
};

type ProgramSuggestionsProps = {
  programs: Program[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  loading?: boolean;
};

export default function ProgramSuggestions({
  programs,
  selectedIds,
  onSelectionChange,
  loading = false,
}: ProgramSuggestionsProps) {
  const toggleProgram = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((pid) => pid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (loading) {
    return (
      <div className="border-t pt-4 mt-4">
        <p className="text-sm font-semibold text-gray-800 mb-3">🔗 Suggested Programs</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-400 animate-pulse"
            >
              Loading...
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (programs.length === 0) {
    return null;
  }

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-gray-800">
          🔗 Suggested Programs {selectedIds.length > 0 && `(${selectedIds.length} selected)`}
        </p>
        <p className="text-xs text-gray-500">
          Select programs that match this note
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {programs.map((program) => {
          const isSelected = selectedIds.includes(program.id);
          return (
            <button
              key={program.id}
              onClick={() => toggleProgram(program.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? "bg-indigo-600 text-white border border-indigo-700 shadow-sm"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
              }`}
              title={program.description || `${program.category} → ${program.name}`}
            >
              <span className="text-xs opacity-75 mr-1">{program.category}</span>
              <span className="font-semibold">{program.name}</span>
              {program.similarity !== undefined && (
                <span className={`ml-1.5 text-xs ${isSelected ? "opacity-90" : "opacity-60"}`}>
                  ({Math.round(program.similarity * 100)}%)
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Selected programs will be linked to this note for tracking and analytics.
        </p>
      )}
    </div>
  );
}

