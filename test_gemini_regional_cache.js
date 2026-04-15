// Test script for GeminiRegional API cache improvements
// This simulates the cache behavior and logs

console.log('Testing GeminiRegional API Cache Improvements\n');

// Simulate the cache flow
function simulateCacheFlow() {
    const scenarios = [
        {
            name: 'First request (no cache)',
            localCache: null,
            globalCache: null,
            expected: 'Fetch fresh data'
        },
        {
            name: 'Second request (local cache available)',
            localCache: { data: [{ region: 'europe', name: 'Germany', gasoline: 1.85 }], timestamp: Date.now() - 1000 },
            globalCache: null,
            expected: 'Return local cached result'
        },
        {
            name: 'Local cache expired',
            localCache: { data: [{ region: 'europe', name: 'Germany', gasoline: 1.85 }], timestamp: Date.now() - 7 * 60 * 60 * 1000 },
            globalCache: null,
            expected: 'Fetch fresh data (local expired)'
        },
        {
            name: 'Global cache available',
            localCache: null,
            globalCache: { data: [{ region: 'europe', name: 'France', gasoline: 1.90 }], timestamp: Date.now() - 1000 },
            expected: 'Return global cached result and save to local'
        }
    ];

    scenarios.forEach((scenario, index) => {
        console.log(`\nScenario ${index + 1}: ${scenario.name}`);
        console.log(`  Local cache: ${scenario.localCache ? 'Available' : 'Empty'}`);
        console.log(`  Global cache: ${scenario.globalCache ? 'Available' : 'Empty'}`);
        console.log(`  Expected: ${scenario.expected}`);

        if (scenario.localCache && scenario.localCache.timestamp) {
            const age = Date.now() - scenario.localCache.timestamp;
            const ageHours = (age / (60 * 60 * 1000)).toFixed(1);
            console.log(`  Local cache age: ${ageHours} hours`);
        }
    });
}

// Test the new logging format
console.log('\n--- New Log Format Examples ---\n');
console.log('[GeminiRegional] Returning local cached result for europe in EUR (15 items, 45ms)');
console.log('[GeminiRegional] Returning global cached result for usa in USD (50 items, 120ms)');
console.log('[GeminiRegional] Cache empty or invalid, fetching fresh data for canada in CAD');
console.log('[GeminiRegional] Fetched 20 items for europe in EUR (1500ms, attempt 1)');
console.log('[GeminiRegional] Attempt 1 failed: Network timeout');
console.log('[GeminiRegional] All fetch attempts failed: API unavailable');

// Show cache key generation
console.log('\n--- Cache Key Examples ---\n');
console.log('Local cache key for europe/EUR:', '@gemini_regional_cache_europe_EUR');
console.log('Global cache key for usa/USD:', 'regional_prices_usa_USD');

simulateCacheFlow();

console.log('\n--- Summary of Improvements ---\n');
console.log('1. Added local AsyncStorage cache (6-hour TTL)');
console.log('2. Added retry logic (2 attempts with backoff)');
console.log('3. Improved logging with timing information');
console.log('4. Better error handling and recovery');
console.log('5. Cache maintenance function (clearExpiredRegionalCache)');
console.log('\nThe log message "Cache empty or invalid, fetching fresh data" is now more informative');
console.log('and includes timing metrics for performance monitoring.');