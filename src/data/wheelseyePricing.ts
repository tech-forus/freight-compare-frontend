// Wheelseye Pricing Data
import { VehiclePricingData } from '../services/wheelseye';

export const WHEELSEYE_PRICING_DATA: VehiclePricingData[] = [
  // Tata Ace (850-1000 kg)
  {
    "_id": "68d128d5eab0c84114ffc6ca",
    "vehicleType": "Tata Ace",
    "weightRange": { "min": 850, "max": 1000 },
    "distanceRange": { "min": 0, "max": 1000 },
    "vehicleLength": 7,
    "pricing": [
      { "distanceRange": { "min": 0, "max": 100 }, "price": 4300, "_id": "68d50974225745a1b917b229" },
      { "distanceRange": { "min": 101, "max": 150 }, "price": 6000, "_id": "68d50974225745a1b917b22a" },
      { "distanceRange": { "min": 151, "max": 200 }, "price": 6900, "_id": "68d50974225745a1b917b22b" },
      { "distanceRange": { "min": 201, "max": 250 }, "price": 7000, "_id": "68d50974225745a1b917b22c" },
      { "distanceRange": { "min": 251, "max": 300 }, "price": 9500, "_id": "68d50974225745a1b917b22d" },
      { "distanceRange": { "min": 301, "max": 350 }, "price": 10400, "_id": "68d50974225745a1b917b22e" },
      { "distanceRange": { "min": 351, "max": 400 }, "price": 10400, "_id": "68d50974225745a1b917b22f" },
      { "distanceRange": { "min": 401, "max": 450 }, "price": 10600, "_id": "68d50974225745a1b917b230" },
      { "distanceRange": { "min": 451, "max": 500 }, "price": 13900, "_id": "68d50974225745a1b917b231" },
      { "distanceRange": { "min": 501, "max": 600 }, "price": 12300, "_id": "68d50974225745a1b917b232" },
      { "distanceRange": { "min": 601, "max": 700 }, "price": 15700, "_id": "68d50974225745a1b917b233" },
      { "distanceRange": { "min": 701, "max": 800 }, "price": 17900, "_id": "68d50974225745a1b917b234" },
      { "distanceRange": { "min": 801, "max": 900 }, "price": 18400, "_id": "68d50974225745a1b917b235" },
      { "distanceRange": { "min": 901, "max": 1000 }, "price": 18500, "_id": "68d50974225745a1b917b236" }
    ],
    "createdAt": "2025-09-25T09:20:52.436Z",
    "updatedAt": "2025-09-25T09:20:52.437Z",
    "__v": 0
  },

  // Pickup (1001-1200 kg)
  {
    "_id": "68d128d5eab0c84114ffc6d9",
    "vehicleType": "Pickup",
    "weightRange": { "min": 1001, "max": 1200 },
    "distanceRange": { "min": 0, "max": 1000 },
    "vehicleLength": 8,
    "pricing": [
      { "distanceRange": { "min": 0, "max": 100 }, "price": 5300, "_id": "68d50974225745a1b917b238" },
      { "distanceRange": { "min": 101, "max": 150 }, "price": 6500, "_id": "68d50974225745a1b917b239" },
      { "distanceRange": { "min": 151, "max": 200 }, "price": 7000, "_id": "68d50974225745a1b917b23a" },
      { "distanceRange": { "min": 201, "max": 250 }, "price": 7300, "_id": "68d50974225745a1b917b23b" },
      { "distanceRange": { "min": 251, "max": 300 }, "price": 11500, "_id": "68d50974225745a1b917b23c" },
      { "distanceRange": { "min": 301, "max": 350 }, "price": 11400, "_id": "68d50974225745a1b917b23d" },
      { "distanceRange": { "min": 351, "max": 400 }, "price": 11400, "_id": "68d50974225745a1b917b23e" },
      { "distanceRange": { "min": 401, "max": 450 }, "price": 10500, "_id": "68d50974225745a1b917b23f" },
      { "distanceRange": { "min": 451, "max": 500 }, "price": 12800, "_id": "68d50974225745a1b917b240" },
      { "distanceRange": { "min": 501, "max": 600 }, "price": 15700, "_id": "68d50974225745a1b917b241" },
      { "distanceRange": { "min": 601, "max": 700 }, "price": 16900, "_id": "68d50974225745a1b917b242" },
      { "distanceRange": { "min": 701, "max": 800 }, "price": 17000, "_id": "68d50974225745a1b917b243" },
      { "distanceRange": { "min": 801, "max": 900 }, "price": 22600, "_id": "68d50974225745a1b917b244" },
      { "distanceRange": { "min": 901, "max": 1000 }, "price": 23100, "_id": "68d50974225745a1b917b245" }
    ],
    "createdAt": "2025-09-25T09:20:52.441Z",
    "updatedAt": "2025-09-25T09:20:52.441Z",
    "__v": 0
  },

  // 10 ft Truck (1201-1500 kg)
  {
    "_id": "68d128d5eab0c84114ffc6e8",
    "vehicleType": "10 ft Truck",
    "weightRange": { "min": 1201, "max": 1500 },
    "distanceRange": { "min": 0, "max": 1000 },
    "vehicleLength": 10,
    "pricing": [
      { "distanceRange": { "min": 0, "max": 50 }, "price": 2200, "_id": "68d50974225745a1b917b247" },
      { "distanceRange": { "min": 51, "max": 60 }, "price": 2200, "_id": "68d50974225745a1b917b248" },
      { "distanceRange": { "min": 61, "max": 100 }, "price": 5800, "_id": "68d50974225745a1b917b249" },
      { "distanceRange": { "min": 101, "max": 150 }, "price": 4900, "_id": "68d50974225745a1b917b24a" },
      { "distanceRange": { "min": 151, "max": 200 }, "price": 9800, "_id": "68d50974225745a1b917b24b" },
      { "distanceRange": { "min": 201, "max": 250 }, "price": 9600, "_id": "68d50974225745a1b917b24c" },
      { "distanceRange": { "min": 251, "max": 300 }, "price": 11500, "_id": "68d50974225745a1b917b24d" },
      { "distanceRange": { "min": 301, "max": 350 }, "price": 12000, "_id": "68d50974225745a1b917b24e" },
      { "distanceRange": { "min": 351, "max": 400 }, "price": 13000, "_id": "68d50974225745a1b917b24f" },
      { "distanceRange": { "min": 401, "max": 450 }, "price": 14600, "_id": "68d50974225745a1b917b250" },
      { "distanceRange": { "min": 451, "max": 500 }, "price": 16400, "_id": "68d50974225745a1b917b251" },
      { "distanceRange": { "min": 501, "max": 600 }, "price": 20300, "_id": "68d50974225745a1b917b252" },
      { "distanceRange": { "min": 601, "max": 700 }, "price": 23000, "_id": "68d50974225745a1b917b253" },
      { "distanceRange": { "min": 701, "max": 800 }, "price": 25200, "_id": "68d50974225745a1b917b254" },
      { "distanceRange": { "min": 801, "max": 900 }, "price": 29300, "_id": "68d50974225745a1b917b255" },
      { "distanceRange": { "min": 901, "max": 1000 }, "price": 2100, "_id": "68d50974225745a1b917b256" }
    ],
    "createdAt": "2025-09-25T09:20:52.442Z",
    "updatedAt": "2025-09-25T09:20:52.442Z",
    "__v": 0
  },

  // Eicher 14 ft (1501-2000 kg)
  {
    "_id": "68d128d5eab0c84114ffc6f9",
    "vehicleType": "Eicher 14 ft",
    "weightRange": { "min": 1501, "max": 2000 },
    "distanceRange": { "min": 0, "max": 2000 },
    "vehicleLength": 14,
    "pricing": [
      { "distanceRange": { "min": 0, "max": 50 }, "price": 3600, "_id": "68d50974225745a1b917b258" },
      { "distanceRange": { "min": 51, "max": 60 }, "price": 3600, "_id": "68d50974225745a1b917b259" },
      { "distanceRange": { "min": 61, "max": 100 }, "price": 7200, "_id": "68d50974225745a1b917b25a" },
      { "distanceRange": { "min": 101, "max": 150 }, "price": 9200, "_id": "68d50974225745a1b917b25b" },
      { "distanceRange": { "min": 151, "max": 200 }, "price": 12600, "_id": "68d50974225745a1b917b25c" },
      { "distanceRange": { "min": 201, "max": 250 }, "price": 12200, "_id": "68d50974225745a1b917b25d" },
      { "distanceRange": { "min": 251, "max": 300 }, "price": 18000, "_id": "68d50974225745a1b917b25e" },
      { "distanceRange": { "min": 301, "max": 350 }, "price": 17800, "_id": "68d50974225745a1b917b25f" },
      { "distanceRange": { "min": 351, "max": 400 }, "price": 17800, "_id": "68d50974225745a1b917b260" },
      { "distanceRange": { "min": 401, "max": 450 }, "price": 21000, "_id": "68d50974225745a1b917b261" },
      { "distanceRange": { "min": 451, "max": 500 }, "price": 22600, "_id": "68d50974225745a1b917b262" },
      { "distanceRange": { "min": 501, "max": 600 }, "price": 20500, "_id": "68d50974225745a1b917b263" },
      { "distanceRange": { "min": 601, "max": 700 }, "price": 28200, "_id": "68d50974225745a1b917b264" },
      { "distanceRange": { "min": 701, "max": 800 }, "price": 29300, "_id": "68d50974225745a1b917b265" },
      { "distanceRange": { "min": 801, "max": 900 }, "price": 28800, "_id": "68d50974225745a1b917b266" },
      { "distanceRange": { "min": 901, "max": 1000 }, "price": 36900, "_id": "68d50974225745a1b917b267" },
      { "distanceRange": { "min": 1001, "max": 1200 }, "price": 37700, "_id": "68d50974225745a1b917b268" },
      { "distanceRange": { "min": 1201, "max": 1500 }, "price": 50800, "_id": "68d50974225745a1b917b269" },
      { "distanceRange": { "min": 1501, "max": 1800 }, "price": 45900, "_id": "68d50974225745a1b917b26a" },
      { "distanceRange": { "min": 1801, "max": 2000 }, "price": 45900, "_id": "68d50974225745a1b917b26b" }
    ],
    "createdAt": "2025-09-25T09:20:52.444Z",
    "updatedAt": "2025-09-25T09:20:52.444Z",
    "__v": 0
  },

  // Eicher 19 ft (4001-7000 kg)
  {
    "_id": "68d128d5eab0c84114ffc769",
    "vehicleType": "Eicher 19 ft",
    "weightRange": { "min": 4001, "max": 7000 },
    "distanceRange": { "min": 0, "max": 2700 },
    "vehicleLength": 19,
    "pricing": [
      { "distanceRange": { "min": 0, "max": 50 }, "price": 6000, "_id": "68d50974225745a1b917b2cb" },
      { "distanceRange": { "min": 51, "max": 60 }, "price": 6000, "_id": "68d50974225745a1b917b2cc" },
      { "distanceRange": { "min": 61, "max": 100 }, "price": 10000, "_id": "68d50974225745a1b917b2cd" },
      { "distanceRange": { "min": 101, "max": 150 }, "price": 11200, "_id": "68d50974225745a1b917b2ce" },
      { "distanceRange": { "min": 151, "max": 200 }, "price": 13500, "_id": "68d50974225745a1b917b2cf" },
      { "distanceRange": { "min": 201, "max": 250 }, "price": 14600, "_id": "68d50974225745a1b917b2d0" },
      { "distanceRange": { "min": 251, "max": 300 }, "price": 17200, "_id": "68d50974225745a1b917b2d1" },
      { "distanceRange": { "min": 301, "max": 350 }, "price": 22400, "_id": "68d50974225745a1b917b2d2" },
      { "distanceRange": { "min": 351, "max": 400 }, "price": 22400, "_id": "68d50974225745a1b917b2d3" },
      { "distanceRange": { "min": 401, "max": 450 }, "price": 21500, "_id": "68d50974225745a1b917b2d4" },
      { "distanceRange": { "min": 451, "max": 500 }, "price": 22500, "_id": "68d50974225745a1b917b2d5" },
      { "distanceRange": { "min": 501, "max": 600 }, "price": 33800, "_id": "68d50974225745a1b917b2d6" },
      { "distanceRange": { "min": 601, "max": 700 }, "price": 38100, "_id": "68d50974225745a1b917b2d7" },
      { "distanceRange": { "min": 701, "max": 800 }, "price": 35600, "_id": "68d50974225745a1b917b2d8" },
      { "distanceRange": { "min": 801, "max": 900 }, "price": 43400, "_id": "68d50974225745a1b917b2d9" },
      { "distanceRange": { "min": 901, "max": 1000 }, "price": 35900, "_id": "68d50974225745a1b917b2da" },
      { "distanceRange": { "min": 1001, "max": 1200 }, "price": 44500, "_id": "68d50974225745a1b917b2db" },
      { "distanceRange": { "min": 1201, "max": 1500 }, "price": 56400, "_id": "68d50974225745a1b917b2dc" },
      { "distanceRange": { "min": 1501, "max": 1800 }, "price": 47800, "_id": "68d50974225745a1b917b2dd" },
      { "distanceRange": { "min": 1801, "max": 2000 }, "price": 62100, "_id": "68d50974225745a1b917b2de" },
      { "distanceRange": { "min": 2001, "max": 2200 }, "price": 78300, "_id": "68d50974225745a1b917b2df" },
      { "distanceRange": { "min": 2201, "max": 2500 }, "price": 86200, "_id": "68d50974225745a1b917b2e0" },
      { "distanceRange": { "min": 2501, "max": 2600 }, "price": 93200, "_id": "68d50974225745a1b917b2e1" },
      { "distanceRange": { "min": 2601, "max": 2700 }, "price": 98200, "_id": "68d50974225745a1b917b2e2" }
    ],
    "createdAt": "2025-09-25T09:20:52.455Z",
    "updatedAt": "2025-09-25T09:20:52.455Z",
    "__v": 0
  },

  // Eicher 20 ft (7001-10000 kg)
  {
    "_id": "68d128d5eab0c84114ffc782",
    "vehicleType": "Eicher 20 ft",
    "weightRange": { "min": 7001, "max": 10000 },
    "distanceRange": { "min": 0, "max": 2700 },
    "vehicleLength": 20,
    "pricing": [
      { "distanceRange": { "min": 0, "max": 50 }, "price": 10800, "_id": "68d50974225745a1b917b2e4" },
      { "distanceRange": { "min": 51, "max": 60 }, "price": 10800, "_id": "68d50974225745a1b917b2e5" },
      { "distanceRange": { "min": 61, "max": 100 }, "price": 13300, "_id": "68d50974225745a1b917b2e6" },
      { "distanceRange": { "min": 101, "max": 150 }, "price": 13700, "_id": "68d50974225745a1b917b2e7" },
      { "distanceRange": { "min": 151, "max": 200 }, "price": 18800, "_id": "68d50974225745a1b917b2e8" },
      { "distanceRange": { "min": 201, "max": 250 }, "price": 18100, "_id": "68d50974225745a1b917b2e9" },
      { "distanceRange": { "min": 251, "max": 300 }, "price": 21500, "_id": "68d50974225745a1b917b2ea" },
      { "distanceRange": { "min": 301, "max": 350 }, "price": 27500, "_id": "68d50974225745a1b917b2eb" },
      { "distanceRange": { "min": 351, "max": 400 }, "price": 27500, "_id": "68d50974225745a1b917b2ec" },
      { "distanceRange": { "min": 401, "max": 450 }, "price": 27800, "_id": "68d50974225745a1b917b2ed" },
      { "distanceRange": { "min": 451, "max": 500 }, "price": 32000, "_id": "68d50974225745a1b917b2ee" },
      { "distanceRange": { "min": 501, "max": 600 }, "price": 29100, "_id": "68d50974225745a1b917b2ef" },
      { "distanceRange": { "min": 601, "max": 700 }, "price": 35600, "_id": "68d50974225745a1b917b2f0" },
      { "distanceRange": { "min": 701, "max": 800 }, "price": 42900, "_id": "68d50974225745a1b917b2f1" },
      { "distanceRange": { "min": 801, "max": 900 }, "price": 47000, "_id": "68d50974225745a1b917b2f2" },
      { "distanceRange": { "min": 901, "max": 1000 }, "price": 39100, "_id": "68d50974225745a1b917b2f3" },
      { "distanceRange": { "min": 1001, "max": 1200 }, "price": 62600, "_id": "68d50974225745a1b917b2f4" },
      { "distanceRange": { "min": 1201, "max": 1500 }, "price": 65800, "_id": "68d50974225745a1b917b2f5" },
      { "distanceRange": { "min": 1501, "max": 1800 }, "price": 82900, "_id": "68d50974225745a1b917b2f6" },
      { "distanceRange": { "min": 1801, "max": 2000 }, "price": 72400, "_id": "68d50974225745a1b917b2f7" },
      { "distanceRange": { "min": 2001, "max": 2200 }, "price": 92600, "_id": "68d50974225745a1b917b2f8" },
      { "distanceRange": { "min": 2201, "max": 2500 }, "price": 101200, "_id": "68d50974225745a1b917b2f9" },
      { "distanceRange": { "min": 2501, "max": 2600 }, "price": 106800, "_id": "68d50974225745a1b917b2fa" },
      { "distanceRange": { "min": 2601, "max": 2700 }, "price": 107900, "_id": "68d50974225745a1b917b2fb" }
    ],
    "createdAt": "2025-09-25T09:20:52.458Z",
    "updatedAt": "2025-09-25T09:20:52.458Z",
    "__v": 0
  },

  // Container 32 ft MXL (10001-18000 kg)
  {
    "_id": "68d128d5eab0c84114ffc79b",
    "vehicleType": "Container 32 ft MXL",
    "weightRange": { "min": 10001, "max": 18000 },
    "distanceRange": { "min": 0, "max": 2700 },
    "vehicleLength": 32,
    "pricing": [
      { "distanceRange": { "min": 0, "max": 50 }, "price": 15400, "_id": "68d50974225745a1b917b2fd" },
      { "distanceRange": { "min": 51, "max": 60 }, "price": 15400, "_id": "68d50974225745a1b917b2fe" },
      { "distanceRange": { "min": 61, "max": 100 }, "price": 25500, "_id": "68d50974225745a1b917b2ff" },
      { "distanceRange": { "min": 101, "max": 150 }, "price": 29100, "_id": "68d50974225745a1b917b300" },
      { "distanceRange": { "min": 151, "max": 200 }, "price": 26300, "_id": "68d50974225745a1b917b301" },
      { "distanceRange": { "min": 201, "max": 250 }, "price": 32200, "_id": "68d50974225745a1b917b302" },
      { "distanceRange": { "min": 251, "max": 300 }, "price": 35800, "_id": "68d50974225745a1b917b303" },
      { "distanceRange": { "min": 301, "max": 350 }, "price": 38400, "_id": "68d50974225745a1b917b304" },
      { "distanceRange": { "min": 351, "max": 400 }, "price": 40700, "_id": "68d50974225745a1b917b305" },
      { "distanceRange": { "min": 401, "max": 450 }, "price": 43500, "_id": "68d50974225745a1b917b306" },
      { "distanceRange": { "min": 451, "max": 500 }, "price": 49300, "_id": "68d50974225745a1b917b307" },
      { "distanceRange": { "min": 501, "max": 600 }, "price": 57000, "_id": "68d50974225745a1b917b308" },
      { "distanceRange": { "min": 601, "max": 700 }, "price": 64400, "_id": "68d50974225745a1b917b309" },
      { "distanceRange": { "min": 701, "max": 800 }, "price": 72100, "_id": "68d50974225745a1b917b30a" },
      { "distanceRange": { "min": 801, "max": 900 }, "price": 86900, "_id": "68d50974225745a1b917b30b" },
      { "distanceRange": { "min": 901, "max": 1000 }, "price": 68300, "_id": "68d50974225745a1b917b30c" },
      { "distanceRange": { "min": 1001, "max": 1200 }, "price": 87900, "_id": "68d50974225745a1b917b30d" },
      { "distanceRange": { "min": 1201, "max": 1500 }, "price": 100300, "_id": "68d50974225745a1b917b30e" },
      { "distanceRange": { "min": 1501, "max": 1800 }, "price": 113300, "_id": "68d50974225745a1b917b30f" },
      { "distanceRange": { "min": 1801, "max": 2000 }, "price": 113300, "_id": "68d50974225745a1b917b310" },
      { "distanceRange": { "min": 2001, "max": 2200 }, "price": 122600, "_id": "68d50974225745a1b917b311" },
      { "distanceRange": { "min": 2201, "max": 2500 }, "price": 134800, "_id": "68d50974225745a1b917b312" },
      { "distanceRange": { "min": 2501, "max": 2600 }, "price": 142800, "_id": "68d50974225745a1b917b313" },
      { "distanceRange": { "min": 2601, "max": 2700 }, "price": 148400, "_id": "68d50974225745a1b917b314" }
    ],
    "createdAt": "2025-09-25T09:20:52.460Z",
    "updatedAt": "2025-09-25T09:20:52.460Z",
    "__v": 0
  }
];
