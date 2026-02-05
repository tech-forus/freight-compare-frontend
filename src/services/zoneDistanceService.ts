/**
 * Zone-Based Distance Service
 *
 * Provides distance lookup between logistics zones using a predefined matrix.
 * This service works entirely on the frontend without any backend calls.
 *
 * Usage:
 *   await zoneDistanceService.loadDistanceMatrix();
 *   const distance = zoneDistanceService.getZoneDistance("N1", "S1"); // Returns 2100 (km)
 */

interface ZoneDistanceMatrix {
  meta: {
    version: string;
    description: string;
    source: string;
    lastUpdated: string;
  };
  matrix: Record<string, Record<string, number>>;
}

class ZoneDistanceService {
  private distanceMatrix: Record<string, Record<string, number>> | null = null;
  private isLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * Load zone distance matrix from JSON file
   * This is called automatically when needed, but can be called manually for preloading
   */
  async loadDistanceMatrix(): Promise<void> {
    // Return existing promise if already loading
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Return immediately if already loaded
    if (this.isLoaded) {
      return Promise.resolve();
    }

    this.loadingPromise = (async () => {
      try {
        const response = await fetch('/zone_distances.json');

        if (!response.ok) {
          throw new Error(`Failed to load zone distance matrix: ${response.status}`);
        }

        const data: ZoneDistanceMatrix = await response.json();
        this.distanceMatrix = data.matrix;
        this.isLoaded = true;

        console.log('✅ Zone distance matrix loaded successfully');
        console.log(`📊 Loaded distances for ${Object.keys(this.distanceMatrix).length} zones`);
      } catch (error) {
        console.error('❌ Error loading zone distance matrix:', error);
        this.loadingPromise = null; // Allow retry
        throw error;
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Get distance between two zones
   *
   * @param fromZone Origin zone code (e.g., "N1", "S1")
   * @param toZone Destination zone code (e.g., "S2", "E1")
   * @returns Distance in kilometers, or null if zones not found
   *
   * @example
   * const distance = zoneDistanceService.getZoneDistance("N1", "S1");
   * // Returns: 2100 (km from Delhi to Bangalore region)
   */
  getZoneDistance(fromZone: string, toZone: string): number | null {
    if (!this.isLoaded || !this.distanceMatrix) {
      console.warn('⚠️ Zone distance matrix not loaded yet. Call loadDistanceMatrix() first.');
      return null;
    }

    // Normalize zone codes (uppercase, trim)
    const normalizedFrom = fromZone.trim().toUpperCase();
    const normalizedTo = toZone.trim().toUpperCase();

    // Check if origin zone exists
    if (!this.distanceMatrix[normalizedFrom]) {
      console.warn(`⚠️ Origin zone not found in matrix: ${normalizedFrom}`);
      return null;
    }

    // Get distance
    const distance = this.distanceMatrix[normalizedFrom][normalizedTo];

    if (distance === undefined || distance === null) {
      console.warn(`⚠️ Distance not found for route: ${normalizedFrom} → ${normalizedTo}`);
      return null;
    }

    return distance;
  }

  /**
   * Check if the service is ready to use
   */
  isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Get all available zones in the matrix
   */
  getAvailableZones(): string[] {
    if (!this.distanceMatrix) {
      return [];
    }
    return Object.keys(this.distanceMatrix);
  }

  /**
   * Get distance matrix metadata
   */
  getMetadata(): { loaded: boolean; zoneCount: number; zones: string[] } {
    return {
      loaded: this.isLoaded,
      zoneCount: this.distanceMatrix ? Object.keys(this.distanceMatrix).length : 0,
      zones: this.getAvailableZones(),
    };
  }

  /**
   * Check if a specific zone exists in the matrix
   */
  hasZone(zoneCode: string): boolean {
    if (!this.distanceMatrix) return false;
    const normalized = zoneCode.trim().toUpperCase();
    return normalized in this.distanceMatrix;
  }
}

// Export singleton instance
export const zoneDistanceService = new ZoneDistanceService();

// Also export the class for testing purposes
export { ZoneDistanceService };
