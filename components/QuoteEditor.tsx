"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Trash2,
  Download,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import type { Profile, Quote, QuoteItem, QuoteStatus } from "@/lib/types";

const TAUX_TPS = 0.05;
const TAUX_TVQ = 0.09975;

const STATUT_INFO: Record<QuoteStatus, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-marine-100 text-marine-600" },
  envoyee: { label: "Envoyée", className: "bg-blue-100 text-blue-700" },
  acceptee: { label: "Acceptée", className: "bg-vert-100 text-vert-700" },
  refusee: { label: "Refusée", className: "bg-red-100 text-red-700" },
};

interface LigneLocale {
  id: string;
  description: string;
  quantity: number | "";
  unit: string;
  unit_price: number | "";
}

// Convertit une valeur potentiellement vide (en cours de saisie) en nombre sûr pour les calculs
function versNombre(v: number | ""): number {
  return v === "" || isNaN(v as number) ? 0 : (v as number);
}

export default function QuoteEditor({
  initialQuote,
  initialItems,
  profile,
}: {
  initialQuote: Quote;
  initialItems: QuoteItem[];
  profile: Profile;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [quote, setQuote] = useState(initialQuote);
  const [items, setItems] = useState<LigneLocale[]>(
    initialItems.map((i) => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      unit: i.unit,
      unit_price: i.unit_price,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { subtotal, gst, qst, total } = useMemo(() => {
    const sub = items.reduce((acc, i) => acc + versNombre(i.quantity) * versNombre(i.unit_price), 0);
    return {
      subtotal: sub,
      gst: sub * TAUX_TPS,
      qst: sub * TAUX_TVQ,
      total: sub * (1 + TAUX_TPS + TAUX_TVQ),
    };
  }, [items]);

  function updateItem(id: string, field: keyof LigneLocale, value: string | number) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  }

  // Pour les champs numériques : laisse le champ vide pendant la frappe au lieu
  // de forcer un 0 qui reste affiché devant le chiffre qu'on essaie de taper.
  function updateItemNombre(id: string, field: "quantity" | "unit_price", raw: string) {
    if (raw === "") {
      updateItem(id, field, "");
      return;
    }
    const parsed = parseFloat(raw);
    updateItem(id, field, isNaN(parsed) ? "" : parsed);
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit: "unité",
        unit_price: 0,
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    await supabase
      .from("quotes")
      .update({
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        client_address: quote.client_address,
        project_title: quote.project_title,
        notes: quote.notes,
        valid_until: quote.valid_until,
        subtotal,
        gst_amount: gst,
        qst_amount: qst,
        total,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote.id);

    // Stratégie simple pour le MVP : on remplace toutes les lignes à chaque sauvegarde
    await supabase.from("quote_items").delete().eq("quote_id", quote.id);
    if (items.length > 0) {
      await supabase.from("quote_items").insert(
        items.map((item, i) => ({
          quote_id: quote.id,
          description: item.description,
          quantity: versNombre(item.quantity),
          unit: item.unit,
          unit_price: versNombre(item.unit_price),
          position: i,
        }))
      );
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function changerStatut(nouveauStatut: QuoteStatus) {
    setQuote((prev) => ({ ...prev, status: nouveauStatut }));
    await supabase
      .from("quotes")
      .update({ status: nouveauStatut, updated_at: new Date().toISOString() })
      .eq("id", quote.id);
    router.refresh();
  }

  async function handleDownloadPdf() {
    setGeneratingPdf(true);
    await handleSave();

    const res = await fetch(`/api/soumissions/${quote.id}/pdf`);
    if (!res.ok) {
      setGeneratingPdf(false);
      if (res.status === 402) {
        const confirmation = confirm(
          "Votre essai gratuit est terminé. Voulez-vous voir les options d'abonnement ?"
        );
        if (confirmation) router.push("/dashboard/abonnement");
        return;
      }
      alert("Erreur lors de la génération du PDF.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soumission-${quote.client_name || "client"}.pdf`.replace(/\s+/g, "-");
    a.click();
    URL.revokeObjectURL(url);
    setGeneratingPdf(false);

    // Téléchargement du PDF final = on considère que la soumission part chez le client
    if (quote.status === "brouillon") {
      await changerStatut("envoyee");
    }
  }

  async function handleDelete() {
    const confirmation = confirm(
      `Supprimer définitivement la soumission pour ${quote.client_name || "ce client"} ? Cette action est irréversible.`
    );
    if (!confirmation) return;

    setDeleting(true);
    await supabase.from("quotes").delete().eq("id", quote.id);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-marine-400 hover:text-marine-600"
      >
        <ArrowLeft size={16} />
        Mes soumissions
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-marine-800">Réviser la soumission</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg border border-marine-200 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 size={16} />
            {deleting ? "Suppression..." : "Supprimer"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg border border-marine-200 px-4 py-2 text-sm font-semibold text-marine-700 transition hover:bg-marine-50 disabled:opacity-60"
          >
            <Save size={16} />
            {saved ? "Enregistré" : saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 rounded-lg bg-vert-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vert-600 disabled:opacity-60"
          >
            {generatingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {generatingPdf ? "Génération..." : "Télécharger le PDF"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUT_INFO[quote.status].className}`}>
          {STATUT_INFO[quote.status].label}
        </span>

        {(quote.status === "envoyee" || quote.status === "refusee") && (
          <button
            onClick={() => changerStatut("acceptee")}
            className="flex items-center gap-1 text-sm font-medium text-vert-600 hover:text-vert-700"
          >
            <CheckCircle2 size={16} />
            Marquer comme acceptée
          </button>
        )}
        {(quote.status === "envoyee" || quote.status === "acceptee") && (
          <button
            onClick={() => changerStatut("refusee")}
            className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
          >
            <XCircle size={16} />
            Marquer comme refusée
          </button>
        )}
        {quote.status !== "brouillon" && (
          <button
            onClick={() => changerStatut("brouillon")}
            className="flex items-center gap-1 text-sm font-medium text-marine-400 hover:text-marine-600"
          >
            <RotateCcw size={16} />
            Remettre en brouillon
          </button>
        )}
      </div>

      <p className="mt-4 rounded-lg bg-vert-50 px-3 py-2 text-sm text-vert-700">
        Vérifiez chaque ligne avant d&apos;envoyer. Rien n&apos;est transmis au client
        automatiquement. Vous téléchargez le PDF final vous-même.
      </p>

      <section className="mt-6 rounded-xl border border-marine-100 bg-white p-6">
        <h2 className="font-semibold text-marine-700">Client</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <input
            className="rounded-lg border border-marine-200 px-3 py-2 outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
            placeholder="Nom du client"
            value={quote.client_name || ""}
            onChange={(e) => setQuote({ ...quote, client_name: e.target.value })}
          />
          <input
            className="rounded-lg border border-marine-200 px-3 py-2 outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
            placeholder="Titre du projet"
            value={quote.project_title || ""}
            onChange={(e) => setQuote({ ...quote, project_title: e.target.value })}
          />
          <input
            className="rounded-lg border border-marine-200 px-3 py-2 outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
            placeholder="Courriel du client"
            value={quote.client_email || ""}
            onChange={(e) => setQuote({ ...quote, client_email: e.target.value })}
          />
          <input
            className="rounded-lg border border-marine-200 px-3 py-2 outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
            placeholder="Téléphone du client"
            value={quote.client_phone || ""}
            onChange={(e) => setQuote({ ...quote, client_phone: e.target.value })}
          />
          <input
            className="rounded-lg border border-marine-200 px-3 py-2 outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500 sm:col-span-2"
            placeholder="Adresse du client"
            value={quote.client_address || ""}
            onChange={(e) => setQuote({ ...quote, client_address: e.target.value })}
          />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-marine-100 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-marine-700">Lignes de la soumission</h2>
          <button
            onClick={addItem}
            className="flex items-center gap-1 text-sm font-medium text-vert-600 hover:text-vert-700"
          >
            <Plus size={16} />
            Ajouter une ligne
          </button>
        </div>

        <div className="mt-4 hidden gap-2 px-3 text-xs font-medium uppercase tracking-wide text-marine-400 sm:flex">
          <span className="min-w-[180px] flex-1">Description</span>
          <span className="w-20">Quantité</span>
          <span className="w-24">Unité</span>
          <span className="w-28">Prix unit. ($)</span>
          <span className="w-24 text-right">Total</span>
          <span className="w-4" />
        </div>

        <div className="mt-2 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-start gap-2 rounded-lg border border-marine-100 p-3">
              <input
                className="min-w-[180px] flex-1 rounded-md border border-marine-200 px-2 py-1.5 text-sm outline-none focus:border-vert-500"
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(item.id, "description", e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                className="w-20 rounded-md border border-marine-200 px-2 py-1.5 text-sm outline-none focus:border-vert-500"
                value={item.quantity}
                onChange={(e) => updateItemNombre(item.id, "quantity", e.target.value)}
                placeholder="Qté"
                title="Quantité"
              />
              <input
                className="w-24 rounded-md border border-marine-200 px-2 py-1.5 text-sm outline-none focus:border-vert-500"
                value={item.unit}
                onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                placeholder="Unité"
                title="Unité"
              />
              <input
                type="number"
                step="0.01"
                className="w-28 rounded-md border border-marine-200 px-2 py-1.5 text-sm outline-none focus:border-vert-500"
                value={item.unit_price}
                onChange={(e) => updateItemNombre(item.id, "unit_price", e.target.value)}
                placeholder="Prix $"
                title="Prix unitaire ($)"
              />
              <span className="w-24 self-center text-right text-sm font-medium text-marine-700">
                {(versNombre(item.quantity) * versNombre(item.unit_price)).toLocaleString("fr-CA", {
                  style: "currency",
                  currency: "CAD",
                })}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="self-center text-marine-300 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-6 text-center text-sm text-marine-400">
              Aucune ligne. Cliquez sur &quot;Ajouter une ligne&quot; pour commencer.
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-marine-500">
              <span>Sous-total</span>
              <span>{subtotal.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
            </div>
            <div className="flex justify-between text-marine-500">
              <span>TPS (5%)</span>
              <span>{gst.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
            </div>
            <div className="flex justify-between text-marine-500">
              <span>TVQ (9,975%)</span>
              <span>{qst.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
            </div>
            <div className="flex justify-between border-t border-marine-100 pt-1 font-semibold text-marine-800">
              <span>Total</span>
              <span>{total.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-marine-100 bg-white p-6">
        <h2 className="font-semibold text-marine-700">Notes et validité</h2>
        <div className="mt-4 space-y-4">
          <textarea
            rows={3}
            className="w-full rounded-lg border border-marine-200 px-3 py-2 text-sm outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
            placeholder="Notes ou exclusions (ex: matériaux non inclus, accès requis...)"
            value={quote.notes || ""}
            onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-marine-700">Valide jusqu&apos;au</label>
            <input
              type="date"
              className="mt-1 rounded-lg border border-marine-200 px-3 py-2 text-sm outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
              value={quote.valid_until || ""}
              onChange={(e) => setQuote({ ...quote, valid_until: e.target.value })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
