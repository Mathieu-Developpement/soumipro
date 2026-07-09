"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ConnexionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Courriel ou mot de passe incorrect.");
      setLoading(false);
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
          <h1 className="text-xl font-bold text-marine-800">Se connecter</h1>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-marine-500">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="font-medium text-vert-600 hover:underline">
              En créer un
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
