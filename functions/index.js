const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { logger } = require('firebase-functions');

// Set global options for all v2 functions
setGlobalOptions({ 
  region: 'us-central1'
});

// Common options
const TOMTOM_OPTS = { 
  secrets: ['TOMTOM_API_KEY']
};

const GEMINI_OPTS = {
  secrets: ['GOOGLE_AI_API_KEY'],
  concurrency: 40,
  memory: '1GiB',
  timeoutSeconds: 300
};

/**
 * Standard CORS wrapper with lazy initialization
 */
let corsHandler;
function withCors(req, res, callback) {
  if (!corsHandler) {
    corsHandler = require('cors')({ origin: true });
  }
  return corsHandler(req, res, callback);
}

/* ── TOMTOM FUNCTIONS ──────────────────────────────── */

exports.tomtomCategorySearch = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const axios = require('axios');
      const { lat, lon, radius = 5000, limit = 50, categorySet = '7311' } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      if (!key) throw new Error('Missing TOMTOM_API_KEY');

      const searchCat = categorySet === '7311' ? '7311' : 'gas_station';
      const { data } = await axios.get(`https://api.tomtom.com/search/2/categorySearch/${searchCat}.json`, {
        params: { key, lat, lon, radius, limit, view: 'Unified' },
        headers: { 'User-Agent': 'FuelPriceApp/1.0.0' },
        timeout: 10000 
      });
      res.json(data);
    } catch (err) {
      logger.error('TomTom Search Error:', err.message);
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  });
});

exports.tomtomPoiDetails = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const axios = require('axios');
      const { id, detailsType = 'fuelPrices' } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      if (!key) throw new Error('Missing TOMTOM_API_KEY');
      const { data } = await axios.get('https://api.tomtom.com/search/2/poiDetails.json', {
        params: { key, id, detailsType },
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.tomtomReverseGeocode = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      const axios = require('axios');
      const { lat, lon } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      const { data } = await axios.get(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json`, {
        params: { key },
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.tomtomSearchLocation = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      const axios = require('axios');
      const { query, lat, lon, limit = 8, language = 'en-US', typeahead = true } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      const { data } = await axios.get(`https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json`, {
        params: { key, lat, lon, limit, language, typeahead },
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.tomtomGeocode = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      const axios = require('axios');
      const { query, limit = 1 } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      const { data } = await axios.get(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json`, {
        params: { key, limit },
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.tomtomTrafficFlow = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      const axios = require('axios');
      const { lat, lon, zoom = 15, unit = 'KMPH' } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      const { data } = await axios.get(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/${zoom}/json`, {
        params: { key, point: `${lat},${lon}`, unit },
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.tomtomTrafficIncidents = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      const axios = require('axios');
      const { lat, lon, radiusKm = 5, fields, language, categoryFilter, timeValidityFilter } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      const delta = radiusKm / 111;
      const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
      const { data } = await axios.get('https://api.tomtom.com/traffic/services/5/incidentDetails', {
        params: { key, bbox, fields, language, categoryFilter, timeValidityFilter },
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.tomtomRoute = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      const axios = require('axios');
      const { originLat, originLon, destLat, destLon, travelMode, traffic, routeType, language } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      const locations = `${originLat},${originLon}:${destLat},${destLon}`;
      const { data } = await axios.get(`https://api.tomtom.com/routing/1/calculateRoute/${locations}/json`, {
        params: { key, travelMode, traffic, routeType, language },
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

/* ── GEMINI FUNCTIONS ──────────────────────────────── */

exports.geminiFuelPrices = onRequest(GEMINI_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const { stationName, brand, address, currencyCode } = req.body || {};
      const key = process.env.GOOGLE_AI_API_KEY || process.env.FIREBASE_API_KEY;
      if (!key) throw new Error('Missing Gemini/Firebase API Key');

      const prompt = `Return JSON with current fuel prices for: ${stationName}, ${address}. IMPORTANT: Strictly translate ALL prices into the target currency: ${currencyCode}. Format: {"currency": "${currencyCode}", "prices": [{"fuelType": "Diesel", "price": 1.65}, {"fuelType": "Regular", "price": 1.55}], "attribution": "Google Search"}. If unknown: {"currency": "${currencyCode}", "prices": [], "attribution": ""}`;

      const client = new GoogleGenerativeAI(key);
      const model = client.getGenerativeModel({
        model: 'gemini-3.1-flash-lite-preview',
        tools: [{ googleSearch: {} }],
        generationConfig: { responseMimeType: 'application/json' }
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      let text = response.text().trim();
      const cleanText = text.replace(/```json\n?|```/g, '').trim();
      let parsed = JSON.parse(cleanText);
      
      const currency = parsed.currency || currencyCode;
      const prices = Array.isArray(parsed.prices)
        ? parsed.prices
          .filter((p) => typeof p.fuelType === 'string' && typeof p.price === 'number' && p.price > 0)
          .map((p) => ({
            fuelType: p.fuelType,
            price: p.price,
            currency,
            lastUpdated: new Date().toISOString(),
          }))
        : [];

      res.json({ prices, currency, grounded: true, attribution: parsed.attribution || "Gemini Search" });
    } catch (err) {
      logger.error('Gemini Fuel Prices Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

exports.geminiRegionalPrices = onRequest(GEMINI_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const { region, currencyCode = 'EUR' } = req.body || {};
      const key = process.env.GOOGLE_AI_API_KEY || process.env.FIREBASE_API_KEY;
      if (!key) throw new Error('Missing Gemini/Firebase API Key');

      const normalizedRegion = String(region || 'europe').toLowerCase();
      let desc = 'all major European countries';
      if (normalizedRegion === 'usa') { desc = 'all US states'; }
      else if (normalizedRegion === 'canada') { desc = 'all Canadian provinces'; }
      else if (normalizedRegion === 'australia') { desc = 'all Australian states and territories as well as major cities (Sydney, Melbourne, Brisbane, Perth, Adelaide, Hobart, Canberra, Darwin)'; }
      else if (normalizedRegion === 'europe') { desc = 'all major European countries'; }

      const prompt = `Return a JSON array of CURRENT estimated fuel prices for ${desc}. IMPORTANT: Strictly translate ALL prices into the target currency: ${currencyCode}. Format: [{"region": "${normalizedRegion}", "name": "Location Name", "currency": "${currencyCode}", "gasoline": 1.55, "diesel": 1.65, "lpg": null, "midGrade": 1.75, "premium": 1.85}]. For Australia: gasoline=91, midGrade=95, premium=98. Include at least 20 locations total.`;

      const client = new GoogleGenerativeAI(key);
      const model = client.getGenerativeModel({
        model: 'gemini-3.1-flash-lite-preview',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      let text = response.text().trim();
      const cleanText = text.replace(/```json\n?|```/g, '').trim();
      let parsed = JSON.parse(cleanText);

      res.json({ success: true, result: parsed });
    } catch (err) {
      logger.error('Gemini Regional Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });
});
