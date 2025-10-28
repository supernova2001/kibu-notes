"use client";
import { useState } from "react";
import NoteRecorder from "@/components/note-recorder";
import NoteEditor from "@/components/note-editor";

export default function Client() {
  const [transcript, setTranscript] = useState("");
  return (
    <div className="space-y-6">
      <NoteRecorder onTranscript={setTranscript} />
      <NoteEditor transcript={transcript} />
    </div>
  );
}