"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StructuredNoteType } from "@/lib/schemas";

export default function NoteEditor({ transcript }: { transcript: string }) {
  const [memberName, setMemberName] = useState("");
  const [activityType, setActivityType] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<StructuredNoteType | null>(null);
  const [freeText, setFreeText] = useState(transcript);

  const submit = async () => {
    setLoading(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        memberName,
        activityType,
        sessionDate: new Date(sessionDate).toISOString(),
        freeText,
        language: "en"
      })
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setNote(data);
    else alert("Error: " + (data.error || "LLM failure"));
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Member name" value={memberName} onChange={e=>setMemberName(e.target.value)} />
          <Input placeholder="Activity (e.g., Yoga)" value={activityType} onChange={e=>setActivityType(e.target.value)} />
          <Input type="date" value={sessionDate} onChange={e=>setSessionDate(e.target.value)} />
        </div>

        <textarea
          className="w-full rounded-md border p-2 min-h-[120px]"
          value={freeText}
          onChange={e=>setFreeText(e.target.value)}
          placeholder="Transcript or typed notes"
        />

        <Button onClick={submit} disabled={loading}>{loading ? "Generating..." : "Generate Structured Note"}</Button>

        {note && (
          <div className="space-y-2 border-t pt-4">
            <h3 className="font-semibold">Preview</h3>
            <div className="text-sm"><b>Mood:</b> {note.mood} • <b>Participation:</b> {note.participation} • <b>Prompts:</b> {note.promptsRequired}</div>
            <p className="leading-6">{note.summary}</p>
            {note.followUps?.length ? (
              <ul className="list-disc ml-6">
                {note.followUps.map((f,i)=> <li key={i}>{f}</li>)}
              </ul>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}