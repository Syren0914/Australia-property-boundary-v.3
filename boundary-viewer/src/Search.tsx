import { useState, useEffect, useRef } from 'react';

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
  bbox?: [number, number, number, number];
  properties: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface SearchProps {
  onLocationSelect: (result: SearchResult) => void;
  mapCenter: [number, number];
}

export const Search: React.FC<SearchProps> = ({ onLocationSelect, mapCenter }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search requests
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    console.log('Performing search for:', searchQuery);
    setIsLoading(true);
    try {
      // Use the correct MapTiler geocoding API endpoint
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(searchQuery + ' Australia')}.json?key=s9pdXU8BxZTbUAwzlkhL&limit=12`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Search API response:', data);
        const results: SearchResult[] = data.features?.map((feature: any) => ({
          id: feature.id,
          place_name: feature.place_name,
          center: feature.center,
          bbox: feature.bbox,
          properties: {
            address: feature.properties?.address,
            city: feature.properties?.city,
            state: feature.properties?.state,
            country: feature.properties?.country,
          }
        })) || [];
        
        console.log('All results:', results);
        
        // Filter for Australian results
        const australianResults = results.filter(result => 
          result.properties.country === 'Australia' || 
          result.properties.country === 'AU' ||
          result.place_name.toLowerCase().includes('australia') ||
          result.place_name.toLowerCase().includes('nsw') ||
          result.place_name.toLowerCase().includes('vic') ||
          result.place_name.toLowerCase().includes('qld') ||
          result.place_name.toLowerCase().includes('wa') ||
          result.place_name.toLowerCase().includes('sa') ||
          result.place_name.toLowerCase().includes('tas') ||
          result.place_name.toLowerCase().includes('nt') ||
          result.place_name.toLowerCase().includes('act')
        );
        
        console.log('Australian results:', australianResults);
        
        setSuggestions(australianResults);
        setShowSuggestions(australianResults.length > 0);
        setSelectedIndex(-1);
      } else {
        console.error('Search API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('Input changed to:', value);
    setQuery(value);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex]);
      } else if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (result: SearchResult) => {
    onLocationSelect(result);
    setQuery(result.place_name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log('Input focused, suggestions length:', suggestions.length);
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
    e.target.style.borderColor = '#3b82f6';
    e.target.style.boxShadow = '0 0 0 1px #3b82f6';
  };

  const getHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="font-semibold text-blue-600 bg-blue-100">
          {part}
        </span>
      ) : part
    );
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder="Search Australia..."
          style={{
            width: '100%',
            padding: '4px 8px',
            paddingLeft: '24px',
            paddingRight: '24px',
            fontSize: '12px',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            outline: 'none',
            transition: 'all 0.2s'
          }}

          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db';
            e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
          }}
        />
        
        {/* Search Icon */}
        {/* <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div> */}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            {/* <svg className="animate-spin h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg> */}
          </div>
        )}

        {/* Clear Button */}
        {query && !isLoading && (
          <button
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setShowSuggestions(false);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
          >
            {/* <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg> */}
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          zIndex: 9999,
          width: '100%',
          marginTop: '4px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          maxHeight: '320px',
          overflowY: 'auto'
        }}>
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                backgroundColor: index === selectedIndex ? '#eff6ff' : 'transparent',
                borderLeft: index === selectedIndex ? '4px solid #3b82f6' : 'none',
                borderTopLeftRadius: index === 0 ? '8px' : '0',
                borderTopRightRadius: index === 0 ? '8px' : '0',
                borderBottomLeftRadius: index === suggestions.length - 1 ? '8px' : '0',
                borderBottomRightRadius: index === suggestions.length - 1 ? '8px' : '0'
              }}
              onMouseOver={(e) => {
                if (index !== selectedIndex) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseOut={(e) => {
                if (index !== selectedIndex) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {/* Location Icon */}
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  <svg style={{ width: '16px', height: '16px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                    {getHighlightedText(suggestion.place_name, query)}
                  </div>
                  {suggestion.properties.address && (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {suggestion.properties.address}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showSuggestions && suggestions.length === 0 && query.trim().length >= 2 && !isLoading && (
        <div style={{
          position: 'absolute',
          zIndex: 9999,
          width: '100%',
          marginTop: '4px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          padding: '16px'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
            No Australian locations found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
}; 