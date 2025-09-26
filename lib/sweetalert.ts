// lib/sweetalert.ts
// Access SweetAlert2 loaded from CDN in app/layout.tsx
export type SwalType = typeof import("sweetalert2")["default"];

export function getSwal(): SwalType | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Swal?: SwalType };
  return w.Swal ?? null;
}
