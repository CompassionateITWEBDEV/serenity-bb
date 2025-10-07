import PatientPresenceBeacon from "@/components/presence/PatientPresenceBeacon";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PatientPresenceBeacon />
      {children}
    </>
  );
}
