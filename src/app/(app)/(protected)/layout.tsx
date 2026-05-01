import ProtectedRoute from "@/components/auth/protected-route";

export default function ProtectedLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
