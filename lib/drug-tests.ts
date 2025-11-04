import type { PostgrestError } from "@supabase/supabase-js";
import { supabase, getAccessToken } from "@/lib/supabase-browser";

export type TestStatus = "pending" | "completed" | "missed";

export type DrugTest = {
  id: string;
  status: TestStatus;
  scheduledFor: string | null; // ISO
  createdAt: string; // ISO
  patientId: string;
  patient: { id: string; name: string; email?: string | null };
};

type ListOptions = { q?: string; status?: TestStatus };

function mapRow(row: any): DrugTest {
  const p =
    row.patients ??
    row.patient ?? {
      user_id: row.patient_id,
      full_name: null,
      first_name: null,
      last_name: null,
      email: null,
    };

  const name =
    p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ||
    "Unknown";

  return {
    id: row.id,
    status: row.status as TestStatus,
    scheduledFor: row.scheduled_for,
    createdAt: row.created_at,
    patientId: row.patient_id,
    patient: { id: p.user_id, name, email: p.email ?? null },
  };
}

export async function listDrugTests(opts: ListOptions): Promise<DrugTest[]> {
  const sel = `
    id, status, scheduled_for, created_at, patient_id,
    patients:patient_id ( user_id, full_name, first_name, last_name, email )
  `;
  const { data, error } = await supabase
    .from("drug_tests")
    .select(sel)
    .order("created_at", { ascending: false });

  if (error) throw pgErr(error);

  let items = (data ?? []).map(mapRow);

  if (opts.status) items = items.filter((t) => t.status === opts.status);
  if (opts.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    items = items.filter(
      (t) =>
        t.patient.name.toLowerCase().includes(q) ||
        (t.patient.email ?? "").toLowerCase().includes(q)
    );
  }
  return items;
}

export function subscribeDrugTests(onChange: () => void): () => void {
  const ch = supabase
    .channel("realtime:drug_tests")
    .on("postgres_changes", { event: "*", schema: "public", table: "drug_tests" }, onChange)
    .subscribe();

  return () => {
    try { supabase.removeChannel(ch); } catch { /* no-op */ }
  };
}

/** Create a test – now surfaces server x-debug to SweetAlert. */
export async function createDrugTest(args: { 
  patientId: string; 
  scheduledFor: string | null;
  testType?: string; // e.g., "urine", "saliva", "hair", "blood"
}): Promise<DrugTest> {
  const token = await getAccessToken();
  if (!token) {
    const err: any = new Error("Not signed in");
    err.status = 401;
    throw err;
  }

  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const res = await fetch("/api/drug-tests", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patientId: args.patientId,
        scheduledFor: args.scheduledFor,
        testType: args.testType || "urine", // Default to urine if not specified
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    const debug = res.headers.get("x-debug");
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const e: any = new Error(json?.error ?? `Request failed (${res.status})`);
      e.status = res.status;
      e.debug = debug ?? null;
      // Include detailed error information if available
      if (json?.details) {
        e.details = json.details;
      }
      if (json?.hint) {
        e.hint = json.hint;
      }
      // Helpful textual message for SweetAlert
      e.message = `${json?.error ?? "HTTP " + res.status}${debug ? ` [${debug}]` : ""}`;
      if (json?.details) {
        e.message += `\n\n${json.details}`;
      }
      throw e;
    }

    return mapRow(json.data);
  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    
    // Handle timeout/abort errors
    if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
      const e: any = new Error("Request timeout: The server took too long to respond. Please try again.");
      e.status = 408;
      e.debug = "timeout";
      throw e;
    }
    
    // Handle network errors
    const errorMsg = fetchError?.message || String(fetchError) || 'Unknown network error';
    const isConnectionError = errorMsg.includes('Failed to fetch') || 
                               errorMsg.includes('NetworkError') || 
                               errorMsg.includes('ERR_') ||
                               errorMsg.includes('ERR_CONNECTION_REFUSED') ||
                               errorMsg.includes('ECONNREFUSED') ||
                               errorMsg.includes('ENOTFOUND') ||
                               errorMsg.includes('ETIMEDOUT') ||
                               fetchError?.cause?.code === 'ECONNREFUSED' ||
                               fetchError?.cause?.code === 'ENOTFOUND' ||
                               fetchError?.cause?.code === 'ETIMEDOUT';
    
    if (isConnectionError) {
      const isDev = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.startsWith('192.168.')
      );
      
      if (isDev) {
        const e: any = new Error(
          `🚨 Development Server Not Running\n\n` +
          `Unable to connect to the development server.\n\n` +
          `To fix this:\n` +
          `1. Open a terminal in your project directory\n` +
          `2. Run: npm run dev (or pnpm dev / yarn dev)\n` +
          `3. Wait for "Ready" message\n` +
          `4. Try again\n\n` +
          `If the server is running, check for errors in the terminal.`
        );
        e.status = 503;
        e.debug = "dev-server-not-running";
        throw e;
      } else {
        const e: any = new Error("Network error: Unable to connect to the server. Please check your internet connection and try again.");
        e.status = 503;
        e.debug = "network-error";
        throw e;
      }
    }
    
    // Re-throw other errors
    throw fetchError;
  }
}

function pgErr(err: PostgrestError): Error {
  const e: any = new Error(err.message);
  e.code = err.code;
  e.details = err.details;
  e.hint = err.hint;
  return e;
}
