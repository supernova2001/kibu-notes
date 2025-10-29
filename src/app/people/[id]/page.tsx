"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@headlessui/react";
import pdfMake from "@/lib/pdfMakeClient";
import InsightsSection from "@/components/InsightsSection";
import NoteRecorder from "@/components/note-recorder";
import NoteEditor from "@/components/note-editor";

export default function MemberNotesPage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [groupedNotes, setGroupedNotes] = useState<Record<string, any[]>>({});
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showInsights, setShowInsights] = useState(false);

  // Add Note modal states
  const [showAddNote, setShowAddNote] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [structuredNote, setStructuredNote] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cache summaries and selected note
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

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

        const notesData = await notesRes.json();
        setGroupedNotes(notesData || {});
        const dates = Object.keys(notesData || {});
        if (dates.length > 0) setSelectedDate(dates[0]);
      } catch (err) {
        console.error("Error fetching notes:", err);
      }
    };
    fetchMemberAndNotes();
  }, [id]);

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

  // Fetch summaries progressively for each note
  useEffect(() => {
    if (!notesForSelectedDate.length) return;
    const fetchSummaries = async () => {
      for (const note of notesForSelectedDate) {
        if (summaries[note.id]) continue;
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

  // Get currently selected summary
  const selectedSummary = selectedNoteId ? summaries[selectedNoteId] : "";

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
      <div className="flex gap-3 mb-6">
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

      {/* Layout */}
      <div className="grid grid-cols-[320px_1fr] gap-8">
        {/* Left: Timeline */}
        <div className="border-r pr-4">
          <h3 className="font-semibold mb-3 text-gray-800">
            Timeline for {new Date(selectedDate).toLocaleDateString()}
          </h3>
          {notesForSelectedDate.length === 0 ? (
            <p className="text-sm text-gray-500">No notes for this date.</p>
          ) : (
            notesForSelectedDate.map((n, i) => {
              const structured = n.structured_json || {};
              const timeLabel = new Date(n.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const isActive = selectedNoteId === n.id;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedNoteId(n.id)}
                  className={`mb-4 cursor-pointer transition-all ${
                    isActive ? "ring-2 ring-indigo-500 rounded-md" : ""
                  }`}
                >
                  <p className="text-xs text-gray-500 mb-1">{timeLabel}</p>
                  <div className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md">
                    <p className="text-sm font-medium text-gray-800">
                      {structured.activityType || "Session"}
                    </p>
                    <p className="text-xs text-gray-600 leading-snug mt-1">
                      {structured.summary ||
                        n.raw_text ||
                        "No summary available"}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {/* Add Note Button */}
          <div className="mt-6">
            <Button
              onClick={() => setShowAddNote(true)}
              className="w-full bg-green-600 text-white hover:bg-green-700"
            >
              + Add Note
            </Button>
          </div>
        </div>

        {/* Right: Medications + Dynamic Summary */}
        <div>
          <h3 className="font-semibold mb-2 text-gray-800">
            Medications Given Today
          </h3>
          {allMedications.length > 0 ? (
            <ul className="space-y-2 mb-6">
              {allMedications.map((m, i) => (
                <li
                  key={i}
                  className="p-2 bg-gray-50 border rounded-md text-sm text-gray-700"
                >
                  <strong>{m.name}</strong> — {m.dose || "–"}{" "}
                  {m.route ? `(${m.route})` : ""}{" "}
                  {m.time ? `at ${m.time}` : ""}{" "}
                  {m.status ? `[${m.status}]` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 mb-6">No medications recorded.</p>
          )}

          {selectedNoteId && (
            <div className="mt-8">
              <h3 className="font-semibold mb-2 text-gray-800">
                Summary so far
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {selectedSummary || "Generating summary..."}
              </p>
            </div>
          )}
        </div>
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
                onStructuredNote={setStructuredNote}
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
                disabled={!structuredNote || isSaving}
                onClick={async () => {
                  try {
                    setIsSaving(true);
                    const saveRes = await fetch("/api/notes/save", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        member_id: member?.id,
                        session_date: new Date().toISOString(),
                        raw_text: transcript,
                        structured_json: structuredNote,
                      }),
                    });

                    if (!saveRes.ok) throw new Error("Failed to save note");

                    // Refresh and regenerate summaries
                    const notesRes = await fetch(`/api/members/${id}/notes`);
                    const updated = await notesRes.json();
                    setGroupedNotes(updated || {});
                  } catch (err) {
                    console.error("Save failed:", err);
                    alert("Error saving note");
                  } finally {
                    setIsSaving(false);
                    setShowAddNote(false);
                    setTranscript("");
                    setStructuredNote(null);
                  }
                }}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}