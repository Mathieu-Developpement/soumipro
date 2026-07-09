import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { PdfTemplate, Profile, Quote, QuoteItem } from "@/lib/types";

function polices(fontStyle: "moderne" | "classique") {
  return fontStyle === "classique"
    ? { regular: "Times-Roman", bold: "Times-Bold" }
    : { regular: "Helvetica", bold: "Helvetica-Bold" };
}

function styles(primary: string, accent: string, fontStyle: "moderne" | "classique") {
  const f = polices(fontStyle);
  return StyleSheet.create({
    page: { padding: 40, fontSize: 10, color: "#1a1a1a", fontFamily: f.regular },
    headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
    businessName: { fontSize: 18, fontFamily: f.bold, color: primary },
    businessInfo: { fontSize: 9, color: "#555", marginTop: 2 },
    logo: { width: 60, height: 60, objectFit: "contain" },
    title: { fontSize: 14, fontFamily: f.bold, color: primary, marginBottom: 4 },
    section: { marginBottom: 16 },
    label: { fontSize: 8, color: "#888", textTransform: "uppercase", marginBottom: 2 },
    value: { fontSize: 10, marginBottom: 8 },
    table: { marginTop: 8, borderTopWidth: 1, borderTopColor: "#ddd" },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: accent,
      color: "#fff",
      paddingVertical: 6,
      paddingHorizontal: 6,
      fontSize: 9,
      fontFamily: f.bold,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 6,
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
      fontSize: 9,
    },
    colDesc: { flex: 4 },
    colQty: { flex: 1, textAlign: "right" },
    colUnit: { flex: 1, textAlign: "right" },
    colPrice: { flex: 1.2, textAlign: "right" },
    colTotal: { flex: 1.2, textAlign: "right" },
    totalsBox: { marginTop: 12, alignSelf: "flex-end", width: 220 },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
    totalsFinal: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 6,
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: "#ddd",
      fontFamily: f.bold,
      fontSize: 11,
      color: primary,
    },
    notesBox: { marginTop: 20, padding: 10, backgroundColor: "#f7f7f7", borderRadius: 4 },
    termsBox: { marginTop: 10 },
    footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#999", textAlign: "center" },
    accentBar: { height: 3, backgroundColor: accent, marginBottom: 20 },
  });
}

const GABARIT_PAR_DEFAUT: PdfTemplate = {
  id: "",
  profile_id: "",
  show_logo: true,
  accent_color: "#3fa34d",
  font_style: "moderne",
  show_tax_details: true,
  footer_text: "",
  terms_conditions:
    "Cette soumission est valide pour 30 jours à partir de la date d'émission, sauf indication contraire ci-dessus.",
};

export default function PdfDocument({
  quote,
  items,
  profile,
  template,
}: {
  quote: Quote;
  items: QuoteItem[];
  profile: Profile;
  template?: PdfTemplate | null;
}) {
  const gabarit = template || GABARIT_PAR_DEFAUT;
  const s = styles(
    profile.primary_color || "#0f2942",
    gabarit.accent_color || "#3fa34d",
    gabarit.font_style || "moderne"
  );

  const fmt = (n: number) =>
    n.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });

  const afficherLogo = gabarit.show_logo && !!profile.logo_url;
  const afficherTaxes = gabarit.show_tax_details;

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.businessName}>{profile.business_name}</Text>
            {profile.address && <Text style={s.businessInfo}>{profile.address}</Text>}
            {profile.phone && <Text style={s.businessInfo}>{profile.phone}</Text>}
            {profile.contact_email && <Text style={s.businessInfo}>{profile.contact_email}</Text>}
            {profile.gst_number && <Text style={s.businessInfo}>TPS: {profile.gst_number}</Text>}
            {profile.qst_number && <Text style={s.businessInfo}>TVQ: {profile.qst_number}</Text>}
          </View>
          {afficherLogo && <Image style={s.logo} src={profile.logo_url as string} />}
        </View>

        <View style={s.accentBar} />

        <Text style={s.title}>Soumission {quote.project_title ? `: ${quote.project_title}` : ""}</Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
          <View>
            <Text style={s.label}>Client</Text>
            <Text style={s.value}>{quote.client_name}</Text>
            {quote.client_address && <Text style={s.businessInfo}>{quote.client_address}</Text>}
            {quote.client_phone && <Text style={s.businessInfo}>{quote.client_phone}</Text>}
            {quote.client_email && <Text style={s.businessInfo}>{quote.client_email}</Text>}
          </View>
          <View>
            <Text style={s.label}>Date</Text>
            <Text style={s.value}>{new Date(quote.created_at).toLocaleDateString("fr-CA")}</Text>
            {quote.valid_until && (
              <>
                <Text style={s.label}>Valide jusqu&apos;au</Text>
                <Text style={s.value}>{new Date(quote.valid_until).toLocaleDateString("fr-CA")}</Text>
              </>
            )}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={s.colDesc}>Description</Text>
            <Text style={s.colQty}>Qté</Text>
            <Text style={s.colUnit}>Unité</Text>
            <Text style={s.colPrice}>Prix unit.</Text>
            <Text style={s.colTotal}>Total</Text>
          </View>
          {items.map((item) => (
            <View style={s.tableRow} key={item.id}>
              <Text style={s.colDesc}>{item.description}</Text>
              <Text style={s.colQty}>{item.quantity}</Text>
              <Text style={s.colUnit}>{item.unit}</Text>
              <Text style={s.colPrice}>{fmt(item.unit_price)}</Text>
              <Text style={s.colTotal}>{fmt(item.quantity * item.unit_price)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totalsBox}>
          {afficherTaxes ? (
            <>
              <View style={s.totalsRow}>
                <Text>Sous-total</Text>
                <Text>{fmt(quote.subtotal)}</Text>
              </View>
              <View style={s.totalsRow}>
                <Text>TPS (5%)</Text>
                <Text>{fmt(quote.gst_amount)}</Text>
              </View>
              <View style={s.totalsRow}>
                <Text>TVQ (9,975%)</Text>
                <Text>{fmt(quote.qst_amount)}</Text>
              </View>
            </>
          ) : null}
          <View style={s.totalsFinal}>
            <Text>Total{afficherTaxes ? "" : " (taxes incluses)"}</Text>
            <Text>{fmt(quote.total)}</Text>
          </View>
        </View>

        {quote.notes && (
          <View style={s.notesBox}>
            <Text style={s.label}>Notes</Text>
            <Text style={{ fontSize: 9 }}>{quote.notes}</Text>
          </View>
        )}

        {gabarit.terms_conditions && (
          <View style={s.termsBox}>
            <Text style={{ fontSize: 8, color: "#888" }}>{gabarit.terms_conditions}</Text>
          </View>
        )}

        {gabarit.footer_text && <Text style={s.footer}>{gabarit.footer_text}</Text>}
      </Page>
    </Document>
  );
}
