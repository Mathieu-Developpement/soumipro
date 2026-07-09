"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PdfTemplate } from "@/lib/types";
import { Check } from "lucide-react";

const GABARIT_PAR_DEFAUT: Omit<PdfTemplate, "id" | "profile_id"> = {
  show_logo: true,
  accent_color: "#3fa34d",
  font_style: "moderne",
  show_tax_details: true,
  footer_text: "",
  terms_conditions:
    "Cette soumission est valide pour 30 jours à partir de la date d'émission, sauf indication contraire ci-dessus.",
};

export default function GabaritPdfPage() {
  const supabase = createClient();
  const [template, setTemplate] = useState<PdfTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error: selectError } = await supabase
        .from("pdf_templates")
        .select("*")
        .eq("profile_id", userData.user.id)
        .maybeSingle();

      if (data) {
        setTemplate(data as PdfTemplate);
      } else {
        // Aucun gabarit encore créé pour ce compte (ex: compte créé avant cette
        // fonctionnalité) : on en crée un avec les valeurs par défaut.
        // upsert() évite toute erreur de conflit si la ligne existe déjà
        // (ex: appel en double déclenché par le mode strict de React en dev).
        const { data: created, error: upsertError } = await supabase
          .from("pdf_templates")
          .upsert(
            { profile_id: userData.user.id, ...GABARIT_PAR_DEFAUT },
            { onConflict: "profile_id" }
          )
          .select()
          .single();

        if (upsertError) {
          console.error("Erreur création gabarit:", upsertError, selectError);
        }
        setTemplate(created as PdfTemplate);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!template) return;
    setSaving(true);
    setSaved(false);

    await supabase
      .from("pdf_templates")
      .update({
        show_logo: template.show_logo,
        accent_color: template.accent_color,
        font_style: template.font_style,
        show_tax_details: template.show_tax_details,
        footer_text: template.footer_text,
        terms_conditions: template.terms_conditions,
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", template.profile_id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return <p className="text-marine-400">Chargement...</p>;
  }

  if (!template) {
    return <p className="text-marine-400">Impossible de charger le gabarit.</p>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-marine-800">Personnalisation du PDF</h1>
      <p className="mt-1 text-sm text-marine-500">
        Ces options s&apos;appliquent à toutes les soumissions générées à partir de maintenant.
      </p>

      <form onSubmit={handleSave} className="mt-8 space-y-6">
        <section className="rounded-xl border border-marine-100 bg-white p-6">
          <h2 className="font-semibold text-marine-700">Apparence</h2>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-2 text-sm text-marine-700">
              <input
                type="checkbox"
                checked={template.show_logo}
                onChange={(e) => setTemplate({ ...template, show_logo: e.target.checked })}
                className="h-4 w-4 rounded border-marine-300 text-vert-600 focus:ring-vert-500"
              />
              Afficher mon logo sur le PDF
            </label>

            <div>
              <label className="block text-sm font-medium text-marine-700">
                Couleur d&apos;accent (en-tête du tableau, ligne de séparation)
              </label>
              <input
                type="color"
                value={template.accent_color}
                onChange={(e) => setTemplate({ ...template, accent_color: e.target.value })}
                className="mt-1 h-10 w-24 rounded-lg border border-marine-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-marine-700">Style de police</label>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setTemplate({ ...template, font_style: "moderne" })}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    template.font_style === "moderne"
                      ? "border-vert-500 bg-vert-50 text-vert-700"
                      : "border-marine-200 text-marine-600 hover:bg-marine-50"
                  }`}
                >
                  Moderne (sans-serif)
                </button>
                <button
                  type="button"
                  onClick={() => setTemplate({ ...template, font_style: "classique" })}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    template.font_style === "classique"
                      ? "border-vert-500 bg-vert-50 text-vert-700"
                      : "border-marine-200 text-marine-600 hover:bg-marine-50"
                  }`}
                >
                  Classique (serif)
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-marine-100 bg-white p-6">
          <h2 className="font-semibold text-marine-700">Contenu</h2>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-2 text-sm text-marine-700">
              <input
                type="checkbox"
                checked={template.show_tax_details}
                onChange={(e) => setTemplate({ ...template, show_tax_details: e.target.checked })}
                className="h-4 w-4 rounded border-marine-300 text-vert-600 focus:ring-vert-500"
              />
              Afficher le détail des taxes (TPS/TVQ). Si décoché, seul le total est affiché.
            </label>

            <div>
              <label className="block text-sm font-medium text-marine-700">
                Conditions générales (affichées en bas du PDF)
              </label>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-lg border border-marine-200 px-3 py-2 text-sm outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
                value={template.terms_conditions}
                onChange={(e) => setTemplate({ ...template, terms_conditions: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-marine-700">
                Message de bas de page (optionnel)
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-marine-200 px-3 py-2 text-sm outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
                placeholder="Ex: Merci de faire affaire avec nous !"
                value={template.footer_text}
                onChange={(e) => setTemplate({ ...template, footer_text: e.target.value })}
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-vert-500 px-5 py-2.5 font-semibold text-white transition hover:bg-vert-600 disabled:opacity-60"
        >
          {saved ? <Check size={18} /> : null}
          {saving ? "Enregistrement..." : saved ? "Enregistré" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
