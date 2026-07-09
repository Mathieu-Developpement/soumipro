import type { GeneratedQuoteDraft } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * IMPORTANT (garde-fou métier) :
 * Gemini ne fait JAMAIS de calcul de prix de sa propre initiative.
 * Il reçoit le taux horaire déjà configuré par l'artisan et s'en sert
 * uniquement comme référence pour suggérer des prix RAISONNABLES sur les
 * lignes de main d'œuvre. Le résultat est TOUJOURS un brouillon éditable,
 * jamais envoyé directement au client. La révision humaine est obligatoire
 * (voir écran de révision après génération).
 */

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    project_title: {
      type: "string",
      description: "Titre court du projet, ex: 'Réparation de toiture'",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unit: {
            type: "string",
            description:
              "Unité: heure, unité, pied carré, mètre, jour, forfait, etc.",
          },
          unit_price: {
            type: "number",
            description: "Prix unitaire suggéré en dollars canadiens",
          },
        },
        required: ["description", "quantity", "unit", "unit_price"],
      },
    },
    notes: {
      type: "string",
      description:
        "Notes ou exclusions pertinentes à mentionner sur la soumission (ex: matériaux non inclus, accès requis, etc.)",
    },
  },
  required: ["project_title", "items", "notes"],
};

export async function generateQuoteDraft(
  description: string,
  hourlyRate: number,
  trade?: string
): Promise<GeneratedQuoteDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante dans les variables d'environnement");
  }

  const systemInstruction = `Tu es un assistant qui aide des artisans québécois (${
    trade || "tous corps de métier"
  }) à structurer des soumissions à partir d'une description en langage naturel.

Règles strictes :
- Tu structures et estimes, tu ne fixes JAMAIS un prix final définitif : ce sont des suggestions que l'artisan va réviser.
- Utilise ${hourlyRate}$/heure comme taux horaire de référence pour les lignes de main d'œuvre, sauf si le texte mentionne un taux différent.
- Décompose le travail en lignes distinctes et claires (main d'œuvre séparée des matériaux quand c'est pertinent).
- Reste réaliste et prudent dans les quantités et prix suggérés.
- Réponds uniquement en français québécois professionnel, adapté à un document d'affaires.
- Si des informations manquent pour estimer une ligne, indique une quantité raisonnable par défaut plutôt que d'inventer des détails non mentionnés.`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: description }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erreur API Gemini (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Réponse vide ou inattendue de Gemini");
  }

  try {
    return JSON.parse(text) as GeneratedQuoteDraft;
  } catch {
    throw new Error("Impossible d'interpréter la réponse de Gemini comme JSON");
  }
}
