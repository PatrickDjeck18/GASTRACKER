const axios = require('axios');

async function testFirebaseFunction() {
  try {
    console.log('Testing Firebase Function: tomtomCategorySearch');
    const url = 'https://us-central1-fuelprice-d64ae.cloudfunctions.net/tomtomCategorySearch';
    const payload = {
      lat: 48.8566,
      lon: 2.3522,
      radius: 5000,
      limit: 50,
      categorySet: '7311'
    };
    const response = await axios.post(url, payload);
    console.log('Status:', response.status);
    console.log('Results count:', response.data.results.length);
    if (response.data.results.length > 0) {
        console.log('First result:', response.data.results[0].poi.name);
    }
  } catch (error) {
    if (error.response) {
      console.error('Error Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testFirebaseFunction();
