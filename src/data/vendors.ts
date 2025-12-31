import { VendorQuote, TransportMode } from '../types';

// Sample vendor data
export const vendors = [
  {
    id: '1',
    name: 'FastFreight',
    logo: 'https://images.pexels.com/photos/5025667/pexels-photo-5025667.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    baseFareByMode: {
      Road: 1500,
      Rail: 2000,
      Air: 3500,
      Ship: 2500
    },
    perKmChargeByMode: {
      Road: 15,
      Rail: 10,
      Air: 25,
      Ship: 5
    },
    perKgChargeByMode: {
      Road: 5,
      Rail: 4,
      Air: 20,
      Ship: 3
    },
    handlingChargeByMode: {
      Road: 500,
      Rail: 750,
      Air: 1200,
      Ship: 1000
    },
    deliveryDaysByMode: {
      Road: 2,
      Rail: 4,
      Air: 1,
      Ship: 12
    }
  },
  {
    id: '2',
    name: 'EcoLogistics',
    logo: 'https://images.pexels.com/photos/1427541/pexels-photo-1427541.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    baseFareByMode: {
      Road: 1200,
      Rail: 1800,
      Air: 3800,
      Ship: 2300
    },
    perKmChargeByMode: {
      Road: 12,
      Rail: 8,
      Air: 28,
      Ship: 4
    },
    perKgChargeByMode: {
      Road: 4,
      Rail: 3,
      Air: 22,
      Ship: 2.5
    },
    handlingChargeByMode: {
      Road: 450,
      Rail: 700,
      Air: 1300,
      Ship: 950
    },
    deliveryDaysByMode: {
      Road: 3,
      Rail: 5,
      Air: 1,
      Ship: 14
    }
  },
  {
    id: '3',
    name: 'PrimeShip',
    logo: 'https://images.pexels.com/photos/2226458/pexels-photo-2226458.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    baseFareByMode: {
      Road: 1400,
      Rail: 2200,
      Air: 3200,
      Ship: 2700
    },
    perKmChargeByMode: {
      Road: 14,
      Rail: 11,
      Air: 24,
      Ship: 6
    },
    perKgChargeByMode: {
      Road: 4.5,
      Rail: 4.2,
      Air: 19,
      Ship: 3.2
    },
    handlingChargeByMode: {
      Road: 550,
      Rail: 800,
      Air: 1100,
      Ship: 1050
    },
    deliveryDaysByMode: {
      Road: 2,
      Rail: 3,
      Air: 1,
      Ship: 10
    }
  },
  {
    id: '4',
    name: 'GlobalCargo',
    logo: 'https://images.pexels.com/photos/3894087/pexels-photo-3894087.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    baseFareByMode: {
      Road: 1600,
      Rail: 2100,
      Air: 3600,
      Ship: 2400
    },
    perKmChargeByMode: {
      Road: 16,
      Rail: 9,
      Air: 26,
      Ship: 5.5
    },
    perKgChargeByMode: {
      Road: 5.5,
      Rail: 4.5,
      Air: 21,
      Ship: 2.8
    },
    handlingChargeByMode: {
      Road: 600,
      Rail: 850,
      Air: 1250,
      Ship: 1100
    },
    deliveryDaysByMode: {
      Road: 2,
      Rail: 4,
      Air: 1,
      Ship: 11
    }
  }
];

export const calculateVendorQuotes = (
  totalWeight: number,
  volumetricWeight: number,
  distance: number, // km between locations
  transportMode: TransportMode,
  isExpressShipment: boolean = false,
  isFragileShipment: boolean = false
): VendorQuote[] => {
  return vendors.map(vendor => {
    const chargeableWeight = Math.max(totalWeight, volumetricWeight);
    const baseFare = vendor.baseFareByMode[transportMode];
    const perKmCharge = vendor.perKmChargeByMode[transportMode] * distance;
    const perKgCharge = vendor.perKgChargeByMode[transportMode] * chargeableWeight;
    const handlingCharge = vendor.handlingChargeByMode[transportMode];
    
    // Calculate surcharges
    let surcharges = 0;
    if (isExpressShipment) {
      surcharges += baseFare * 0.2; // 20% surcharge for express
    }
    if (isFragileShipment) {
      surcharges += chargeableWeight * 10; // 10 per kg for fragile items
    }
    
    const totalPrice = baseFare + perKmCharge + perKgCharge + handlingCharge + surcharges;
    
    return {
      id: vendor.id,
      name: vendor.name,
      logo: vendor.logo,
      estimatedDeliveryDays: vendor.deliveryDaysByMode[transportMode],
      chargeableWeight,
      baseFare,
      perKmCharge,
      perKgCharge,
      handlingCharge,
      surcharges,
      totalPrice
    };
  });
};