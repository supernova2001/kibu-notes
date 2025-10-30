"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Note = {
  structured_json?: any;
};

function inferActions(note: Note) {
  const structured = note.structured_json || {};
  const actions: { key: string; label: string; onClick: () => void }[] = [];

  const meds = Array.isArray(structured.medications) ? structured.medications : [];
  if (meds.length > 0) {
    actions.push({
      key: "mark-med-given",
      label: "Mark Medication Given",
      onClick: () => alert("Coming soon: record medication administration"),
    });
    actions.push({
      key: "log-side-effects",
      label: "Log Side Effects",
      onClick: () => alert("Coming soon: capture observed side effects"),
    });
  }

  const mood = structured.mood || "";
  const moodLower = typeof mood === "string" ? mood.toLowerCase() : "";
  const negativeMoods = new Set([
    "anxious",
    "agitated",
    "upset",
    "sad",
    "angry",
    "frustrated",
    "irritable",
    "low",
    "depressed",
  ]);
  if (moodLower && negativeMoods.has(moodLower)) {
    actions.push({
      key: "flag-review",
      label: "Flag for Review",
      onClick: () => alert("Coming soon: flag this note for supervisor review"),
    });
  }

  const participation = (structured.participation || "").toString().toLowerCase();
  const summary: string = structured.summary || "";
  if (
    participation === "high" ||
    /(goal|milestone|target|achieve|achievement)/i.test(summary)
  ) {
    actions.push({
      key: "log-achievement",
      label: "Log Achievement",
      onClick: () => alert("Coming soon: add to achievements log"),
    });
  }

  const followUps = Array.isArray(structured.followUps) ? structured.followUps : [];
  if (followUps.length > 0) {
    actions.push({
      key: "create-followup",
      label: "Create Follow-up Task",
      onClick: () => alert("Coming soon: create follow-up task from suggestions"),
    });
  }

  return actions.slice(0, 3); // keep it concise
}

export default function QuickActions({ note }: { note: Note }) {
  const { toast } = useToast();
  const actions = inferActions(note).map((a) => ({
    ...a,
    onClick: () =>
      toast({
        title: a.label,
        description: "This action will be available soon.",
        variant: "success",
      }),
  }));
  if (actions.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-700 mb-2">Quick Actions</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a.key} variant="outline" size="sm" onClick={a.onClick}>
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}


