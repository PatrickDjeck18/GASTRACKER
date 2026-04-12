const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');

// Options for TomTom functions
const TOMTOM_OPTS = { 
  region: 'us-central1',
  secrets: ['TOMTOM_API_KEY']
};

// Options for Gemini functions
const GEMINI_OPTS = {
  region: 'us-central1',
  secrets: ['GOOGLE_AI_API_KEY'],
  concurrency: 80,
  memory: '512MiB'
};

/**
 * Standard CORS wrapper
 */
function withCors(req, res, callback) {
  const cors = require('cors')({ origin: true });
  return cors(req, res, callback);
}

exports.tomtomCategorySearch = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const axios = require('axios');
      const { lat, lon, radius = 5000, limit = 50, categorySet = '7311' } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      
      if (!key) {
        logger.error('TOMTOM_API_KEY is missing from environment/secrets');
        return res.status(500).json({ error: 'Missing TOMTOM_API_KEY' });
      }

      // Log part of the key for debugging (first 4 and last 4)
      const maskedKey = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
      logger.info(`TomTom Search [${maskedKey}] near ${lat},${lon} (radius: ${radius}, cat: ${categorySet})`);
      
      // Use 7311 (Gas Station) directly in the URL if it's the requested category
      const searchCat = categorySet === '7311' ? '7311' : 'gas_station';
      
      const { data } = await axios.get(`https://api.tomtom.com/search/2/categorySearch/${searchCat}.json`, {
        params: { 
          key, 
          lat, 
          lon, 
          radius, 
          limit,
          view: 'Unified'
        },
        headers: {
          'User-Agent': 'FuelPriceApp/1.0.0 (Node.js)'
        },
        timeout: 10000 
      });
      
      logger.info(`TomTom success: Found ${data.results?.length || 0} stations`);
      res.json(data);
    } catch (err) {
      const status = err.response?.status || 500;
      const data = err.response?.data || {};
      logger.error(`TomTom Search Error [${status}]: ${err.message}`, { details: data });
      
      res.status(status).json({ 
        error: err.message, 
        status, 
        details: data,
        hint: status === 403 ? 'Verify the key is unrestricted and has Search API permissions enabled.' : undefined
      });
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
      logger.error(err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

exports.tomtomReverseGeocode = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const axios = require('axios');
      const { lat, lon } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      if (!key) throw new Error('Missing TOMTOM_API_KEY');

      const { data } = await axios.get(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json`, {
        params: { key },
      });
      res.json(data);
    } catch (err) {
      logger.error(err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

exports.tomtomSearchLocation = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const axios = require('axios');
      const { query, lat, lon, limit = 8, language = 'en-US', typeahead = true } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      if (!key) throw new Error('Missing TOMTOM_API_KEY');

      const { data } = await axios.get(`https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json`, {
        params: { key, lat, lon, limit, language, typeahead },
      });
      res.json(data);
    } catch (err) {
      logger.error(err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

exports.tomtomGeocode = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const axios = require('axios');
      const { query, limit = 1 } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      if (!key) throw new Error('Missing TOMTOM_API_KEY');

      const { data } = await axios.get(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json`, {
        params: { key, limit },
      });
      res.json(data);
    } catch (err) {
      logger.error(err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

exports.tomtomTrafficFlow = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const axios = require('axios');
      const { lat, lon, zoom = 15, unit = 'KMPH' } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      if (!key) throw new Error('Missing TOMTOM_API_KEY');

      const { data } = await axios.get(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/${zoom}/json`, {
        params: { key, point: `${lat},${lon}`, unit },
      });
      res.json(data);
    } catch (err) {
      logger.error(err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

exports.tomtomTrafficIncidents = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const axios = require('axios');
      const { lat, lon, radiusKm = 5, fields, language, categoryFilter, timeValidityFilter } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      if (!key) throw new Error('Missing TOMTOM_API_KEY');

      const delta = radiusKm / 111;
      const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
      const { data } = await axios.get('https://api.tomtom.com/traffic/services/5/incidentDetails', {
        params: { key, bbox, fields, language, categoryFilter, timeValidityFilter },
      });
      res.json(data);
    } catch (err) {
      logger.error(err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

exports.tomtomRoute = onRequest(TOMTOM_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const axios = require('axios');
      const { originLat, originLon, destLat, destLon, travelMode, traffic, routeType, language } = req.body || {};
      const key = process.env.TOMTOM_API_KEY;
      if (!key) throw new Error('Missing TOMTOM_API_KEY');

      const locations = `${originLat},${originLon}:${destLat},${destLon}`;
      const { data } = await axios.get(`https://api.tomtom.com/routing/1/calculateRoute/${locations}/json`, {
        params: { key, travelMode, traffic, routeType, language },
      });
      res.json(data);
    } catch (err) {
      logger.error(err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

exports.geminiFuelPrices = onRequest(GEMINI_OPTS, (req, res) => {
  return withCors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const { stationName, brand, address, currencyCode } = req.body || {};
      const key = process.env.GOOGLE_AI_API_KEY || process.env.FIREBASE_API_KEY;
      if (!key) throw new Error('Missing Gemini/Firebase API Key');

      const brandHint = brand && brand !== stationName ? ` (brand: ${brand})` : '';
      const prompt = `
You are a fuel price data assistant. Use Google Search to find the CURRENT fuel prices at this specific gas station:
Station: ${stationName}${brandHint}
Address: ${address}
Respond ONLY with JSON:
{
  "currency": "${currencyCode}",
  "prices": [{ "fuelType": "Diesel", "price": 1.65 }],
  "attribution": "source description or URL"
}
If not found return: {"currency":"${currencyCode}","prices":[],"attribution":""}
`.trim();

      const client = new GoogleGenerativeAI(key);
      const model = client.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ google_search: {} }],
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text().trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(text);
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

      const groundingMeta = response.candidates?.[0]?.groundingMetadata;
      const attribution = parsed.attribution || (groundingMeta?.webSearchQueries?.[0]) || '';
      
      res.json({ prices, currency, grounded: !!groundingMeta, attribution });
    } catch (err) {
      logger.error(err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

