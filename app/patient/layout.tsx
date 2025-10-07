import PatientHeartbeat from "@/components/presence/PatientHeartbeat";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PatientHeartbeat />
      {children}
    </>
  );
}
