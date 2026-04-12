const axios = require('axios');

const TOMTOM_API_KEY = 'cOcOyqExivMW88thxXdsJUUkvoJqK40q';
const lat = 48.8566; // Paris
const lon = 2.3522;
const radius = 5000;

async function testTomTom() {
  try {
    console.log('Testing TomTom Search...');
    const url = `https://api.tomtom.com/search/2/categorySearch/gas_station.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lon}&radius=${radius}`;
    const response = await axios.get(url);
    console.log('Status:', response.status);
    console.log('Results count:', response.data.results.length);
    if (response.data.results.length > 0) {
      console.log('First result:', response.data.results[0].poi.name);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Data:', JSON.stringify(error.response.data));
    }
  }
}

testTomTom();
