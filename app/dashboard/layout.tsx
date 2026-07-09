import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LayoutDashboard, PlusCircle, Settings, Palette, CreditCard, LogOut } from "lucide-react";
import { signOutAction } from "./actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/connexion");
  }

  return (
    <div className="min-h-screen bg-marine-50">
      <div className="flex">
        <aside className="hidden w-60 flex-col border-r border-marine-100 bg-white px-4 py-6 sm:flex">
          <div className="px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-full.png" alt="SoumiPro" className="h-11 w-auto" />
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-1">
            <NavLink href="/dashboard" icon={<LayoutDashboard size={18} />}>
              Mes soumissions
            </NavLink>
            <NavLink href="/dashboard/soumissions/nouvelle" icon={<PlusCircle size={18} />}>
              Nouvelle soumission
            </NavLink>
            <NavLink href="/dashboard/profil" icon={<Settings size={18} />}>
              Mon profil
            </NavLink>
            <NavLink href="/dashboard/gabarit-pdf" icon={<Palette size={18} />}>
              Personnalisation PDF
            </NavLink>
            <NavLink href="/dashboard/abonnement" icon={<CreditCard size={18} />}>
              Abonnement
            </NavLink>
          </nav>

          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-marine-500 transition hover:bg-marine-50 hover:text-marine-700"
            >
              <LogOut size={18} />
              Se déconnecter
            </button>
          </form>
        </aside>

        <main className="flex-1 px-6 py-8 sm:px-10">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-marine-600 transition hover:bg-vert-50 hover:text-vert-700"
    >
      {icon}
      {children}
    </Link>
  );
}
