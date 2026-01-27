import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Auth layouts must be dynamic (access headers/cookies)
export const dynamic = "force-dynamic";

const getBearerToken = (headerValue: string | null) => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

async function validateAdminToken() {
  const headersList = await headers();

  const token =
    headersList.get("x-admin-token") ??
    getBearerToken(headersList.get("authorization"));

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return false;
  }

  return true;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = await validateAdminToken();

  if (!isAuthenticated) {
    redirect("/");
  }

  return <>{children}</>;
}
