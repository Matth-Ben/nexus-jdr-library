import type { ReactNode } from "react";
import { CategoryNav } from "@/components/CategoryNav";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CategoryNav />
      <main>{children}</main>
    </>
  );
}
