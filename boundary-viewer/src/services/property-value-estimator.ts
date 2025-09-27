// Simple Property Value Estimation Service
// This provides basic property value estimates without requiring paid APIs

export interface PropertyValue {
  id: string;
  center: [number, number];
  value: number;
  area: number;
  type: 'residential' | 'commercial' | 'industrial';
  confidence: 'high' | 'medium' | 'low';
  source: string;
  lastUpdated: string;
  factors: {
    location: number;
    size: number;
    type: number;
    market: number;
  };
}

export class PropertyValueEstimator {
  private baseValues = {
    residential: 450000,
    commercial: 800000,
    industrial: 600000
  };

  private locationMultipliers = {
    // Brisbane CBD and surrounding areas
    'CBD': 2.5,
    'Inner City': 2.0,
    'Suburban': 1.0,
    'Outer Suburban': 0.7,
    'Rural': 0.4
  };

  private sizeMultipliers = {
    small: 0.8,    // < 500 sqm
    medium: 1.0,   // 500-1000 sqm
    large: 1.3,    // 1000-2000 sqm
    xlarge: 1.6    // > 2000 sqm
  };

  estimatePropertyValue(
    coordinates: [number, number],
    area: number = 650,
    type: 'residential' | 'commercial' | 'industrial' = 'residential'
  ): PropertyValue {
    const locationFactor = this.getLocationFactor(coordinates);
    const sizeFactor = this.getSizeFactor(area);
    const typeFactor = this.getTypeFactor(type);
    const marketFactor = this.getMarketFactor();

    const baseValue = this.baseValues[type];
    const estimatedValue = Math.round(
      baseValue * locationFactor * sizeFactor * typeFactor * marketFactor
    );

    return {
      id: `prop_${coordinates[0]}_${coordinates[1]}`,
      center: coordinates,
      value: estimatedValue,
      area: area,
      type: type,
      confidence: this.getConfidenceLevel(locationFactor, sizeFactor),
      source: 'Estimated',
      lastUpdated: new Date().toISOString(),
      factors: {
        location: locationFactor,
        size: sizeFactor,
        type: typeFactor,
        market: marketFactor
      }
    };
  }

  private getLocationFactor(coordinates: [number, number]): number {
    const [lng, lat] = coordinates;
    
    // Brisbane CBD coordinates
    const brisbaneCBD: [number, number] = [153.026, -27.4705];
    const distance = this.calculateDistance(coordinates, brisbaneCBD);
    
    // Determine location type based on distance from CBD
    if (distance < 2) return this.locationMultipliers.CBD;
    if (distance < 5) return this.locationMultipliers['Inner City'];
    if (distance < 15) return this.locationMultipliers.Suburban;
    if (distance < 30) return this.locationMultipliers['Outer Suburban'];
    return this.locationMultipliers.Rural;
  }

  private getSizeFactor(area: number): number {
    if (area < 500) return this.sizeMultipliers.small;
    if (area < 1000) return this.sizeMultipliers.medium;
    if (area < 2000) return this.sizeMultipliers.large;
    return this.sizeMultipliers.xlarge;
  }

  private getTypeFactor(type: string): number {
    switch (type) {
      case 'residential': return 1.0;
      case 'commercial': return 1.2;
      case 'industrial': return 0.9;
      default: return 1.0;
    }
  }

  private getMarketFactor(): number {
    // Simple market factor - could be enhanced with real market data
    const currentYear = new Date().getFullYear();
    const baseYear = 2020;
    const yearsSinceBase = currentYear - baseYear;
    
    // Assume 3% annual growth
    return Math.pow(1.03, yearsSinceBase);
  }

  private getConfidenceLevel(locationFactor: number, sizeFactor: number): 'high' | 'medium' | 'low' {
    // Higher confidence for more standard properties
    if (locationFactor >= 1.0 && locationFactor <= 2.0 && sizeFactor >= 0.8 && sizeFactor <= 1.3) {
      return 'high';
    } else if (locationFactor >= 0.7 && locationFactor <= 2.5 && sizeFactor >= 0.6 && sizeFactor <= 1.6) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1[1] * Math.PI / 180) * Math.cos(coord2[1] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Generate realistic property data for a given area
  generatePropertyDataForArea(
    center: [number, number],
    radius: number = 5, // km
    count: number = 20
  ): PropertyValue[] {
    const properties: PropertyValue[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate random coordinates within radius
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radius;
      
      const lat = center[1] + (distance * Math.cos(angle)) / 111; // Rough km to degrees
      const lng = center[0] + (distance * Math.sin(angle)) / (111 * Math.cos(center[1] * Math.PI / 180));
      
      const coordinates: [number, number] = [lng, lat];
      
      // Random property characteristics
      const area = Math.floor(Math.random() * 1500) + 300; // 300-1800 sqm
      const type = Math.random() > 0.8 ? 'commercial' : 'residential';
      
      const property = this.estimatePropertyValue(coordinates, area, type);
      properties.push(property);
    }
    
    return properties;
  }
}

// Usage example
export const usePropertyValueEstimator = () => {
  const estimator = new PropertyValueEstimator();
  
  const generateSampleData = (mapCenter: [number, number]) => {
    return estimator.generatePropertyDataForArea(mapCenter, 10, 50);
  };
  
  const estimateSingleProperty = (
    coordinates: [number, number],
    area?: number,
    type?: 'residential' | 'commercial' | 'industrial'
  ) => {
    return estimator.estimatePropertyValue(coordinates, area, type);
  };
  
  return {
    generateSampleData,
    estimateSingleProperty,
    estimator
  };
};
