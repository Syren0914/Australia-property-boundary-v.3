import { useState, useEffect, useRef } from 'react';
import { SearchIcon } from 'lucide-react';

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
    housenumber?: string;
    street?: string;
    suburb?: string;
    postcode?: string;
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

  // Queensland, Australia bounds (approximate)
  const qldBounds = {
    west: 138.0,  // Western boundary
    east: 153.5,  // Eastern boundary  
    south: -29.2, // Southern boundary
    north: -9.0   // Northern boundary
  };

  // Debounce search requests
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 2) {
        console.log('Performing search for:', query);
        performSearch(query);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200); // Reduced debounce time for faster response

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
    setIsLoading(true);
    try {
      // Use Google Geocoding API for better address results
      const params = new URLSearchParams({
        address: searchQuery,
        region: 'au',
        components: 'country:AU|administrative_area:QLD',
        key: 'AIzaSyDWqaq2LaVvqIJgNDEiD7_34MOOyel8d4s'
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`
      );
      
             if (response.ok) {
         const data = await response.json();
         console.log('Google search response:', data);
         const results: SearchResult[] = data.results?.map((result: any, index: number) => ({
           id: `google_${index}_${Date.now()}`, // Unique ID to prevent duplicates
           place_name: result.formatted_address,
           center: [result.geometry.location.lng, result.geometry.location.lat],
           bbox: result.geometry.viewport ? [
             result.geometry.viewport.southwest.lng,
             result.geometry.viewport.southwest.lat,
             result.geometry.viewport.northeast.lng,
             result.geometry.viewport.northeast.lat
           ] : undefined,
           properties: {
             address: result.formatted_address,
             city: result.address_components?.find((comp: any) => comp.types.includes('locality'))?.long_name,
             state: result.address_components?.find((comp: any) => comp.types.includes('administrative_area_level_1'))?.long_name,
             country: result.address_components?.find((comp: any) => comp.types.includes('country'))?.long_name,
             housenumber: result.address_components?.find((comp: any) => comp.types.includes('street_number'))?.long_name,
             street: result.address_components?.find((comp: any) => comp.types.includes('route'))?.long_name,
             suburb: result.address_components?.find((comp: any) => comp.types.includes('sublocality'))?.long_name,
             postcode: result.address_components?.find((comp: any) => comp.types.includes('postal_code'))?.long_name,
           }
         })) || [];
        
        // More inclusive filtering for better address coverage
        const filteredResults = results.filter(result => {
          const properties = result.properties;
          const placeName = result.place_name.toLowerCase();
          
          // Include all results that might be relevant
          if (properties?.country === 'AU') {
            return true;
          }
          
          // Include any result within Queensland bounds
          const [lng, lat] = result.center;
          if (lng >= qldBounds.west && lng <= qldBounds.east && 
              lat >= qldBounds.south && lat <= qldBounds.north) {
            return true;
          }
          
          // Include any result that might be relevant
          return true;
        });
        
        console.log('Filtered results:', filteredResults);
        setSuggestions(filteredResults);
        setShowSuggestions(filteredResults.length > 0);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Search error:', error);
      
             // Fallback search with Google API (no restrictions)
       try {
         const fallbackParams = new URLSearchParams({
           address: searchQuery,
           key: 'AIzaSyDWqaq2LaVvqIJgNDEiD7_34MOOyel8d4s'
         });
         
         const fallbackResponse = await fetch(
           `https://maps.googleapis.com/maps/api/geocode/json?${fallbackParams}`
         );
        
                 if (fallbackResponse.ok) {
           const fallbackData = await fallbackResponse.json();
           console.log('Google fallback response:', fallbackData);
           const fallbackResults: SearchResult[] = fallbackData.results?.map((result: any, index: number) => ({
             id: `google_fallback_${index}_${Date.now()}`,
             place_name: result.formatted_address,
             center: [result.geometry.location.lng, result.geometry.location.lat],
             bbox: result.geometry.viewport ? [
               result.geometry.viewport.southwest.lng,
               result.geometry.viewport.southwest.lat,
               result.geometry.viewport.northeast.lng,
               result.geometry.viewport.northeast.lat
             ] : undefined,
             properties: {
               address: result.formatted_address,
               city: result.address_components?.find((comp: any) => comp.types.includes('locality'))?.long_name,
               state: result.address_components?.find((comp: any) => comp.types.includes('administrative_area_level_1'))?.long_name,
               country: result.address_components?.find((comp: any) => comp.types.includes('country'))?.long_name,
               housenumber: result.address_components?.find((comp: any) => comp.types.includes('street_number'))?.long_name,
               street: result.address_components?.find((comp: any) => comp.types.includes('route'))?.long_name,
               suburb: result.address_components?.find((comp: any) => comp.types.includes('sublocality'))?.long_name,
               postcode: result.address_components?.find((comp: any) => comp.types.includes('postal_code'))?.long_name,
             }
           })) || [];
          
          console.log('Fallback results:', fallbackResults);
          setSuggestions(fallbackResults);
          setShowSuggestions(fallbackResults.length > 0);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
                      } catch (fallbackError) {
           console.error('Google fallback search also failed:', fallbackError);
           setSuggestions([]);
           setShowSuggestions(false);
         }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
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

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
    // Also show suggestions if there's a query and we're focused
    if (query.trim().length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const getHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} style={{ fontWeight: 'bold', color: '#2563eb', backgroundColor: '#dbeafe' }}>
          {part}
        </span>
      ) : part
    );
  };

  const formatAddress = (result: SearchResult) => {
    const props = result.properties;
    const parts = [];
    
    if (props.housenumber && props.street) {
      parts.push(`${props.housenumber} ${props.street}`);
    } else if (props.street) {
      parts.push(props.street);
    }
    
    if (props.suburb) {
      parts.push(props.suburb);
    }
    
    if (props.city && props.city !== props.suburb) {
      parts.push(props.city);
    }
    
    if (props.postcode) {
      parts.push(`QLD ${props.postcode}`);
    } else {
      parts.push('QLD');
    }
    
    return parts.join(', ');
  };

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            handleInputFocus();
            e.target.style.borderColor = '#4285f4';
            e.target.style.boxShadow = '0 0 0 2px rgba(66, 133, 244, 0.2), 0 2px 8px rgba(0,0,0,0.15)';
          }}
          placeholder="Search for an address.."
          style={{
            width: '100%',
            padding: '12px 16px',
            paddingLeft: '40px',
            fontSize: '16px',
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            color: '#333', 
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e0e0e0';
            e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }}
        />
        
        {/* Search Icon */}
        <div style={{ 
          position: 'absolute', 
          scale: '0.7',
          left: '12px', 
          top: '45%', 
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: '#666'
        }}>
          <SearchIcon />
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div style={{ 
            position: 'absolute', 
            right: '8px', 
            top: '50%', 
            transform: 'translateY(-50%)'
          }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              border: '2px solid #e0e0e0',
              borderTop: '2px solid #4285f4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
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
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280',
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              padding: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#374151'}
            onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            ✕
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          zIndex: 50,
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
                borderRadius: index === 0 ? '8px 8px 0 0' : index === suggestions.length - 1 ? '0 0 8px 8px' : '0'
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
                  <svg width="16" height="16" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                    {getHighlightedText(suggestion.place_name, query)}
                  </div>
                  {suggestion.properties.housenumber && (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {formatAddress(suggestion)}
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
          zIndex: 50,
          width: '100%',
          marginTop: '4px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          padding: '16px'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
            No addresses found for "{query}". Try a different search term or check spelling.
          </div>
        </div>
      )}
    </div>
  );
}; 