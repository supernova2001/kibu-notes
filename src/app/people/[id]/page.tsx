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
  const { toast } = useToast();

  // Cache summaries for all notes
  const [summaries, setSummaries] = useState<Record<string, string>>({});

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
      } catch (err) {
        console.error("Error fetching notes:", err);
      }
    };
    fetchMemberAndNotes();
  }, [id, todayKey]);

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
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold mb-1">
            {member?.name || "Member"}'s Notes
          </h2>
          <p className="text-sm text-gray-500">
            Organized by date and time — showing summaries up to each note’s time.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowInsights(true)}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            View Insights
          </Button>
          <Button onClick={downloadPDF}>Download PDF</Button>
          <Button
            variant="outline"
            onClick={() => router.push("/people")}
            className="text-sm"
          >
            ← Back
          </Button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex gap-3 mb-6 items-center">
        <label className="text-sm font-medium text-gray-700 mt-2">
          Select Date:
        </label>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          {Object.keys(groupedNotes).map((date) => (
            <option key={date} value={date}>
              {new Date(date).toLocaleDateString()}
            </option>
          ))}
        </select>

      </div>

      {/* Paired layout: each row contains the note (left) and its details (right) */}
      <h3 className="font-semibold mb-3 text-gray-800">
        Timeline for {new Date(selectedDate).toLocaleDateString()}
      </h3>

      {notesForSelectedDate.length === 0 ? (
        <p className="text-sm text-gray-500">No notes for this date.</p>
      ) : (
        <div className="grid grid-cols-[320px_1fr] gap-8">
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
                <div key={`left-${i}`} className="border-r pr-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">{timeLabel}</p>
                  </div>
                  <div className="bg-white border rounded-lg p-3 shadow-sm h-full">
                    <p className="text-sm font-medium text-gray-800 mb-2">
                      {structured.activityType || "Session"}
                    </p>
                    <p className="text-xs text-gray-600 leading-snug">
                      {lang === "es"
                        ? structured.i18n?.summary?.es || structured.summary || structured.i18n?.raw?.es || n.raw_text || "Sin resumen"
                        : structured.summary || structured.i18n?.raw?.en || n.raw_text || "No summary available"}
                    </p>
                  </div>
                </div>
                <div key={`right-${i}`} className="bg-white border rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500">{timeLabel}</div>
                    <select
                      className="border rounded-md px-2 py-1 text-xs"
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
                    <p className="text-sm font-semibold text-gray-800">{lang === "es" ? "Medicamentos" : "Medications"}</p>
                    {meds.length > 0 ? (
                      <ul className="mt-1 space-y-1">
                        {meds.map((m: any, idx: number) => (
                          <li key={idx} className="text-xs text-gray-700">
                            <strong>{m.name}</strong> — {m.dose || "–"}{" "}
                            {m.route ? `(${m.route})` : ""}{" "}
                            {m.time ? `at ${m.time}` : ""}{" "}
                            {m.status ? `[${m.status}]` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500">{lang === "es" ? "No hay medicamentos registrados." : "No medications recorded."}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{lang === "es" ? "Resumen hasta ahora" : "Summary so far"}</p>
                    <p className="text-xs text-gray-700 leading-relaxed mt-1">{summary}</p>
                  </div>
                  <QuickActions note={n} />
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Add Note Button */}
      <div className="mt-6" style={{ maxWidth: 320 }}>
        <Button
          onClick={() => setShowAddNote(true)}
          disabled={selectedDate !== todayKey}
          className="w-full bg-green-600 text-white hover:bg-green-700"
        >
          + Add Note
        </Button>
        {selectedDate !== todayKey && (
          <p className="text-xs text-gray-500 mt-2">Adding notes is available only for today.</p>
        )}
      </div>

      {/* Add Note Modal */}
      <Dialog
        open={showAddNote}
        onClose={() => setShowAddNote(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-semibold mb-4">
              Add New Note
            </Dialog.Title>

            <div className="space-y-6">
              <NoteRecorder onTranscript={setTranscript} />
              <NoteEditor
                transcript={transcript}
                memberId={id as string}
                memberName={member?.name}
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddNote(false);
                  setTranscript("");
                  setStructuredNote(null);
                }}
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
                  }
                }}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {isSaving ? "Updating..." : "Done"}
              </Button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}