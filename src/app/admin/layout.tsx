import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

const getBearerToken = (headerValue: string | null) => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

async function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const headersList = await headers();

  const token =
    headersList.get("x-admin-token") ??
    getBearerToken(headersList.get("authorization"));

  if (!token || token !== process.env.ADMIN_TOKEN) {
    redirect("/");
  }

  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminAuthGate>{children}</AdminAuthGate>
    </Suspense>
  );
}
