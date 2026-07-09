import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, contact_email")
    .eq("id", userData.user.id)
    .single();

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("profile_id", userData.user.id)
    .maybeSingle();

  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      customer: existingSub?.stripe_customer_id || undefined,
      customer_email: existingSub?.stripe_customer_id ? undefined : (profile?.contact_email || userData.user.email),
      client_reference_id: userData.user.id,
      subscription_data: {
        metadata: { profile_id: userData.user.id },
      },
      success_url: `${origin}/dashboard/abonnement?succes=1`,
      cancel_url: `${origin}/dashboard/abonnement?annule=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Erreur création session Stripe:", err);
    return NextResponse.json({ error: "Impossible de démarrer le paiement." }, { status: 500 });
  }
}
