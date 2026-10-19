import Link from "next/link";
import { LogOut, LayoutDashboard } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { Container } from "@/components/ui/Container";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[70vh] bg-paper-sunk">
      <div className="border-b border-border bg-ink">
        <Container className="flex h-14 items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-display text-sm font-semibold text-white">
            <LayoutDashboard size={18} className="text-pink" />
            Best Buddy UP! — Admin
          </Link>
          <Link href="/admin/transfers" className="text-sm font-semibold text-white">Transferencias</Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-white/70 transition-colors duration-200 hover:text-white"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </Container>
      </div>
      <Container className="py-10">{children}</Container>
    </div>
  );
}
