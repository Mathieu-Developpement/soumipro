import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Zap, ShieldCheck, FileCheck2 } from "lucide-react";

export default async function Home() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-marine-700 text-white">
      <div className="mx-auto max-w-5xl px-6 py-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-full.png" alt="SoumiPro" className="h-10 w-auto" />

        <h1 className="mt-6 max-w-3xl font-body text-5xl font-bold leading-tight tracking-tight">
          Vos soumissions.{" "}
          <span className="text-vert-400">Générées par l&apos;IA.</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-marine-200">
          Décrivez le travail en une phrase, ou remplissez un formulaire.
          SoumiPro structure votre soumission, vous la révisez, et le PDF part
          avec votre logo, pas le nôtre.
        </p>

        <div className="mt-10 flex gap-4">
          <Link
            href="/inscription"
            className="rounded-lg bg-vert-500 px-6 py-3 font-semibold text-white transition hover:bg-vert-600"
          >
            Créer mon compte
          </Link>
          <Link
            href="/connexion"
            className="rounded-lg border border-marine-400 px-6 py-3 font-semibold text-marine-100 transition hover:bg-marine-600"
          >
            Se connecter
          </Link>
        </div>

        <div className="mt-20 grid gap-8 border-t border-marine-600 pt-12 sm:grid-cols-3">
          <div>
            <Zap className="text-vert-400" size={22} />
            <h3 className="mt-3 font-semibold">Texte libre ou formulaire</h3>
            <p className="mt-1 text-sm text-marine-300">
              Décrivez la job comme vous la diriez à un client, ou remplissez
              les champs vous-même.
            </p>
          </div>
          <div>
            <ShieldCheck className="text-vert-400" size={22} />
            <h3 className="mt-3 font-semibold">Vous gardez le contrôle</h3>
            <p className="mt-1 text-sm text-marine-300">
              L&apos;IA structure et suggère, mais rien n&apos;est envoyé sans
              votre révision.
            </p>
          </div>
          <div>
            <FileCheck2 className="text-vert-400" size={22} />
            <h3 className="mt-3 font-semibold">100% votre image</h3>
            <p className="mt-1 text-sm text-marine-300">
              Le PDF final porte votre logo et vos couleurs. Aucune trace de
              SoumiPro.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
