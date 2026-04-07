import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { GOOGLE_AI_API_KEY } from './apiKey';
import type { FuelPrice } from '../types/station';

/* ─────────────────────────────────────────────────────
   Gemini client (lazy-initialised)
   ───────────────────────────────────────────────────── */
let _genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('[Gemini] No Google AI API key configured – add GOOGLE_AI_API_KEY to .env');
    }
    _genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
  }
  return _genAI;
}

/* ─────────────────────────────────────────────────────
   Safety settings – relaxed for commercial data
   ───────────────────────────────────────────────────── */
const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

/* ─────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────── */
export interface GeminiFuelPriceResult {
  prices: FuelPrice[];
  /** ISO 4217 currency that Gemini reported prices in */
  currency: string;
  /** Whether prices came from a fresh web search */
  grounded: boolean;
  /** Source attribution hint from grounding (URL or publication) */
  attribution?: string;
}

/* ─────────────────────────────────────────────────────
   Prompt builder
   ───────────────────────────────────────────────────── */
function buildPrompt(
  stationName: string,
  brand: string | undefined,
  address: string,
  currencyCode: string,
): string {
  const brandHint = brand && brand !== stationName ? ` (brand: ${brand})` : '';
  return `
You are a fuel price data assistant. Use Google Search to find the CURRENT fuel prices at this specific gas station:

Station: ${stationName}${brandHint}
Address: ${address}

Task:
1. Search for the latest fuel prices at this station.
2. Return prices in ${currencyCode} if possible, otherwise in the local currency.
3. Respond ONLY with a valid JSON object (no markdown fences, no explanation) in exactly this shape:
{
  "currency": "EUR",
  "prices": [
    { "fuelType": "Petrol 95", "price": 1.75 },
    { "fuelType": "Diesel",    "price": 1.65 },
    { "fuelType": "Petrol 98", "price": 1.88 }
  ],
  "attribution": "source description or URL"
}

Rules:
- Include only fuel types that you actually found prices for.
- Use clear fuel type names (e.g. "Regular Unleaded", "Diesel", "E85", "Premium Unleaded", "LPG", "CNG").
- If you cannot find prices for this station, return: { "currency": "${currencyCode}", "prices": [], "attribution": "" }
- Do NOT invent prices. Only include prices you verified via search.
`.trim();
}

/* ─────────────────────────────────────────────────────
   Main export
   ───────────────────────────────────────────────────── */
/**
 * Fetch real-time fuel prices for a given station using Gemini + Google Search grounding.
 *
 * @param stationName   Display name of the station
 * @param brand         Brand name (e.g. "Shell", "BP")
 * @param address       Full address string
 * @param currencyCode  ISO 4217 target currency (e.g. "EUR", "USD", "GBP")
 * @returns             Parsed fuel prices or an empty array on failure
 */
export async function fetchFuelPricesWithGemini(
  stationName: string,
  brand: string | undefined,
  address: string,
  currencyCode: string,
): Promise<GeminiFuelPriceResult> {
  const fallback: GeminiFuelPriceResult = { prices: [], currency: currencyCode, grounded: false };

  try {
    const client = getClient();
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      safetySettings: SAFETY,
      tools: [{ googleSearch: {} } as any],
    });

    const prompt = buildPrompt(stationName, brand, address, currencyCode);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    /* ── Parse JSON ── */
    // Strip potential markdown code fences just in case
    const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed: { currency?: string; prices?: Array<{ fuelType: string; price: number }>; attribution?: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn('[Gemini] Failed to parse JSON response:', jsonStr.slice(0, 200));
      return fallback;
    }

    if (!Array.isArray(parsed.prices) || parsed.prices.length === 0) {
      return fallback;
    }

    const currency = parsed.currency ?? currencyCode;
    const prices: FuelPrice[] = parsed.prices
      .filter((p) => typeof p.fuelType === 'string' && typeof p.price === 'number' && p.price > 0)
      .map((p) => ({
        fuelType: p.fuelType,
        price: p.price,
        currency,
        lastUpdated: new Date().toISOString(),
      }));

    /* ── Check grounding metadata ── */
    const candidates = response.candidates ?? [];
    const groundingMeta = (candidates[0] as any)?.groundingMetadata;
    const grounded = !!(groundingMeta?.groundingChunks?.length);
    const attribution = parsed.attribution || groundingMeta?.webSearchQueries?.[0] || undefined;

    return { prices, currency, grounded, attribution };
  } catch (err) {
    console.warn('[Gemini] fetchFuelPricesWithGemini error:', (err as Error).message);
    return fallback;
  }
}
