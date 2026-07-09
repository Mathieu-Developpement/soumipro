import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("contact_email")
    .eq("id", userData.user.id)
    .single();

  const email = profile?.contact_email || userData.user.email;
  if (!email) {
    return NextResponse.json({ error: "Aucun courriel associé à ce compte." }, { status: 400 });
  }

  try {
    // Retrouve le client Stripe par courriel (méthode de secours quand le
    // webhook n'a pas encore pu écrire le lien customer_id ↔ profile_id)
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];

    if (!customer) {
      return NextResponse.json({ error: "Aucun abonnement Stripe trouvé pour ce courriel." }, { status: 404 });
    }

    const subs = await stripe.subscriptions.list({ customer: customer.id, limit: 1, status: "all" });
    const subscription = subs.data[0];

    if (!subscription) {
      return NextResponse.json({ error: "Aucun abonnement trouvé pour ce client Stripe." }, { status: 404 });
    }

    const admin = createAdminClient();
    await admin.from("subscriptions").upsert(
      {
        profile_id: userData.user.id,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      },
      { onConflict: "profile_id" }
    );

    return NextResponse.json({ ok: true, status: subscription.status });
  } catch (err: any) {
    console.error("Erreur resynchronisation Stripe:", err);
    return NextResponse.json({ error: "Erreur lors de la synchronisation." }, { status: 500 });
  }
}