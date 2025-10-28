"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square } from "lucide-react";

export default function NoteRecorder({ onTranscript }: { onTranscript: (t: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");

  const recRef = useRef<any>(null);

  useEffect(() => {
    const w:any = window;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (SR) {
      recRef.current = new SR();
      recRef.current.lang = "en-US";
      recRef.current.continuous = true;
      recRef.current.interimResults = true;
      recRef.current.onresult = (e:any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) setText(prev => prev + " " + t);
          else interim += t;
        }
      };
      setSupported(true);
    }
  }, []);

  const start = () => { if (!recRef.current) return; recRef.current.start(); setListening(true); };
  const stop = () => { if (!recRef.current) return; recRef.current.stop(); setListening(false); onTranscript(text.trim()); };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button onClick={start} disabled={!supported || listening}><Mic className="mr-2 h-4 w-4" />Record</Button>
        <Button onClick={stop} variant="destructive" disabled={!listening}><Square className="mr-2 h-4 w-4" />Stop</Button>
      </div>
      <Textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Or type notes here..." />
    </div>
  );
}