// Auth is handled by proxy.ts with proper 401 responses
// This layout just provides structure for admin pages

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
