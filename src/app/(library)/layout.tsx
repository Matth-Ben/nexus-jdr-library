import type { ReactNode } from "react";
import { CategoryNav } from "@/components/CategoryNav";
import { createSessionClient } from "@/lib/supabase/server";

export default async function LibraryLayout({ children }: { children: ReactNode }) {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <CategoryNav userEmail={user?.email ?? null} />
      <main>{children}</main>
    </>
  );
}
