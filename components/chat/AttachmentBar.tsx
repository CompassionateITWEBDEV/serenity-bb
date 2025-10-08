"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, Mic, Square, Loader2 } from "lucide-react";
import { uploadToStorage, sendAttachmentMessage } from "@/lib/chat_upload";
import { Button } from "@/components/ui/button";

type Props = {
  conversationId: string;
  senderRole: "patient" | "doctor" | "nurse" | "counselor";
  userId?: string | null;
  onSent?: () => void;
};

export default function AttachmentBar({ conversationId, senderRole, userId, onSent }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState<null | "image" | "camera" | "audio">(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const chunksRef = useRef<BlobPart[]>([]);

  // IMAGE: file picker
  const handlePickImage = () => imageInputRef.current?.click();
  const onImagePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy("image");
    try {
      const { publicUrl } = await uploadToStorage(f, { conversationId, kind: "image", userId: userId ?? undefined });
      await sendAttachmentMessage({ conversationId, senderRole, url: publicUrl, kind: "image" });
      onSent?.();
    } catch (err) {
      console.error(err);
      alert("Failed to send image.");
    } finally {
      setBusy(null);
      e.target.value = "";
    }
  };

  // CAMERA: capture (mobile-friendly)
  const handleOpenCamera = () => cameraInputRef.current?.click();
  const onCameraCaptured = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy("camera");
    try {
      const { publicUrl } = await uploadToStorage(f, { conversationId, kind: "image", userId: userId ?? undefined });
      await sendAttachmentMessage({ conversationId, senderRole, url: publicUrl, kind: "image" });
      onSent?.();
    } catch (err) {
      console.error(err);
      alert("Failed to send photo.");
    } finally {
      setBusy(null);
      e.target.value = "";
    }
  };

  // VOICE: MediaRecorder
  const startRecording = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data?.size) chunksRef.current.push(ev.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setBusy("audio");
        try {
          const { publicUrl } = await uploadToStorage(blob, { conversationId, kind: "audio", userId: userId ?? undefined });
          await sendAttachmentMessage({ conversationId, senderRole, url: publicUrl, kind: "audio" });
          onSent?.();
        } catch (err) {
          console.error(err);
          alert("Failed to send voice message.");
        } finally {
          setBusy(null);
          setRecorder(null);
          setRecording(false);
          // stop all tracks to release mic
          stream.getTracks().forEach((t) => t.stop());
        }
      };
      rec.start();
      setRecorder(rec);
      setRecording(true);
    } catch (err) {
      console.error(err);
      alert("Microphone permission denied or unsupported.");
    }
  };

  const stopRecording = () => {
    if (!recorder) return;
    recorder.stop();
  };

  // cleanup if component unmounts while recording
  useEffect(() => {
    return () => {
      try { recorder?.state === "recording" && recorder.stop(); } catch {}
    };
  }, [recorder]);

  return (
    <div className="flex items-center gap-2">
      {/* Image picker */}
      <Button type="button" size="icon" variant="ghost" disabled={!!busy} onClick={handlePickImage} title="Upload image">
        {busy === "image" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
      </Button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImagePicked}
      />

      {/* Camera capture (mobile) */}
      <Button type="button" size="icon" variant="ghost" disabled={!!busy} onClick={handleOpenCamera} title="Take a photo">
        {busy === "camera" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      </Button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onCameraCaptured}
      />

      {/* Voice message */}
      {!recording ? (
        <Button type="button" size="icon" variant="ghost" disabled={!!busy} onClick={startRecording} title="Record voice">
          <Mic className="h-4 w-4" />
        </Button>
      ) : (
        <Button type="button" size="icon" variant="destructive" onClick={stopRecording} title="Stop recording">
          <Square className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
