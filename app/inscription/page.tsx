"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function InscriptionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationRequise, setConfirmationRequise] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { business_name: businessName },
      },
    });

    if (signUpError) {
      setError(traduireErreur(signUpError.message));
      setLoading(false);
      return;
    }

    // Le profil est créé automatiquement par un trigger côté base de données
    // (voir supabase/schema.sql), donc pas besoin de l'insérer ici.

    if (!data.session) {
      // La confirmation par courriel est activée sur ce projet Supabase :
      // pas de session tant que le lien n'est pas cliqué.
      setLoading(false);
      setConfirmationRequise(true);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-marine-50 px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="SoumiPro" className="h-24 w-auto" />
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-marine-100">
          {confirmationRequise ? (
            <>
              <h1 className="text-xl font-bold text-marine-800">Vérifiez votre courriel</h1>
              <p className="mt-2 text-sm text-marine-500">
                Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez
                dessus pour activer votre compte, puis revenez vous connecter.
              </p>
              <Link
                href="/connexion"
                className="mt-6 inline-block rounded-lg bg-vert-500 px-5 py-2.5 font-semibold text-white transition hover:bg-vert-600"
              >
                Aller à la connexion
              </Link>
            </>
          ) : (
            <>
          <h1 className="text-xl font-bold text-marine-800">Créer un compte</h1>
          <p className="mt-1 text-sm text-marine-500">
            Commencez à générer vos soumissions en quelques minutes.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-marine-700">
                Nom de votre entreprise
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ex: Plomberie Tremblay"
                className="mt-1 w-full rounded-lg border border-marine-200 px-3 py-2 text-marine-800 outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-marine-700">
                Courriel
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-marine-200 px-3 py-2 text-marine-800 outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-marine-700">
                Mot de passe
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-marine-200 px-3 py-2 text-marine-800 outline-none focus:border-vert-500 focus:ring-1 focus:ring-vert-500"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-vert-500 py-2.5 font-semibold text-white transition hover:bg-vert-600 disabled:opacity-60"
            >
              {loading ? "Création en cours..." : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-marine-500">
            Déjà un compte ?{" "}
            <Link href="/connexion" className="font-medium text-vert-600 hover:underline">
              Se connecter
            </Link>
          </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function traduireErreur(message: string): string {
  if (message.includes("already registered")) {
    return "Ce courriel est déjà associé à un compte.";
  }
  if (message.includes("Password should be")) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }
  return "Une erreur est survenue. Vérifiez vos informations et réessayez.";
}
