const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('https://geminifuelprices-c4odibrtkq-uc.a.run.app', {
      stationName: 'Sasol',
      brand: 'Sasol',
      address: 'Jan K. Marais Avenue & Silver Pine Avenue, Malanshof, Randburg, 2194, South Africa',
      currencyCode: 'ZAR'
    });
    console.log("SUCCESS:", res.data);
  } catch (e) {
    console.error("ERROR:", e.response ? e.response.data : e.message);
  }
}

test();
