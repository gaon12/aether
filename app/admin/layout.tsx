import type { ReactNode } from "react";
import { AdminConsoleLayout } from "@/components/layout/AdminConsoleLayout";
import { requireAdminPageAccess } from "@/server/admin/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminPageAccess();

  return <AdminConsoleLayout>{children}</AdminConsoleLayout>;
}
