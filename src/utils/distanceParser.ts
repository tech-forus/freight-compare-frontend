export function parseDistanceToKm(distance: any): number {
  if (typeof distance === 'number' && distance > 0) {
    return distance;
  }

  if (typeof distance === 'string') {
    // "2,130 km" → "2130" → 2130
    const cleaned = distance
      .toLowerCase()
      .replace(/km/g, '')
      .replace(/\s/g, '')
      .replace(/,/g, '')
      .trim();

    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  console.error('❌ Could not parse distance:', distance);
  return 0;
}