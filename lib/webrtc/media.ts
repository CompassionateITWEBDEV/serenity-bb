export type MediaAcquireOptions = {
  audioDeviceId?: string | null;
  videoDeviceId?: string | null;
  audio?: boolean; // default true
  video?: boolean; // default true
  facingMode?: "user" | "environment"; // mobile hint
};

export type MediaAcquireResult = {
  stream: MediaStream;
  audioDevice?: MediaDeviceInfo | null;
  videoDevice?: MediaDeviceInfo | null;
};

export type MediaAcquireErrorCode =
  | "UNSUPPORTED"
  | "INSECURE_CONTEXT"
  | "PERMISSION_BLOCKED"
  | "DEVICE_NOT_FOUND"
  | "DEVICE_IN_USE"
  | "OS_PRIVACY_BLOCK"
  | "HARDWARE_ERROR"
  | "UNKNOWN";

export class MediaAcquireError extends Error {
  code: MediaAcquireErrorCode;
  detail?: unknown;
  constructor(code: MediaAcquireErrorCode, message: string, detail?: unknown) {
    super(message);
    this.name = "MediaAcquireError";
    this.code = code;
    this.detail = detail;
  }
}

function ensureAPIs() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    throw new MediaAcquireError(
      "UNSUPPORTED",
      "This browser does not support camera/microphone."
    );
  }
  if (!isSecureContext) {
    // Why: getUserMedia requires HTTPS (except localhost)
    throw new MediaAcquireError(
      "INSECURE_CONTEXT",
      "Camera/microphone require HTTPS."
    );
  }
}

async function queryPermissions() {
  const status: Record<string, PermissionState | "unavailable"> = {
    camera: "unavailable",
    microphone: "unavailable",
  };
  // Why: Permissions API can be unsupported; handle softly.
  const p = (navigator as any).permissions?.query?.bind(
    (navigator as any).permissions
  );
  if (!p) return status;

  try {
    const [cam, mic] = await Promise.allSettled([
      p({ name: "camera" as PermissionName }),
      p({ name: "microphone" as PermissionName }),
    ]);
    if (cam.status === "fulfilled") status.camera = cam.value.state;
    if (mic.status === "fulfilled") status.microphone = mic.value.state;
  } catch {
    // ignore
  }
  return status;
}

async function enumerate(kind?: MediaDeviceKind) {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return kind ? devices.filter((d) => d.kind === kind) : devices;
}

function pickConstraint(
  deviceId?: string | null
): MediaTrackConstraintSet | boolean {
  if (!deviceId) return true;
  // Why: use "ideal" to allow fallback if device disappeared.
  return { deviceId: { ideal: deviceId } };
}

function relaxVideoConstraints(
  opts: MediaAcquireOptions
): MediaStreamConstraints[] {
  const base: MediaTrackConstraints =
    opts.facingMode ? { facingMode: { ideal: opts.facingMode } } : {};
  return [
    { audio: !!opts.audio, video: { ...base, width: { ideal: 1280 } } },
    { audio: !!opts.audio, video: { ...base, width: { ideal: 640 } } },
    { audio: !!opts.audio, video: true },
  ];
}

function normalizeError(err: unknown): MediaAcquireError {
  const name = (err as any)?.name || "";
  const msg = (err as any)?.message || "Unknown getUserMedia error";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return new MediaAcquireError(
      "PERMISSION_BLOCKED",
      "Permission denied for camera/microphone.",
      err
    );
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return new MediaAcquireError(
      "DEVICE_NOT_FOUND",
      "Requested device not found.",
      err
    );
  }
  if (name === "NotReadableError") {
    return new MediaAcquireError(
      "DEVICE_IN_USE",
      "Device is in use by another app or OS blocked access.",
      err
    );
  }
  if (name === "AbortError") {
    return new MediaAcquireError(
      "HARDWARE_ERROR",
      "Hardware error while starting media.",
      err
    );
  }
  return new MediaAcquireError("UNKNOWN", msg, err);
}

export async function acquireLocalMedia(
  opts: MediaAcquireOptions = {}
): Promise<MediaAcquireResult> {
  ensureAPIs();

  const wantAudio = opts.audio !== false;
  const wantVideo = opts.video !== false;

  const perms = await queryPermissions();
  if (
    (wantAudio && perms.microphone === "denied") ||
    (wantVideo && perms.camera === "denied")
  ) {
    throw new MediaAcquireError(
      "PERMISSION_BLOCKED",
      "Camera/Microphone permission denied in browser."
    );
  }

  // Validate supplied deviceIds against current list.
  const devices = await enumerate();
  const audioDevices = devices.filter((d) => d.kind === "audioinput");
  const videoDevices = devices.filter((d) => d.kind === "videoinput");

  const audioIdOk =
    !opts.audioDeviceId ||
    audioDevices.some((d) => d.deviceId === opts.audioDeviceId);
  const videoIdOk =
    !opts.videoDeviceId ||
    videoDevices.some((d) => d.deviceId === opts.videoDeviceId);

  const audioConstraint = wantAudio
    ? pickConstraint(audioIdOk ? opts.audioDeviceId : null)
    : false;
  const videoConstraint = wantVideo
    ? pickConstraint(videoIdOk ? opts.videoDeviceId : null)
    : false;

  // 1) Try with given/ideal deviceIds
  const attempts: MediaStreamConstraints[] = [];
  attempts.push({ audio: audioConstraint, video: videoConstraint });

  // 2) Relax video if it fails (common on mobile / constrained envs)
  if (wantVideo) attempts.push(...relaxVideoConstraints(opts));

  // 3) Ultimate fallback: turn off video/audio progressively
  if (wantVideo) attempts.push({ audio: audioConstraint, video: true });
  if (wantAudio) attempts.push({ audio: true, video: videoConstraint });
  attempts.push({ audio: wantAudio, video: wantVideo });

  let lastErr: unknown = null;
  for (const c of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(c);
      // Resolve actual devices used.
      const tracks = stream.getTracks();
      const audioTrack = tracks.find((t) => t.kind === "audio");
      const videoTrack = tracks.find((t) => t.kind === "video");

      const pick = (track?: MediaStreamTrack) => {
        if (!track) return null;
        const s = devices.find(
          (d) =>
            (d as any).deviceId === (track.getSettings().deviceId || "default")
        );
        return (s as MediaDeviceInfo) || null;
      };

      return {
        stream,
        audioDevice: pick(audioTrack),
        videoDevice: pick(videoTrack),
      };
    } catch (e) {
      lastErr = e;
      // continue to next relaxed constraint
    }
  }

  throw normalizeError(lastErr);
}

// Re-validate cached selections when devices change (e.g., USB cam unplugged)
export function onDeviceChange(handler: () => void) {
  navigator.mediaDevices?.addEventListener?.("devicechange", handler);
}

export async function listMediaDevices() {
  ensureAPIs();
  // Labels available after first permission grant
  const devices = await enumerate();
  return {
    audioInputs: devices.filter((d) => d.kind === "audioinput"),
    videoInputs: devices.filter((d) => d.kind === "videoinput"),
    audioOutputs: devices.filter((d) => d.kind === "audiooutput"),
  };
}
