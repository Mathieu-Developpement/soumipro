export interface Profile {
  id: string;
  business_name: string;
  trade: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  hourly_rate: number;
  address: string;
  phone: string;
  contact_email: string;
  gst_number: string;
  qst_number: string;
}

export interface PdfTemplate {
  id: string;
  profile_id: string;
  show_logo: boolean;
  accent_color: string;
  font_style: "moderne" | "classique";
  show_tax_details: boolean;
  footer_text: string;
  terms_conditions: string;
}

export type QuoteStatus = "brouillon" | "envoyee" | "acceptee" | "refusee";

export interface Quote {
  id: string;
  profile_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  project_title: string;
  project_description: string;
  status: QuoteStatus;
  subtotal: number;
  gst_amount: number;
  qst_amount: number;
  total: number;
  notes: string;
  valid_until: string | null;
  created_at: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  position: number;
}

// Format renvoyé par Gemini avant d'être sauvegardé en base
export interface GeneratedItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

export interface GeneratedQuoteDraft {
  project_title: string;
  items: GeneratedItem[];
  notes: string;
}
