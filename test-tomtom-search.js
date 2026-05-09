require('dotenv').config();
const axios = require('axios');

async function search() {
    const key = process.env.TOMTOM_API_KEY;
    const query = 'gas station';
    const location = 'Ferndale, Randburg, South Africa';
    
    console.log(`Searching for "${query}" in "${location}"...`);
    
    try {
        // 1. Geocode the location to get lat/lon
        const geoUrl = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(location)}.json?key=${key}&limit=1`;
        const geoRes = await axios.get(geoUrl);
        
        if (!geoRes.data.results || geoRes.data.results.length === 0) {
            console.error('Location not found');
            return;
        }
        
        const { lat, lon } = geoRes.data.results[0].position;
        console.log(`Found coordinates: ${lat}, ${lon}`);
        
        // 2. Search for gas stations near these coordinates
        const searchUrl = `https://api.tomtom.com/search/2/search/${encodeURIComponent('gas station')}.json?key=${key}&lat=${lat}&lon=${lon}&radius=10000&limit=10`;
        const searchRes = await axios.get(searchUrl);
        
        console.log(`Found ${searchRes.data.results.length} results.`);
        
        const stations = searchRes.data.results.map(r => ({
            name: r.poi.name,
            address: r.address.freeformAddress,
            distance: r.dist,
            position: r.position
        }));
        
        console.log('\nFound Stations:');
        stations.forEach((s, i) => {
            console.log(`${i+1}. ${s.name} - ${s.address} (${Math.round(s.distance)}m away)`);
        });
        
    } catch (err) {
        console.error('Error during search:', err.message);
        if (err.response) console.error('Response:', err.response.data);
    }
}

search();
