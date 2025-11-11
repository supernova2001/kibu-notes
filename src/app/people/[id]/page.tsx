"use client";
import { useEffect, useState, useMemo, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@headlessui/react";
import pdfMake from "@/lib/pdfMakeClient";
import InsightsSection from "@/components/InsightsSection";
import NoteRecorder from "@/components/note-recorder";
import NoteEditor from "@/components/note-editor";
import QuickActions from "@/components/QuickActions";
import { useToast } from "@/components/ui/toast";
import ProgramSuggestionsPageSidebar from "@/components/ProgramSuggestionsPageSidebar";
import AdaptiveRecommendationsSidebar from "@/components/AdaptiveRecommendationsSidebar";
import NavBar from "@/components/NavBar";
import { Program } from "@/components/ProgramSuggestions";

export default function MemberNotesPage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [groupedNotes, setGroupedNotes] = useState<Record<string, any[]>>({});
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showInsights, setShowInsights] = useState(false);
  const todayKey = useMemo(() => new Date().toISOString().split("T")[0], []);
  // Per-note language selection
  const [noteLang, setNoteLang] = useState<Record<string, "en" | "es">>({});

  // Add Note modal states
  const [showAddNote, setShowAddNote] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [structuredNote, setStructuredNote] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Program suggestions state (shared with NoteEditor)
  const [suggestedPrograms, setSuggestedPrograms] = useState<Program[]>([]);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [currentNoteTime, setCurrentNoteTime] = useState<string | null>(null);
  const { toast } = useToast();

  // Cache summaries for all notes
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [allNotesForInsights, setAllNotesForInsights] = useState<any[]>([]);

  // Fetch member + grouped notes
  useEffect(() => {
    if (!id) return;
    const fetchMemberAndNotes = async () => {
      try {
        const [memberRes, notesRes] = await Promise.all([
          fetch(`/api/members`),
          fetch(`/api/members/${id}/notes`),
        ]);
        const members = await memberRes.json();
        const found = members.find((m: any) => m.id === id);
        setMember(found || null);

        const notesData = (await notesRes.json()) || {};
        // Ensure today's key exists so user can add today's note even if empty
        if (!notesData[todayKey]) {
          notesData[todayKey] = [];
        }
        setGroupedNotes(notesData);
        setSelectedDate(todayKey);

        // Flatten all notes for insights
        const allNotes = Object.values(notesData).flat() as any[];
        setAllNotesForInsights(allNotes);
      } catch (err) {
        console.error("Error fetching notes:", err);
      }
    };
    fetchMemberAndNotes();
  }, [id, todayKey]);

  // Fetch stored program recommendations for the member, filtered by selected date
  useEffect(() => {
    if (!id || !selectedDate) return; // Wait for selectedDate to be set
    
    const fetchStoredRecommendations = async () => {
      try {
        console.log(`[MemberNotesPage] Fetching stored recommendations for memberId: ${id}, date: ${selectedDate}`);
        setLoadingPrograms(true);
        
        // Calculate start and end of the selected date in UTC
        // selectedDate is in format "YYYY-MM-DD" (from the date selector)
        const selectedDateStr = selectedDate.split('T')[0]; // Get YYYY-MM-DD format
        const selectedDateObj = new Date(selectedDateStr + 'T00:00:00.000Z'); // Parse as UTC
        const startOfDay = new Date(selectedDateObj);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDateObj);
        endOfDay.setUTCHours(23, 59, 59, 999);
        
        // Get note IDs for the selected date to match recommendations by note_id
        const notesForDate = groupedNotes[selectedDate] || [];
        const noteIdsForDate = new Set(notesForDate.map((note: any) => note.id));
        
        console.log(`[MemberNotesPage] Date filter range:`, {
          selectedDate: selectedDateStr,
          startOfDay: startOfDay.toISOString(),
          endOfDay: endOfDay.toISOString(),
          notesForDateCount: notesForDate.length,
          noteIds: Array.from(noteIdsForDate),
        });

        // First, try to get recommendations for the selected date
        let response = await fetch(
          `/api/programs/recommendations?memberId=${id}&startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}&limit=100`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[MemberNotesPage] Failed to fetch date-filtered recommendations:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });
          // If date-filtered query fails, try without date filter as fallback
          response = await fetch(
            `/api/programs/recommendations?memberId=${id}&limit=50`
          );
          if (!response.ok) {
            console.error("[MemberNotesPage] Failed to fetch all recommendations");
            setSuggestedPrograms([]);
            setCurrentNoteTime(null);
            return;
          }
        }

        const data = await response.json();
        let programs: Program[] = data.programs || [];
        let recommendations = data.recommendations || [];
        
        console.log(`[MemberNotesPage] Raw API response:`, {
          recommendationsCount: recommendations.length,
          programsCount: programs.length,
          recommendations: recommendations.map((r: any) => ({
            id: r.id,
            session_date: r.session_date,
            note_id: r.note_id,
            sessionDateOnly: r.session_date ? new Date(r.session_date).toISOString().split('T')[0] : null,
          })),
        });
        
        // Filter recommendations to only include those from the selected date
        // This is a double-check since the API should have filtered, but we'll filter client-side too
        const dateFilteredRecommendations = recommendations.filter((rec: any) => {
          // Check if recommendation matches the selected date by session_date
          if (rec.session_date) {
            const recDate = new Date(rec.session_date).toISOString().split('T')[0];
            if (recDate === selectedDateStr) {
              console.log(`[MemberNotesPage] ✅ Recommendation ${rec.id} matches by session_date: ${recDate} === ${selectedDateStr}`);
              return true;
            }
          }
          
          // Also check if recommendation is linked to a note from the selected date
          if (rec.note_id && noteIdsForDate.has(rec.note_id)) {
            console.log(`[MemberNotesPage] ✅ Recommendation ${rec.id} matches by note_id: ${rec.note_id}`);
            return true;
          }
          
          console.log(`[MemberNotesPage] ❌ Recommendation ${rec.id} does not match date ${selectedDateStr}`, {
            session_date: rec.session_date,
            sessionDateOnly: rec.session_date ? new Date(rec.session_date).toISOString().split('T')[0] : null,
            note_id: rec.note_id,
            isNoteInDate: rec.note_id ? noteIdsForDate.has(rec.note_id) : false,
          });
          return false;
        });

        // Extract programs only from date-filtered recommendations
        if (dateFilteredRecommendations.length > 0) {
          const dateFilteredPrograms: Program[] = [];
          const programIdsSeen = new Set<string>();

          for (const rec of dateFilteredRecommendations) {
            if (rec.programs && Array.isArray(rec.programs)) {
              for (const program of rec.programs) {
                if (program && program.id && !programIdsSeen.has(program.id)) {
                  programIdsSeen.add(program.id);
                  const normalizedProgram: Program = {
                    id: program.id,
                    category: program.category || "Other",
                    name: program.name || "Unnamed Program",
                    description: program.description || "",
                    similarity: program.similarity ?? undefined,
                    link: program.link || `/programs/${program.id}`,
                    ...(program.lifeSkills && { lifeSkills: program.lifeSkills }),
                  };
                  dateFilteredPrograms.push(normalizedProgram);
                }
              }
            }
          }

          programs = dateFilteredPrograms;
          recommendations = dateFilteredRecommendations;
        } else {
          // No recommendations for this date
          console.log(`[MemberNotesPage] No recommendations match the selected date: ${selectedDate}`);
          setSuggestedPrograms([]);
          setCurrentNoteTime(null);
          return;
        }
        
        console.log(`[MemberNotesPage] API Response for date ${selectedDate}:`, {
          programsCount: programs.length,
          recommendationsCount: recommendations.length,
          recommendations: recommendations.map((r: any) => ({
            id: r.id,
            member_id: r.member_id,
            session_date: r.session_date,
            programsCount: Array.isArray(r.programs) ? r.programs.length : 0,
          })),
        });

        if (programs.length > 0) {
          // Get the most recent recommendation's session date for display
          const mostRecentRec = recommendations[0];
          const sessionDate = mostRecentRec?.session_date || new Date().toISOString();
          
          setSuggestedPrograms(programs);
          setCurrentNoteTime(sessionDate);
          console.log(`[MemberNotesPage] ✅ Successfully loaded ${programs.length} programs for date ${selectedDate}`);
        } else {
          // No programs found for this date
          console.log(`[MemberNotesPage] ⚠️ No programs found for date ${selectedDate}`);
          setSuggestedPrograms([]);
          setCurrentNoteTime(null);
        }
      } catch (error) {
        console.error("[MemberNotesPage] ❌ Exception fetching stored recommendations:", error);
        setSuggestedPrograms([]);
        setCurrentNoteTime(null);
      } finally {
        setLoadingPrograms(false);
      }
    };

    fetchStoredRecommendations();
  }, [id, selectedDate, groupedNotes]);

  const notesForSelectedDate = useMemo(
    () =>
      groupedNotes[selectedDate]?.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ) || [],
    [groupedNotes, selectedDate]
  );


  const allMedications = useMemo(() => {
    return notesForSelectedDate.flatMap(
      (n) => n.structured_json?.medications || []
    );
  }, [notesForSelectedDate]);

  // Fetch summaries progressively for each note (only if not already stored)
  useEffect(() => {
    if (!notesForSelectedDate.length) return;
    const fetchSummaries = async () => {
      for (const note of notesForSelectedDate) {
        if (summaries[note.id]) continue;
        const stored = note.structured_json?.soFarSummary;
        if (stored) {
          setSummaries((prev) => ({ ...prev, [note.id]: stored }));
          continue;
        }
        try {
          const res = await fetch(`/api/members/${id}/summary`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ timestamp: note.created_at }),
          });
          const data = await res.json();
          setSummaries((prev) => ({
            ...prev,
            [note.id]: data.summary || "No summary yet.",
          }));
        } catch (err) {
          console.error("Failed to fetch summary:", err);
        }
      }
    };
    fetchSummaries();
  }, [notesForSelectedDate, id]);

  // PDF export
  const downloadPDF = () => {
    if (!notesForSelectedDate.length) return;
    const reportTitle = `${member?.name || "Member"} – ${selectedDate}`;
    const generatedDate = new Date().toLocaleDateString();

    const content: any[] = [
      { text: reportTitle, style: "header" },
      { text: `Generated on: ${generatedDate}`, style: "subheader" },
    ];

    notesForSelectedDate.forEach((note) => {
      const structured = note.structured_json || {};
      const timeLabel = new Date(note.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      content.push({
        text: `${timeLabel} — ${structured.activityType || "Session"}`,
        style: "sessionHeader",
      });
      const summaryText =
        summaries[note.id] ||
        structured.summary ||
        note.raw_text ||
        "No summary available";
      content.push({ text: summaryText, margin: [0, 5, 0, 10] });
    });

    pdfMake
      .createPdf({
        pageSize: "A4",
        pageMargins: [40, 60, 40, 60],
        content,
        styles: {
          header: { fontSize: 18, bold: true },
          subheader: { fontSize: 12, color: "#555" },
          sessionHeader: { fontSize: 13, bold: true, margin: [0, 10, 0, 5] },
        },
      })
      .download(`${member?.name || "Member"}_${selectedDate}_Notes.pdf`);
  };

  return (
    <div className="relative min-h-screen">
      {/* Nav Bar */}
      <NavBar />
      
      {/* Main Content - adjusted for nav bar */}
      <div className="pt-20 pb-4">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-1" style={{ color: '#333333' }}>
            {member?.name || "Member"}'s Notes
          </h2>
          <p className="text-xs sm:text-sm" style={{ color: '#555555' }}>
            Organized by date and time — showing summaries up to each note's time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button
            onClick={() => setShowInsights(true)}
            className="text-sm text-white transition"
            style={{ backgroundColor: '#000000' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333333'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#000000'}
          >
            View Insights
          </Button>
          <Button 
            onClick={downloadPDF} 
            className="text-sm border transition"
            style={{ 
              backgroundColor: '#ffffff',
              color: '#333333',
              borderColor: '#e0e0e0'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f8ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
          >
            Download PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/people")}
            className="text-sm border transition"
            style={{ 
              backgroundColor: '#ffffff',
              color: '#333333',
              borderColor: '#e0e0e0'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f8ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
          >
            ← Back
          </Button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 sm:items-center">
        <label className="text-sm font-medium" style={{ color: '#333333' }}>
          Select Date:
        </label>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm max-w-xs"
          style={{ 
            borderColor: '#e0e0e0',
            backgroundColor: '#ffffff',
            color: '#333333'
          }}
        >
          {Object.keys(groupedNotes).map((date) => (
            <option key={date} value={date}>
              {new Date(date).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {/* Paired layout: each row contains the note (left) and its details (right) */}
      <h3 className="font-semibold mb-3 text-base sm:text-lg" style={{ color: '#333333' }}>
        Timeline for {new Date(selectedDate).toLocaleDateString()}
      </h3>

      {notesForSelectedDate.length === 0 ? (
        <p className="text-sm" style={{ color: '#555555' }}>No notes for this date.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 sm:gap-6 lg:gap-8">
          {notesForSelectedDate.map((n, i) => {
            const structured = n.structured_json || {};
            const timeLabel = new Date(n.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const meds = n.structured_json?.medications || [];
            const lang = noteLang[n.id] || "en";
            const summary =
              lang === "es"
                ? n.structured_json?.i18n?.soFarSummary?.es || n.structured_json?.soFarSummary || summaries[n.id] || "Generando resumen..."
                : n.structured_json?.soFarSummary || summaries[n.id] || "Generating summary...";
            return (
              <Fragment key={`row-${n.id || i}`}>
                <div key={`left-${i}`} className="lg:border-r lg:pr-4 pb-4 lg:pb-0 border-b lg:border-b-0" style={{ borderColor: '#e0e0e0' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs" style={{ color: '#555555' }}>{timeLabel}</p>
                  </div>
                  <div className="bg-white border rounded-lg p-3 shadow-sm h-full" style={{ borderColor: '#e0e0e0' }}>
                    <p className="text-sm font-medium mb-2" style={{ color: '#333333' }}>
                      {structured.activityType || "Session"}
                    </p>
                    <p className="text-xs leading-snug" style={{ color: '#333333' }}>
                      {lang === "es"
                        ? structured.i18n?.summary?.es || structured.summary || structured.i18n?.raw?.es || n.raw_text || "Sin resumen"
                        : structured.summary || structured.i18n?.raw?.en || n.raw_text || "No summary available"}
                    </p>
                  </div>
                </div>
                <div key={`right-${i}`} className="bg-white border rounded-lg p-3 shadow-sm" style={{ borderColor: '#e0e0e0' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs" style={{ color: '#555555' }}>{timeLabel}</div>
                    <select
                      className="border rounded-md px-2 py-1 text-xs"
                      style={{ 
                        borderColor: '#e0e0e0',
                        backgroundColor: '#ffffff',
                        color: '#333333'
                      }}
                      value={lang}
                      onChange={(e) =>
                        setNoteLang((prev) => ({ ...prev, [n.id]: e.target.value as any }))
                      }
                    >
                      <option value="en">EN</option>
                      <option value="es">ES</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm font-semibold" style={{ color: '#333333' }}>{lang === "es" ? "Medicamentos" : "Medications"}</p>
                    {meds.length > 0 ? (
                      <ul className="mt-1 space-y-1">
                        {meds.map((m: any, idx: number) => (
                          <li key={idx} className="text-xs" style={{ color: '#333333' }}>
                            <strong>{m.name}</strong> — {m.dose || "–"}{" "}
                            {m.route ? `(${m.route})` : ""}{" "}
                            {m.time ? `at ${m.time}` : ""}{" "}
                            {m.status ? `[${m.status}]` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs" style={{ color: '#555555' }}>{lang === "es" ? "No hay medicamentos registrados." : "No medications recorded."}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#333333' }}>{lang === "es" ? "Resumen hasta ahora" : "Summary so far"}</p>
                    <p className="text-xs leading-relaxed mt-1" style={{ color: '#333333' }}>{summary}</p>
                  </div>
                  <QuickActions note={n} />
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Add Note Button */}
      <div className="mt-6 max-w-full sm:max-w-xs">
        <Button
          onClick={() => setShowAddNote(true)}
          disabled={selectedDate !== todayKey}
          className="w-full text-white transition"
          style={{ 
            backgroundColor: selectedDate !== todayKey ? '#cccccc' : '#000000'
          }}
          onMouseEnter={(e) => {
            if (selectedDate === todayKey) {
              e.currentTarget.style.backgroundColor = '#333333';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedDate === todayKey) {
              e.currentTarget.style.backgroundColor = '#000000';
            }
          }}
        >
          + Add Note
        </Button>
        {selectedDate !== todayKey && (
          <p className="text-xs mt-2" style={{ color: '#555555' }}>Adding notes is available only for today.</p>
        )}
      </div>

      {/* Add Note Modal */}
      <Dialog
        open={showAddNote}
        onClose={() => {
          setShowAddNote(false);
          setTranscript("");
          setStructuredNote(null);
        }}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
          <div className="relative w-full max-w-6xl max-h-[90vh] flex bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Main Content */}
            <Dialog.Panel className="bg-white w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto flex-1">
              <Dialog.Title className="text-lg font-semibold mb-4" style={{ color: '#333333' }}>
                Add New Note
              </Dialog.Title>

              <div className="space-y-6">
                <NoteRecorder onTranscript={setTranscript} />
                <NoteEditor
                  transcript={transcript}
                  memberId={id as string}
                  memberName={member?.name}
                  onProgramsLoaded={(programs, noteTime) => {
                    setSuggestedPrograms(programs);
                    setCurrentNoteTime(noteTime);
                  }}
                  onProgramsLoadingChange={setLoadingPrograms}
                  selectedProgramIds={selectedProgramIds}
                  onProgramSelectionChange={setSelectedProgramIds}
                />
              </div>

            {/* Footer Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6 pt-4 border-t" style={{ borderColor: '#e0e0e0' }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddNote(false);
                  setTranscript("");
                  setStructuredNote(null);
                }}
                className="w-full sm:w-auto border transition"
                style={{ 
                  backgroundColor: '#ffffff',
                  color: '#333333',
                  borderColor: '#e0e0e0'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f8ff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setIsSaving(true);
                    // Refresh notes (the /api/notes call inside NoteEditor already persisted)
                    const notesRes = await fetch(`/api/members/${id}/notes`);
                    const updated = await notesRes.json();
                    setGroupedNotes(updated || {});
                    
                    // Refresh stored program recommendations to include any newly saved ones
                    try {
                      const startOfDay = new Date(todayKey);
                      startOfDay.setHours(0, 0, 0, 0);
                      const endOfDay = new Date(todayKey);
                      endOfDay.setHours(23, 59, 59, 999);
                      
                      const recRes = await fetch(
                        `/api/programs/recommendations?memberId=${id}&startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}&limit=100`
                      );
                      if (recRes.ok) {
                        const recData = await recRes.json();
                        const programs: Program[] = recData.programs || [];
                        if (programs.length > 0) {
                          const mostRecentRec = recData.recommendations?.[0];
                          const sessionDate = mostRecentRec?.session_date || new Date().toISOString();
                          setSuggestedPrograms(programs);
                          setCurrentNoteTime(sessionDate);
                        }
                      }
                    } catch (recErr) {
                      console.error("Failed to refresh recommendations:", recErr);
                      // Don't fail the whole operation if recommendations refresh fails
                    }
                    
                    toast({
                      title: "Notes updated",
                      description: "The latest note and summaries have been loaded.",
                      variant: "success",
                    });
                  } catch (err) {
                    console.error("Refresh failed:", err);
                    toast({ title: "Refresh failed", description: "Could not load updated notes.", variant: "error" });
                  } finally {
                    setIsSaving(false);
                    setShowAddNote(false);
                    setTranscript("");
                    setStructuredNote(null);
                    // Sidebar will show programs loaded from database
                  }
                }}
                className="w-full sm:w-auto text-white transition"
                style={{ backgroundColor: '#000000' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333333'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#000000'}
              >
                {isSaving ? "Updating..." : "Done"}
              </Button>
            </div>
            </Dialog.Panel>
            
          </div>
        </div>
      </Dialog>

      {/* Insights Modal */}
      <Dialog
        open={showInsights}
        onClose={() => setShowInsights(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="relative w-full max-w-7xl h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
            <Dialog.Panel className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b flex-shrink-0" style={{ borderColor: '#e0e0e0' }}>
                <Dialog.Title className="text-xl font-semibold" style={{ color: '#333333' }}>
                  Performance Insights - {member?.name || "Member"}
                </Dialog.Title>
                <button
                  onClick={() => setShowInsights(false)}
                  className="p-2 rounded transition-colors"
                  style={{ color: '#333333' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f8ff'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#333333' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 pb-8">
                <InsightsSection notes={allNotesForInsights} />
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
      </div>
      </div>

      {/* Adaptive Recommendations Sidebar - Left side (below nav bar) */}
      {id && (
        <AdaptiveRecommendationsSidebar
          memberId={id as string}
          onProgramsLoaded={(programs) => {
            // Optionally merge with date-based recommendations
            // For now, adaptive recommendations are shown separately
          }}
        />
      )}

      {/* Program Suggestions Sidebar - Right side (Day wise suggestions) */}
      <ProgramSuggestionsPageSidebar
        programs={suggestedPrograms}
        selectedIds={selectedProgramIds}
        onSelectionChange={setSelectedProgramIds}
        loading={loadingPrograms}
        noteTime={currentNoteTime || undefined}
      />
    </div>
  );
}