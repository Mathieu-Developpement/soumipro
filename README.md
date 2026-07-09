# SoumiPro — Premier jet (MVP)

Générateur de soumissions pour artisans québécois. Texte libre ou formulaire → IA (Gemini) → révision → PDF marque blanche.

## Ce qui est inclus dans ce premier jet

- Authentification (inscription / connexion) via Supabase
- Profil artisan : logo, couleurs, taux horaire, infos d'entreprise, TPS/TVQ
- Création de soumission en 2 modes : texte libre (IA) ou formulaire vide
- Écran de révision : édition des lignes, calcul TPS/TVQ en direct, jamais d'envoi automatique
- Génération de PDF final avec le logo/couleurs de l'artisan, **aucune trace de SoumiPro**
- Liste des soumissions avec statut

## Ce qui N'EST PAS encore fait (prochaines étapes)

- Stripe (abonnement) — la table `subscriptions` existe déjà, mais rien n'est branché
- Envoi du PDF par courriel au client (pour l'instant : téléchargement seulement)
- Personnalisation avancée du gabarit PDF (table `pdf_templates` créée, pas encore utilisée dans l'interface)
- Gestion des statuts (marquer "envoyée", "acceptée", "refusée") — la colonne existe, pas encore de bouton

## Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Créer ton projet Supabase

1. Va sur https://supabase.com et crée un nouveau projet
2. Une fois créé, va dans **SQL Editor** et exécute tout le contenu de `supabase/schema.sql`
3. Va dans **Project Settings > API** et récupère :
   - `Project URL`
   - `anon public key`

### 3. Configurer les variables d'environnement

Le fichier `.env.local` existe déjà avec ta clé Gemini. Ajoute-y tes clés Supabase :

```
NEXT_PUBLIC_SUPABASE_URL=ton_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=ta_clé_anon_supabase
GEMINI_API_KEY=déjà_rempli
```

⚠️ **Important — à propos de la clé Gemini fournie** : le format habituel des clés Gemini (Google AI Studio) commence par `AIza...`. La clé que tu m'as donnée commence par `AQ.Ab8...`, ce qui ressemble plutôt à un jeton d'accès temporaire (OAuth) qu'à une clé API standard. Va vérifier dans **Google AI Studio > Get API key** que tu as bien copié la clé API (pas un jeton de session) — sinon les appels à `/api/soumissions/generer` vont échouer avec une erreur d'authentification.

### 4. Lancer le projet

```bash
npm run dev
```

Ouvre http://localhost:3000

## Structure du projet

```
app/
  page.tsx                          → landing page
  inscription/ connexion/           → auth
  dashboard/
    page.tsx                        → liste des soumissions
    profil/                         → config artisan (logo, couleurs, taux)
    soumissions/nouvelle/           → choix du mode + création
    soumissions/[id]/               → écran de révision
  api/
    soumissions/generer/            → appel Gemini (texte libre → items structurés)
    soumissions/[id]/pdf/           → génération du PDF final

components/
  QuoteEditor.tsx                   → éditeur de soumission (client)
  PdfDocument.tsx                   → gabarit du PDF (react-pdf)

lib/
  gemini.ts                         → logique d'appel à l'API Gemini
  supabase/                         → clients Supabase (browser / server / middleware)
  types.ts                          → types partagés

supabase/schema.sql                 → tables + RLS + bucket storage pour les logos
```

## Notes techniques

- Taxes calculées pour le Québec : TPS 5% + TVQ 9,975%, appliquées sur le sous-total.
- Les policies RLS de Supabase garantissent que chaque artisan ne voit que ses propres données.
- Le modèle Gemini utilisé est `gemini-2.5-flash` (gratuit, rapide, largement suffisant pour structurer du texte).
- La génération PDF se fait côté serveur (route Node.js, pas Edge) avec `@react-pdf/renderer`.
