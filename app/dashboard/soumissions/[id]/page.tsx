import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuoteEditor from "@/components/QuoteEditor";
import type { Profile, Quote, QuoteItem } from "@/lib/types";

export default async function SoumissionPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return notFound();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", params.id)
    .eq("profile_id", userData.user.id)
    .single();

  if (!quote) return notFound();

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

  return (
    <QuoteEditor
      initialQuote={quote as Quote}
      initialItems={(items as QuoteItem[]) || []}
      profile={profile as Profile}
    />
  );
}
