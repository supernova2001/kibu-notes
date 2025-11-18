"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StructuredNoteType } from "@/lib/schemas";
import { useToast } from "@/components/ui/toast";
import { Program } from "@/components/ProgramSuggestions";

export default function NoteEditor({
  transcript,
  memberId,
  memberName,
  onProgramsLoaded,
  onProgramsLoadingChange,
  selectedProgramIds = [],
  onProgramSelectionChange,
}: {
  transcript: string;
  memberId?: string;
  memberName?: string;
  onProgramsLoaded?: (programs: Program[], noteTime: string) => void;
  onProgramsLoadingChange?: (loading: boolean) => void;
  selectedProgramIds?: string[];
  onProgramSelectionChange?: (ids: string[]) => void;
}) {
  const [freeText, setFreeText] = useState(transcript);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<StructuredNoteType | null>(null);
  const { toast } = useToast();

  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [extraDetails, setExtraDetails] = useState<Record<string, string>>({});
  
  // Local loading state (will notify parent)
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  useEffect(() => {
    if (transcript && transcript.trim().length > 0) {
      setFreeText(transcript);
    }
  }, [transcript]);

  // STEP 1: Validate note & detect missing compliance fields
  const validateNote = async () => {
    setLoading(true);
    const res = await fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ freeText }),
    });

    console.log(freeText)
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Validation failed", description: "Could not validate note.", variant: "error" });
      return;
    }

    // If missing fields, show modal to collect them
    if (data.missing?.length > 0) {
      const details: Record<string, string> = { ...(data.filled || {}) };
      data.missing.forEach((f: string) => {
        if (!details[f]) details[f] = "";
      });
      setExtraDetails(details);
      setMissingFields(data.missing);
      setShowModal(true);
    } else {
      // Everything present → directly generate note
      const enriched = Object.entries(data.filled || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(". ");
      generateStructuredNote(`${freeText}. ${enriched}`);
    }
  };

  // STEP 2: Handle modal submission and merge extra info
  const handleModalSubmit = () => {
    const additions = Object.entries(extraDetails)
      .map(([k, v]) => `${k}: ${v}`)
      .join(". ");
    const merged = `${freeText}. ${additions}`;
    setShowModal(false);
    generateStructuredNote(merged);
  };

  // STEP 3: Generate the structured compliant note
  const generateStructuredNote = async (text: string) => {
    setLoading(true);
    const sessionDate = new Date().toISOString();
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: memberId,
        memberName: memberName || extraDetails["member name"] || undefined,
        activityType: extraDetails["activity type"] || "General",
        sessionDate: sessionDate,
        freeText: text,
        language: "en",
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setNote(data);
      toast({ title: "Note saved", description: "Summary and medications extracted.", variant: "success" });
      // Fetch program suggestions after note is generated
      // Pass memberId and sessionDate so recommendations can be saved to database
      await fetchProgramSuggestions(text, data.summary || "", memberId, data.noteId, sessionDate);
    } else {
      toast({ title: "Save failed", description: data.error || "Failed to generate note", variant: "error" });
    }
  };

  // STEP 4: Fetch program suggestions based on transcript/summary using RAG
  const fetchProgramSuggestions = async (
    transcript: string, 
    summary: string,
    memberId?: string,
    noteId?: string,
    sessionDate?: string
  ) => {
    const loading = true;
    setLoadingPrograms(loading);
    onProgramsLoadingChange?.(loading);
    
    // Reset selections if parent handles it
    if (onProgramSelectionChange) {
      onProgramSelectionChange([]);
    }
    
    try {
      // Call the RAG-based program suggestion API
      const response = await fetch("/api/programs/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript,
          summary,
          memberId,
          noteId,
          sessionDate: sessionDate || new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      const programs: Program[] = data.programs || [];
      
      // Log extracted keywords for debugging
      if (data.keywords && data.keywords.length > 0) {
        console.log("Extracted keywords:", data.keywords);
      }
      
      const noteTime = new Date().toISOString();
      onProgramsLoaded?.(programs, noteTime);
      
      if (programs.length === 0) {
        toast({
          title: "No suggestions found",
          description: "No matching programs found for this note. Try adding more details.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Failed to fetch program suggestions:", error);
      toast({
        title: "Suggestions unavailable",
        description: error instanceof Error 
          ? `Could not load program suggestions: ${error.message}` 
          : "Could not load program suggestions. You can still save the note.",
        variant: "error",
      });
    } finally {
      const loading = false;
      setLoadingPrograms(loading);
      onProgramsLoadingChange?.(loading);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-semibold text-lg mb-2">
            Voice + Smart Note Companion
          </h2>

          {/* Caregiver transcript / typed notes */}
          <textarea
            className="w-full border rounded-md p-2 min-h-[140px]"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Your transcribed or typed caregiver note..."
          />

          <Button onClick={validateNote} disabled={loading}>
            {loading ? "Checking Compliance..." : "Submit for Compliance Check"}
          </Button>

          {/* Final structured note preview */}
          {note && (
            <div className="space-y-2 border-t pt-4 mt-4">
              <h3 className="font-semibold text-lg">Structured Note</h3>
              <div className="text-sm">
                <b>Mood:</b> {note.mood} • <b>Participation:</b> {note.participation} •{" "}
                <b>Prompts:</b> {note.promptsRequired}
              </div>
              <p className="leading-6">{note.summary}</p>
              {note.followUps?.length ? (
                <ul className="list-disc ml-6">
                  {note.followUps.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for missing compliance details */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Missing Compliance Details</DialogTitle>
          </DialogHeader>

          <p className="text-sm mb-3 text-gray-600">
            Please fill the missing details before generating the final note:
          </p>

          <div className="space-y-2">
            {missingFields.map((field) => (
              <div key={field}>
                <label className="text-sm font-medium capitalize">{field}</label>
                <Input
                  placeholder={`Enter ${field}`}
                  value={extraDetails[field] || ""}
                  onChange={(e) =>
                    setExtraDetails({ ...extraDetails, [field]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>

          <Button
            className="mt-4 bg-black text-white"
            onClick={handleModalSubmit}
            disabled={loading}
          >
            {loading ? "Generating..." : "Submit & Generate Structured Note"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}