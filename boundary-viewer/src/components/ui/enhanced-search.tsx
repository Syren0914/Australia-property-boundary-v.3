import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SearchIcon, MapPin, Clock, Star, Filter, X } from 'lucide-react';
import { EnhancedButton } from './enhanced-button';
import { EnhancedCard } from './enhanced-card';

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
  relevance?: number;
  type?: 'address' | 'landmark' | 'area';
}

interface EnhancedSearchProps {
  onLocationSelect: (result: SearchResult) => void;
  placeholder?: string;
  showRecentSearches?: boolean;
  showSuggestions?: boolean;
  maxSuggestions?: number;
  className?: string;
}

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  onLocationSelect,
  placeholder = "Search for an address...",
  showRecentSearches = true,
  showSuggestions = true,
  maxSuggestions = 8,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Global search (no regional bounds)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (query.trim().length >= 2) {
      const debounceTime = isMobile ? 400 : 200;
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, debounceTime);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, isMobile]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, { passive: true } as any);
    return () => document.removeEventListener('mousedown', handleClickOutside as any);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    try {
      const googleKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_KEY as string | undefined;
      if (!googleKey) {
        console.error('Missing VITE_GOOGLE_MAPS_KEY');
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      const params = new URLSearchParams({
        address: searchQuery,
        key: googleKey
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
        { signal: abortControllerRef.current.signal }
      );
      
      if (response.ok) {
        const data = await response.json();
        const results: SearchResult[] = data.results?.map((result: any, index: number) => ({
          id: `google_${index}_${Date.now()}`,
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
          },
          type: result.types?.includes('street_address') ? 'address' : 
                result.types?.includes('establishment') ? 'landmark' : 'area'
        })) || [];
        
        const filteredResults = results.slice(0, maxSuggestions);
        
        setSuggestions(filteredResults);
        setShowDropdown(filteredResults.length > 0);
        setSelectedIndex(-1);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Search error:', error);
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  }, [maxSuggestions]);

  const handleSelect = useCallback((result: SearchResult) => {
    onLocationSelect(result);
    setQuery(result.place_name);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();

    // Add to recent searches
    const updatedRecent = [result, ...recentSearches.filter(r => r.id !== result.id)].slice(0, 5);
    setRecentSearches(updatedRecent);
    localStorage.setItem('recentSearches', JSON.stringify(updatedRecent));
  }, [onLocationSelect, recentSearches]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const allItems = [...(showRecentSearches && query.length < 2 ? recentSearches : []), ...suggestions];
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => prev < allItems.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex]);
      } else if (allItems.length > 0) {
        handleSelect(allItems[0]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  }, [suggestions, selectedIndex, recentSearches, showRecentSearches, query, handleSelect]);

  const getHighlightedText = useCallback((text: string, query: string) => {
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
  }, []);

  const formatAddress = useCallback((result: SearchResult) => {
    const props = result.properties;
    const parts = [] as string[];
    
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
    
    // Region/state and postal code
    if (props.state && props.postcode) {
      parts.push(`${props.state} ${props.postcode}`);
    } else if (props.state) {
      parts.push(props.state);
    } else if (props.postcode) {
      parts.push(props.postcode);
    }

    // Country (fallback/global)
    if (props.country) {
      parts.push(props.country);
    }
    
    return parts.join(', ');
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  }, []);

  const getResultIcon = (result: SearchResult) => {
    switch (result.type) {
      case 'address':
        return <MapPin size={16} />;
      case 'landmark':
        return <Star size={16} />;
      default:
        return <MapPin size={16} />;
    }
  };

  const renderSuggestionItem = (result: SearchResult, index: number, isRecent = false) => (
    <div
      key={result.id}
      onClick={() => handleSelect(result)}
      style={{
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        backgroundColor: index === selectedIndex ? '#eff6ff' : 'transparent',
        borderLeft: index === selectedIndex ? '4px solid #3b82f6' : 'none',
        borderRadius: index === 0 ? '8px 8px 0 0' : index === suggestions.length - 1 ? '0 0 8px 8px' : '0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
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
      <div style={{ flexShrink: 0, marginTop: '2px', color: isRecent ? '#6b7280' : '#3b82f6' }}>
        {isRecent ? <Clock size={16} /> : getResultIcon(result)}
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
          {getHighlightedText(result.place_name, query)}
        </div>
        {result.properties.housenumber && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {formatAddress(result)}
          </div>
        )}
        {isRecent && (
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
            Recent search
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%' }} className={className}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            if (suggestions.length > 0 || (showRecentSearches && recentSearches.length > 0)) {
              setShowDropdown(true);
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: isMobile ? '12px 16px' : '14px 20px',
            paddingLeft: isMobile ? '44px' : '48px',
            fontSize: isMobile ? '14px' : '16px',
            backgroundColor: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '30px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            color: '#333',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            WebkitAppearance: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        />
        
        <div style={{ 
          position: 'absolute', 
          left: isMobile ? '12px' : '16px', 
          top: '50%', 
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: '#6b7280'
        }}>
          <SearchIcon size={isMobile ? 18 : 20} />
        </div>

        {isLoading && (
          <div style={{ 
            position: 'absolute', 
            right: isMobile ? '12px' : '16px', 
            top: '50%', 
            transform: 'translateY(-50%)'
          }}>
            <div style={{ 
              width: isMobile ? '16px' : '18px', 
              height: isMobile ? '16px' : '18px', 
              border: '2px solid #e5e7eb',
              borderTop: '2px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        )}

        {query && !isLoading && (
          <button
            onClick={clearSearch}
            style={{
              position: 'absolute',
              right: isMobile ? '12px' : '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280',
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              padding: '4px',
              borderRadius: '4px',
              fontSize: isMobile ? '16px' : '18px',
              WebkitTapHighlightColor: 'transparent'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#374151'}
            onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Enhanced Dropdown */}
      {showDropdown && (suggestions.length > 0 || (showRecentSearches && query.length < 2 && recentSearches.length > 0)) && (
        <div style={{
          position: 'absolute',
          zIndex: 50,
          width: '100%',
          marginTop: '8px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          maxHeight: isMobile ? '300px' : '400px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {/* Recent Searches */}
          {showRecentSearches && query.length < 2 && recentSearches.length > 0 && (
            <>
              <div style={{
                padding: '12px 16px 8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Recent Searches
              </div>
              {recentSearches.slice(0, 3).map((result, index) => 
                renderSuggestionItem(result, index, true)
              )}
            </>
          )}

          {/* Search Results */}
          {suggestions.length > 0 && (
            <>
              {showRecentSearches && query.length < 2 && recentSearches.length > 0 && (
                <div style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  backgroundColor: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Search Results
                </div>
              )}
              {suggestions.map((suggestion, index) => 
                renderSuggestionItem(suggestion, index + (showRecentSearches && query.length < 2 && recentSearches.length > 0 ? recentSearches.length : 0))
              )}
            </>
          )}
        </div>
      )}

      {/* No Results */}
      {showDropdown && suggestions.length === 0 && query.trim().length >= 2 && !isLoading && (
        <div style={{
          position: 'absolute',
          zIndex: 50,
          width: '100%',
          marginTop: '8px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          padding: isMobile ? '20px' : '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: isMobile ? '14px' : '16px', color: '#6b7280', marginBottom: '8px' }}>
            No addresses found for "{query}"
          </div>
          <div style={{ fontSize: isMobile ? '12px' : '14px', color: '#9ca3af' }}>
            Try a different search term or check spelling
          </div>
        </div>
      )}
    </div>
  );
};
