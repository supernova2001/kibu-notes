import NoteRecorder from "@/components/note-recorder";
import Client from "./client";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Kibu – Voice + Smart Note Companion (Prototype)</h1>
      <Client />
    </main>
  );
}