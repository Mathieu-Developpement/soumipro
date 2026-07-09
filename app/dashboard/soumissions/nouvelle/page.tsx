"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, FileEdit, Loader2 } from "lucide-react";
import type { GeneratedQuoteDraft } from "@/lib/types";

type Mode = "choix" | "libre" | "formulaire";

// Reconnaît l'erreur envoyée par le trigger Postgres qui applique la limite d'essai
function estErreurLimiteEssai(message: string | undefined | null): boolean {
  return !!message && message.includes("LIMITE_ESSAI_ATTEINTE");
}

export default function NouvelleSoumissionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("choix");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limiteAtteinte, setLimiteAtteinte] = useState(false);

  async function creerSoumissionVide() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error: insertError } = await supabase
      .from("quotes")
      .insert({
        profile_id: userData.user!.id,
        client_name: clientName,
        project_title: "",
        status: "brouillon",
      })
      .select()
      .single();

    setLoading(false);
    if (insertError || !data) {
      if (estErreurLimiteEssai(insertError?.message)) {
        setLimiteAtteinte(true);
      } else {
        setError("Impossible de créer la soumission.");
      }
      return;
    }
    router.push(`/dashboard/soumissions/${data.id}`);
  }

  async function genererAvecIA() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/soumissions/generer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Erreur lors de la génération.");
        setLoading(false);
        return;
      }

      const draft: GeneratedQuoteDraft = json.draft;
      const { data: userData } = await supabase.auth.getUser();

      const { data: quote, error: insertError } = await supabase
        .from("quotes")
        .insert({
          profile_id: userData.user!.id,
          client_name: clientName,
          project_title: draft.project_title,
          project_description: description,
          notes: draft.notes,
          status: "brouillon",
        })
        .select()
        .single();

      if (insertError || !quote) {
        if (estErreurLimiteEssai(insertError?.message)) {
          setLimiteAtteinte(true);
        } else {
          setError("Impossible d'enregistrer la soumission.");
        }
        setLoading(false);
        return;
      }

      if (draft.items.length > 0) {
        await supabase.from("quote_items").insert(
          draft.items.map((item, i) => ({
            quote_id: quote.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            position: i,
          }))
        );
      }

      router.push(`/dashboard/soumissions/${quote.id}`);
    } catch (err) {
      setError("Une erreur est survenue. Réessayez.");
      setLoading(false);
    }
  }

  if (limiteAtteinte) {
    return (
      <div className="max-w-xl">
        <button
          onClick={() => setMode("choix")}
          className="text-sm text-marine-400 hover:text-marine-600"
        >
          ← Retour
        </button>
        <div className="mt-4 rounded-xl border border-vert-200 bg-vert-50 p-6 text-center">
          <h2 className="font-semibold text-marine-800">
            Votre essai gratuit est terminé
          </h2>
          <p className="mt-2 text-sm text-marine-600">
            Vous avez utilisé vos 3 soumissions gratuites. Abonnez-vous pour continuer à
            créer et télécharger des soumissions.
          </p>
          <Link
            href="/dashboard/abonnement"
            className="mt-5 inline-block rounded-lg bg-vert-500 px-5 py-2.5 font-semibold text-white transition hover:bg-vert-600"
          >
            Voir les options d&apos;abonnement
          </Link>
        </div>
      </div>
    );
  }

  if (mode === "choix") {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-marine-800">Nouvelle soumission</h1>
        <p className="mt-1 text-sm text-marine-500">
          Comment voulez-vous créer cette soumission ?
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setMode("libre")}
            className="rounded-xl border border-marine-100 bg-white p-6 text-left transition hover:border-vert-400 hover:shadow-sm"
          >
            <Sparkles className="text-vert-500" size={24} />
            <h3 className="mt-3 font-semibold text-marine-800">
              Décrire le travail (IA)
            </h3>
            <p className="mt-1 text-sm text-marine-500">
              Écrivez en quelques phrases ce qu&apos;il faut faire, l&apos;IA structure la
              soumission pour vous.
            </p>
          </button>

          <button
            onClick={() => setMode("formulaire")}
            className="rounded-xl border border-marine-100 bg-white p-6 text-left transition hover:border-vert-400 hover:shadow-sm"
          >
            <FileEdit className="text-marine-500" size={24} />
            <h3 className="mt-3 font-semibold text-marine-800">
              Remplir moi-même
            </h3>
            <p className="mt-1 text-sm text-marine-500">
              Partez d&apos;une soumission vide et ajoutez vos lignes manuellement.
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <button
        onClick={() => setMode("choix")}
        className="text-sm text-marine-400 hover:text-marine-600"
      >
        ← Retour
      </button>

      <h1 className="mt-3 text-2xl font-bold text-marine-800">
        {mode === "libre" ? "Décrire le travail" : "Nouvelle soumission"}
      </h1>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-marine-700">
            Nom du client
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-marine-200 px-3 py-2 text-marine-800 outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex: Marie Gagnon"
          />
        </div>

        {mode === "libre" && (
          <div>
            <label className="block text-sm font-medium text-marine-700">
              Décrivez le travail à effectuer
            </label>
            <textarea
              rows={6}
              className="mt-1 w-full rounded-lg border border-marine-200 px-3 py-2 text-marine-800 outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Remplacer le chauffe-eau au sous-sol, incluant les 2 heures de main d'œuvre et le nouveau réservoir 40 gallons..."
            />
            <p className="mt-1 text-xs text-marine-400">
              L&apos;IA va suggérer des lignes et des prix basés sur votre taux horaire.
              Vous pourrez tout modifier avant d&apos;envoyer.
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          onClick={mode === "libre" ? genererAvecIA : creerSoumissionVide}
          disabled={loading || (mode === "libre" && description.trim().length < 5)}
          className="flex items-center gap-2 rounded-lg bg-vert-500 px-5 py-2.5 font-semibold text-white transition hover:bg-vert-600 disabled:opacity-60"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading
            ? "Génération en cours..."
            : mode === "libre"
            ? "Générer la soumission"
            : "Créer la soumission"}
        </button>
      </div>
    </div>
  );
}
