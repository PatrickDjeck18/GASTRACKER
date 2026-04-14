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
  concurrency: 40,
  memory: '1GiB',
  timeoutSeconds: 300
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
      logger.info(`Gemini Fuel Prices start: ${stationName} in ${address}`);
      if (!key) throw new Error('Missing Gemini/Firebase API Key');

      const brandHint = brand && brand !== stationName ? ` (brand: ${brand})` : '';
      const prompt = `Return JSON with current fuel prices for: ${stationName}, ${address}. Format: {"currency": "${currencyCode}", "prices": [{"fuelType": "Diesel", "price": 1.65}, {"fuelType": "Regular", "price": 1.55}], "attribution": "Google Search"}. If unknown: {"currency": "${currencyCode}", "prices": [], "attribution": ""}`;

      const client = new GoogleGenerativeAI(key);
      const model = client.getGenerativeModel({
        model: 'gemini-3.1-flash-lite-preview',
        tools: [{ googleSearch: {} }],
        generationConfig: { responseMimeType: 'application/json' }
      });

      const startModel = Date.now();
      const result = await model.generateContent(prompt);
      const modelDuration = Date.now() - startModel;
      logger.info(`Gemini Model Duration: ${modelDuration}ms for ${stationName}`);
      const response = result.response;
      let text = response.text().trim();
      // Clean markdown if present
      const cleanText = text.replace(/```json\n?|```/g, '').trim();
      let parsed = { prices: [], currency: currencyCode, attribution: "" };
      try {
        parsed = JSON.parse(cleanText);
      } catch(e) {
        logger.error('Gemini Raw Response:', text);
        throw new Error('Failed to parse Gemini JSON: ' + (text.length > 100 ? text.substring(0, 100) + '...' : text));
      }
      
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
      const { region } = req.body || {};
      const key = process.env.GOOGLE_AI_API_KEY || process.env.FIREBASE_API_KEY;
      if (!key) throw new Error('Missing Gemini/Firebase API Key');

      let desc = 'all major European countries';
      if (region === 'usa') { desc = 'all US states'; }
      if (region === 'canada') { desc = 'all Canadian provinces'; }

      const prompt = `Return a JSON array of CURRENT estimated fuel prices for ${desc}. IMPORTANT: Prices MUST be exact and strictly ONLY in the local currency of each specific location. Format: [{"region": "${region}", "name": "Country Name", "currency": "LOCAL_CURRENCY_CODE", "gasoline": 1.55, "diesel": 1.65, "lpg": null, "midGrade": null, "premium": null}]. Include 15 major locations.`;

      const client = new GoogleGenerativeAI(key);
      logger.info(`Gemini Regional Prices start: ${region}`);
      const model = client.getGenerativeModel({
        model: 'gemini-3.1-flash-lite-preview',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const startModel = Date.now();
      const result = await model.generateContent(prompt);
      const modelDuration = Date.now() - startModel;
      logger.info(`Gemini Regional Model Duration: ${modelDuration}ms`);
      const response = result.response;
      let text = response.text().trim();
      const cleanText = text.replace(/```json\n?|```/g, '').trim();
      let parsed = [];
      try {
        parsed = JSON.parse(cleanText);
      } catch(e) {
        logger.error('Gemini Regional Raw Response:', text);
        throw new Error('Failed to parse Gemini JSON: ' + (text.length > 100 ? text.substring(0, 100) + '...' : text));
      }

      res.json({ success: true, result: parsed });
    } catch (err) {
      logger.error('Gemini Regional Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

