import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transcribeVoiceNote } from "@/lib/ai-extra.functions";
import { cleanRawText } from "@/lib/extract-text";
import { getUserApiKey } from "@/lib/ai-config";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read failed"));
    r.onload = () => {
      const s = String(r.result);
      resolve(s.slice(s.indexOf(",") + 1));
    };
    r.readAsDataURL(blob);
  });
}

/**
 * Records a spoken study note, transcribes it with Gemini, then runs it through
 * the same cleanup pipeline used for uploaded files.
 */
export function VoiceNoteButton({
  onNote,
  disabled,
}: {
  onNote: (text: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "recording" | "working">("idle");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 2048) {
          setState("idle");
          setError("That recording was empty — please try again.");
          return;
        }
        setState("working");
        try {
          const data = await blobToBase64(blob);
          const res = await transcribeVoiceNote({
            data: {
              data,
              mimeType: (rec.mimeType || "audio/webm").split(";")[0]!,
              apiKey: getUserApiKey(),
            },
          });
          if (!res.ok) {
            setError(res.message ?? "Couldn't transcribe that recording.");
            return;
          }
          const raw = res.text.trim();
          if (!raw || raw === "NO_TEXT_FOUND") {
            setError("We couldn't hear any speech in that recording.");
            return;
          }
          const cleaned = await cleanRawText(raw, getUserApiKey());
          await onNote(cleaned);
        } catch (e) {
          console.error(e);
          setError("Something went wrong while saving that voice note.");
        } finally {
          setState("idle");
          setSeconds(0);
        }
      };
      rec.start();
      recRef.current = rec;
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("We need microphone access to record a voice note.");
    }
  }

  function stop() {
    recRef.current?.stop();
    recRef.current = null;
  }

  return (
    <div>
      <Button
        variant="outline"
        size="lg"
        disabled={disabled || state === "working"}
        onClick={state === "recording" ? stop : start}
        className="w-full rounded-2xl py-6 text-base font-bold"
      >
        {state === "working" ? (
          <>
            <Loader2 size={20} className="animate-spin" /> Transcribing &amp; cleaning…
          </>
        ) : state === "recording" ? (
          <>
            <Square size={18} className="text-destructive" /> Stop recording (
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")})
          </>
        ) : (
          <>
            <Mic size={20} /> Record a voice note
          </>
        )}
      </Button>
      {error ? <p className="mt-2 text-xs font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}
