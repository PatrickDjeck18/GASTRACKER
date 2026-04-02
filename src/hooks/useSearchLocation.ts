import { useState, useCallback, useRef } from 'react';
import { searchLocation, type SearchSuggestion } from '../api/geocoding';

/**
 * Hook for debounced location search using TomTom Search API.
 */
export function useSearchLocation(
  userLat?: number,
  userLon?: number,
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (text: string) => {
      setQuery(text);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!text.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        const suggestions = await searchLocation(text, userLat, userLon);
        setResults(suggestions);
        setLoading(false);
      }, 350);
    },
    [userLat, userLon],
  );

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { query, results, loading, search, clear };
}
