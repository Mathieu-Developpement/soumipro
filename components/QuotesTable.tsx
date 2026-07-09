"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";
import type { Quote, QuoteStatus } from "@/lib/types";

const STATUT_LABELS: Record<QuoteStatus, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-marine-100 text-marine-600" },
  envoyee: { label: "Envoyée", className: "bg-blue-100 text-blue-700" },
  acceptee: { label: "Acceptée", className: "bg-vert-100 text-vert-700" },
  refusee: { label: "Refusée", className: "bg-red-100 text-red-700" },
};

export default function QuotesTable({ initialQuotes }: { initialQuotes: Quote[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [quotes, setQuotes] = useState(initialQuotes);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, quote: Quote) {
    e.stopPropagation(); // évite de déclencher l'ouverture de la soumission

    const confirmation = confirm(
      `Supprimer définitivement la soumission pour ${quote.client_name || "ce client"} ? Cette action est irréversible.`
    );
    if (!confirmation) return;

    setDeletingId(quote.id);
    await supabase.from("quotes").delete().eq("id", quote.id);
    setQuotes((prev) => prev.filter((q) => q.id !== quote.id));
    setDeletingId(null);
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-marine-100 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-marine-100 bg-marine-50 text-left text-marine-500">
          <tr>
            <th className="px-5 py-3 font-medium">Client</th>
            <th className="px-5 py-3 font-medium">Projet</th>
            <th className="px-5 py-3 font-medium">Total</th>
            <th className="px-5 py-3 font-medium">Statut</th>
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => {
            const statut = STATUT_LABELS[quote.status] || STATUT_LABELS.brouillon;
            return (
              <tr
                key={quote.id}
                onClick={() => router.push(`/dashboard/soumissions/${quote.id}`)}
                className="cursor-pointer border-b border-marine-50 transition hover:bg-marine-50 last:border-0"
              >
                <td className="px-5 py-3 font-medium text-marine-800">
                  {quote.client_name || "Sans nom"}
                </td>
                <td className="px-5 py-3 text-marine-600">{quote.project_title || "-"}</td>
                <td className="px-5 py-3 text-marine-600">
                  {quote.total.toLocaleString("fr-CA", {
                    style: "currency",
                    currency: "CAD",
                  })}
                </td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statut.className}`}>
                    {statut.label}
                  </span>
                </td>
                <td className="px-5 py-3 text-marine-400">
                  {new Date(quote.created_at).toLocaleDateString("fr-CA")}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={(e) => handleDelete(e, quote)}
                    disabled={deletingId === quote.id}
                    className="text-marine-300 transition hover:text-red-500 disabled:opacity-50"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
