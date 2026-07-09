import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function upsertSubscription(
  profileId: string,
  data: {
    stripe_customer_id: string;
    stripe_subscription_id: string;
    status: string;
    current_period_end: string | null;
  }
) {
  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .upsert(
      { profile_id: profileId, ...data },
      { onConflict: "profile_id" }
    );
}

// Retrouve le profile_id associé à un client Stripe (via les métadonnées de
// l'abonnement, ou en dernier recours via la table subscriptions existante).
async function trouverProfileId(subscription: Stripe.Subscription): Promise<string | null> {
  if (subscription.metadata?.profile_id) {
    return subscription.metadata.profile_id;
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("profile_id")
    .eq("stripe_customer_id", subscription.customer as string)
    .maybeSingle();
  return data?.profile_id || null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Signature Stripe invalide:", err.message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const profileId = session.client_reference_id;
        if (profileId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertSubscription(profileId, {
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const profileId = await trouverProfileId(subscription);
        if (profileId) {
          await upsertSubscription(profileId, {
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const profileId = await trouverProfileId(subscription);
        if (profileId) {
          await upsertSubscription(profileId, {
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            status: "canceled",
            current_period_end: null,
          });
        }
        break;
      }

      default:
        // Événement non géré, on l'ignore volontairement.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Erreur traitement webhook Stripe:", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
