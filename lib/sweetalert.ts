export type SwalType = typeof import("sweetalert2")["default"];

export function getSwal(): SwalType | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Swal?: SwalType };
  return w.Swal ?? null;
}
tsx
Copy code
