import { Location } from '../types';

export const locations: Location[] = [
  { id: '1', name: 'Mumbai', code: 'BOM' },
  { id: '2', name: 'Delhi', code: 'DEL' },
  { id: '3', name: 'Bangalore', code: 'BLR' },
  { id: '4', name: 'Chennai', code: 'MAA' },
  { id: '5', name: 'Kolkata', code: 'CCU' },
  { id: '6', name: 'Hyderabad', code: 'HYD' },
  { id: '7', name: 'Ahmedabad', code: 'AMD' },
  { id: '8', name: 'Pune', code: 'PNQ' },
  { id: '9', name: 'New York', code: 'NYC' },
  { id: '10', name: 'London', code: 'LHR' },
  { id: '11', name: 'Singapore', code: 'SIN' },
  { id: '12', name: 'Dubai', code: 'DXB' },
  { id: '13', name: 'Hong Kong', code: 'HKG' },
  { id: '14', name: 'Shanghai', code: 'PVG' },
  { id: '15', name: 'Tokyo', code: 'HND' },
];

// Distance matrix between locations (km) - simplified for demo
// In a real app, this would be calculated using a maps API or a more comprehensive database
export const getDistance = (fromId: string, toId: string): number => {
  // Sample distances (just for demonstration)
  const distances: Record<string, Record<string, number>> = {
    '1': { '2': 1400, '3': 980, '4': 1300, '5': 2000, '9': 12000, '10': 7200 },
    '2': { '1': 1400, '3': 2000, '4': 2200, '5': 1500, '9': 11500, '10': 6700 },
    '3': { '1': 980, '2': 2000, '4': 350, '5': 1600, '9': 13000, '10': 8100 },
  };
  
  // Default distance if specific combination not found
  if (!distances[fromId] || !distances[fromId][toId]) {
    // Calculate a reasonable default based on IDs
    return Math.abs(parseInt(fromId) - parseInt(toId)) * 500;
  }
  
  return distances[fromId][toId];
};