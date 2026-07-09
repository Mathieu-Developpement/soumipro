import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import PdfDocument from "@/components/PdfDocument";
import type { PdfTemplate, Profile, Quote, QuoteItem } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", params.id)
    .eq("profile_id", userData.user.id)
    .single();

  if (!quote) {
    return NextResponse.json({ error: "Soumission introuvable" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", params.id)
    .order("position", { ascending: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();

  // Vérification côté serveur (impossible à contourner depuis le navigateur) :
  // au-delà des 3 soumissions gratuites, il faut un abonnement actif pour télécharger.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("profile_id", userData.user.id)
    .maybeSingle();

  const abonnementActif = sub?.status === "active" || sub?.status === "trialing";
  const essaiEpuise = !abonnementActif && (profile?.quotes_created_total || 0) >= 3;

  if (essaiEpuise) {
    return NextResponse.json(
      { error: "LIMITE_ESSAI_ATTEINTE", message: "Un abonnement est requis pour télécharger des soumissions." },
      { status: 402 }
    );
  }

  const { data: template } = await supabase
    .from("pdf_templates")
    .select("*")
    .eq("profile_id", userData.user.id)
    .maybeSingle();

  try {
    const buffer = await renderToBuffer(
      createElement(PdfDocument, {
        quote: quote as Quote,
        items: (items as QuoteItem[]) || [],
        profile: profile as Profile,
        template: template as PdfTemplate | null,
      }) as Parameters<typeof renderToBuffer>[0]
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="soumission.pdf"`,
      },
    });
  } catch (err) {
    console.error("Erreur génération PDF:", err);
    return NextResponse.json({ error: "Erreur lors de la génération du PDF" }, { status: 500 });
  }
}
