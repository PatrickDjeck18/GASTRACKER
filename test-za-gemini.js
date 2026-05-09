require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const genAI = new GoogleGenerativeAI('AIzaSyDLEMzVHSYVEsgeqG1mTyFbdNmk4weJ6Ys');
  
  const SAFETY = [
    { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  ];

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    safetySettings: SAFETY,
    tools: [{ googleSearch: {} }],
  });

  const prompt = `You are a fuel price data assistant. Use Google Search to find the CURRENT fuel prices at this specific gas station:

Station: Sasol
Address: Jan K. Marais Avenue & Silver Pine Avenue, Malanshof, Randburg, 2194, South Africa
Task: Return ONLY JSON.
{"currency":"ZAR","prices":[{"fuelType":"Petrol 95","price":20.50},{"fuelType":"Diesel","price":21.20}]}
`;

  try {
    const result = await model.generateContent(prompt);
    console.log("Response:", result.response.text());
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
