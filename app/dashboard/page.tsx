import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlusCircle, FileText } from "lucide-react";
import QuotesTable from "@/components/QuotesTable";
import type { Quote } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, client_name, project_title, status, total, created_at")
    .eq("profile_id", user.user?.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const list = (quotes as Quote[]) || [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-marine-800">Mes soumissions</h1>
          <p className="mt-1 text-sm text-marine-500">
            {list.length} soumission{list.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/dashboard/soumissions/nouvelle"
          className="flex items-center gap-2 rounded-lg bg-vert-500 px-4 py-2.5 font-semibold text-white transition hover:bg-vert-600"
        >
          <PlusCircle size={18} />
          Nouvelle soumission
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-dashed border-marine-200 bg-white py-20 text-center">
          <FileText className="text-marine-300" size={40} />
          <p className="mt-4 font-medium text-marine-600">
            Aucune soumission pour l&apos;instant
          </p>
          <p className="mt-1 text-sm text-marine-400">
            Créez votre première soumission pour commencer.
          </p>
          <Link
            href="/dashboard/soumissions/nouvelle"
            className="mt-6 rounded-lg bg-vert-500 px-5 py-2.5 font-semibold text-white transition hover:bg-vert-600"
          >
            Créer une soumission
          </Link>
        </div>
      ) : (
        <QuotesTable initialQuotes={list} />
      )}
    </div>
  );
}
