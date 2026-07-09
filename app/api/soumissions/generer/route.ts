import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQuoteDraft } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { description } = await req.json();

  if (!description || typeof description !== "string" || description.trim().length < 5) {
    return NextResponse.json(
      { error: "Décrivez le travail à effectuer (quelques mots minimum)." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("hourly_rate, trade")
    .eq("id", userData.user.id)
    .single();

  try {
    const draft = await generateQuoteDraft(
      description,
      profile?.hourly_rate || 50,
      profile?.trade || undefined
    );
    return NextResponse.json({ draft });
  } catch (err: any) {
    console.error("Erreur génération Gemini:", err);
    return NextResponse.json(
      { error: "La génération IA a échoué. Vous pouvez remplir la soumission manuellement." },
      { status: 500 }
    );
  }
}
