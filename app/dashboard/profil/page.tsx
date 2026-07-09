"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Upload, Check } from "lucide-react";

// Redimensionne et compresse l'image côté navigateur avant l'envoi à Supabase Storage.
// Évite de stocker (et de retélécharger à chaque PDF) des photos de logo en pleine résolution.
async function redimensionnerLogo(file: File, maxDim = 500): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * ratio);
  const height = Math.round(bitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Échec de la compression du logo"))),
      "image/png",
      0.85
    );
  });
}

export default function ProfilPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hourlyRateInput, setHourlyRateInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      setProfile(data as Profile);
      setHourlyRateInput(data ? String((data as Profile).hourly_rate) : "");
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaved(false);

    let logo_url = profile.logo_url;

    if (logoFile) {
      const { data: userData } = await supabase.auth.getUser();
      const path = `${userData.user!.id}/logo-${Date.now()}.png`;
      const redimensionne = await redimensionnerLogo(logoFile);
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(path, redimensionne, { upsert: true, contentType: "image/png" });

      if (!uploadError) {
        const { data: publicUrl } = supabase.storage.from("logos").getPublicUrl(path);
        logo_url = publicUrl.publicUrl;
      }
    }

    await supabase
      .from("profiles")
      .update({
        business_name: profile.business_name,
        trade: profile.trade,
        hourly_rate: parseFloat(hourlyRateInput) || 0,
        address: profile.address,
        phone: profile.phone,
        contact_email: profile.contact_email,
        gst_number: profile.gst_number,
        qst_number: profile.qst_number,
        primary_color: profile.primary_color,
        secondary_color: profile.secondary_color,
        logo_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    setProfile({ ...profile, logo_url });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return <p className="text-marine-400">Chargement...</p>;
  }

  if (!profile) {
    return <p className="text-marine-400">Profil introuvable.</p>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-marine-800">Mon profil</h1>
      <p className="mt-1 text-sm text-marine-500">
        Ces informations et votre image de marque apparaissent sur vos PDF de soumission.
      </p>

      <form onSubmit={handleSave} className="mt-8 space-y-6">
        <section className="rounded-xl border border-marine-100 bg-white p-6">
          <h2 className="font-semibold text-marine-700">Entreprise</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nom de l'entreprise">
              <input
                className="input"
                value={profile.business_name}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
              />
            </Field>
            <Field label="Métier / spécialité">
              <input
                className="input"
                placeholder="Ex: Plomberie, électricité, paysagement..."
                value={profile.trade || ""}
                onChange={(e) => setProfile({ ...profile, trade: e.target.value })}
              />
            </Field>
            <Field label="Taux horaire par défaut ($/h)">
              <input
                type="number"
                step="0.01"
                className="input"
                value={hourlyRateInput}
                onChange={(e) => setHourlyRateInput(e.target.value)}
              />
            </Field>
            <Field label="Téléphone">
              <input
                className="input"
                value={profile.phone || ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </Field>
            <Field label="Courriel de contact">
              <input
                type="email"
                className="input"
                value={profile.contact_email || ""}
                onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })}
              />
            </Field>
            <Field label="Adresse">
              <input
                className="input"
                value={profile.address || ""}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              />
            </Field>
            <Field label="Numéro TPS">
              <input
                className="input"
                value={profile.gst_number || ""}
                onChange={(e) => setProfile({ ...profile, gst_number: e.target.value })}
              />
            </Field>
            <Field label="Numéro TVQ">
              <input
                className="input"
                value={profile.qst_number || ""}
                onChange={(e) => setProfile({ ...profile, qst_number: e.target.value })}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-marine-100 bg-white p-6">
          <h2 className="font-semibold text-marine-700">Image de marque du PDF</h2>
          <p className="mt-1 text-sm text-marine-400">
            Votre logo et vos couleurs remplacent toute trace de SoumiPro sur le document final.
          </p>

          <div className="mt-4 flex items-center gap-4">
            {profile.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo_url}
                alt="Logo actuel"
                className="h-16 w-16 rounded-lg border border-marine-100 object-contain"
              />
            )}
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-marine-300 px-4 py-3 text-sm text-marine-500 hover:border-vert-400 hover:text-vert-600">
              <Upload size={16} />
              {logoFile ? logoFile.name : "Téléverser un logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Couleur principale">
              <input
                type="color"
                className="h-10 w-full rounded-lg border border-marine-200"
                value={profile.primary_color}
                onChange={(e) => setProfile({ ...profile, primary_color: e.target.value })}
              />
            </Field>
            <Field label="Couleur secondaire (accent)">
              <input
                type="color"
                className="h-10 w-full rounded-lg border border-marine-200"
                value={profile.secondary_color}
                onChange={(e) => setProfile({ ...profile, secondary_color: e.target.value })}
              />
            </Field>
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

      <style jsx global>{`
        .input {
          @apply w-full rounded-lg border border-marine-200 px-3 py-2 text-marine-800 outline-none;
        }
        .input:focus {
          @apply border-vert-500 ring-1 ring-vert-500;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-marine-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
