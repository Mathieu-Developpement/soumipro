"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

const LIMITE_ESSAI = 3;

export default function AbonnementPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [quotesUtilisees, setQuotesUtilisees] = useState(0);
  const [statutAbonnement, setStatutAbonnement] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("quotes_created_total")
        .eq("id", userData.user.id)
        .single();

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("profile_id", userData.user.id)
        .maybeSingle();

      setQuotesUtilisees(profile?.quotes_created_total || 0);
      setStatutAbonnement(sub?.status || null);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const estActif = statutAbonnement === "active" || statutAbonnement === "trialing";
  const essaiEpuise = !estActif && quotesUtilisees >= LIMITE_ESSAI;

  async function handleAbonner() {
    setRedirecting(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const json = await res.json();
    if (json.url) {
      window.location.href = json.url;
    } else {
      setRedirecting(false);
      alert(json.error || "Impossible de démarrer le paiement.");
    }
  }

  async function handleGerer() {
    setRedirecting(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const json = await res.json();
    if (json.url) {
      window.location.href = json.url;
    } else {
      setRedirecting(false);
      alert(json.error || "Impossible d'ouvrir le portail de facturation.");
    }
  }

  if (loading) {
    return <p className="text-marine-400">Chargement...</p>;
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-marine-800">Abonnement</h1>

      <div className="mt-6 rounded-xl border border-marine-100 bg-white p-6">
        {estActif ? (
          <>
            <div className="flex items-center gap-2 text-vert-600">
              <CheckCircle2 size={20} />
              <span className="font-semibold">Abonnement actif</span>
            </div>
            <p className="mt-2 text-sm text-marine-500">
              Vous avez accès à la création et au téléchargement illimité de soumissions.
            </p>
            <button
              onClick={handleGerer}
              disabled={redirecting}
              className="mt-5 flex items-center gap-2 rounded-lg border border-marine-200 px-4 py-2.5 text-sm font-semibold text-marine-700 transition hover:bg-marine-50 disabled:opacity-60"
            >
              {redirecting && <Loader2 size={16} className="animate-spin" />}
              Gérer mon abonnement
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-marine-700">
              <Sparkles size={20} className="text-vert-500" />
              <span className="font-semibold">Essai gratuit</span>
            </div>
            <p className="mt-2 text-sm text-marine-500">
              {quotesUtilisees} / {LIMITE_ESSAI} soumissions gratuites utilisées.
              {essaiEpuise
                ? " Votre essai est terminé — abonnez-vous pour continuer à créer et télécharger des soumissions."
                : " Vous pouvez continuer à créer des soumissions gratuitement jusqu'à la limite."}
            </p>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-marine-100">
              <div
                className="h-full bg-vert-500 transition-all"
                style={{ width: `${Math.min(100, (quotesUtilisees / LIMITE_ESSAI) * 100)}%` }}
              />
            </div>

            <button
              onClick={handleAbonner}
              disabled={redirecting}
              className="mt-5 flex items-center gap-2 rounded-lg bg-vert-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vert-600 disabled:opacity-60"
            >
              {redirecting && <Loader2 size={16} className="animate-spin" />}
              S&apos;abonner
            </button>
          </>
        )}
      </div>
    </div>
  );
}
