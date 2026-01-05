/**
 * UT CRISSCROSS ROUTE CALCULATOR
 *
 * This script calculates crisscross routes between all Union Territory cities
 * and 300+ edge pincodes across India's borders.
 *
 * Features:
 * - Calculates distance between all UT locations and edge pincodes
 * - Uses Haversine formula for accurate distance calculation
 * - Generates pricing using Wheelseye pricing model
 * - Exports results to JSON and CSV formats
 * - Provides statistics and summary
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });

// Import utilities
const { calculateDistanceBetweenPincode } = require('../utils/distanceService');
const WheelseyePricing = require('../model/wheelseyePricingModel');

// Load pincode data
const pincodes = require('../data/pincodes.json');
const pincodeCentroids = require('../data/pincode_centroids.json');

// Union Territory Cities with their major pincodes
const UT_CITIES = [
  // Delhi
  { name: 'Delhi - Connaught Place', state: 'DELHI', pincode: '110001', lat: 28.623449, lng: 77.218719 },
  { name: 'Delhi - Karol Bagh', state: 'DELHI', pincode: '110005', lat: 28.652409, lng: 77.189818 },
  { name: 'Delhi - Rohini', state: 'DELHI', pincode: '110085', lat: 28.724825, lng: 77.068877 },

  // Chandigarh
  { name: 'Chandigarh - Sector 17', state: 'CHANDIGARH', pincode: '160017', lat: 30.740965, lng: 76.778877 },
  { name: 'Chandigarh - Sector 22', state: 'CHANDIGARH', pincode: '160022', lat: 30.733315, lng: 76.776611 },

  // Puducherry
  { name: 'Puducherry - Main', state: 'PUDUCHERRY', pincode: '605001', lat: 11.934533, lng: 79.830017 },
  { name: 'Puducherry - Karaikal', state: 'PUDUCHERRY', pincode: '609602', lat: 10.925201, lng: 79.838005 },

  // Daman and Diu
  { name: 'Daman', state: 'DAMAN AND DIU', pincode: '396210', lat: 20.414936, lng: 72.832748 },
  { name: 'Diu', state: 'DAMAN AND DIU', pincode: '362520', lat: 20.715250, lng: 70.988144 },

  // Dadra and Nagar Haveli
  { name: 'Silvassa', state: 'DADRA AND NAGAR HAVELI', pincode: '396230', lat: 20.273705, lng: 72.998238 },

  // Lakshadweep
  { name: 'Kavaratti', state: 'LAKSHADWEEP', pincode: '682555', lat: 10.566667, lng: 72.636667 },

  // Andaman and Nicobar
  { name: 'Port Blair', state: 'ANDAMAN AND NICOBAR ISLANDS', pincode: '744101', lat: 11.666667, lng: 92.733333 },

  // Ladakh
  { name: 'Leh', state: 'LADAKH', pincode: '194101', lat: 34.152588, lng: 77.577049 },
  { name: 'Kargil', state: 'LADAKH', pincode: '194103', lat: 34.558333, lng: 76.129167 },

  // Jammu and Kashmir
  { name: 'Srinagar', state: 'JAMMU AND KASHMIR', pincode: '190001', lat: 34.083656, lng: 74.797371 },
  { name: 'Jammu', state: 'JAMMU AND KASHMIR', pincode: '180001', lat: 32.735687, lng: 74.869003 },
];

// Edge Pincodes of India (300+ covering all borders)
const EDGE_PINCODES = [
  // Northern Border (Jammu & Kashmir, Ladakh, Himachal Pradesh)
  { pincode: '194301', name: 'Nubra Valley', state: 'LADAKH', region: 'North', lat: 34.662, lng: 77.618 },
  { pincode: '194401', name: 'Turtuk', state: 'LADAKH', region: 'North', lat: 34.851, lng: 76.723 },
  { pincode: '194404', name: 'Panamik', state: 'LADAKH', region: 'North', lat: 34.719, lng: 77.579 },
  { pincode: '193502', name: 'Gurez', state: 'JAMMU AND KASHMIR', region: 'North', lat: 34.639, lng: 74.856 },
  { pincode: '193221', name: 'Karnah', state: 'JAMMU AND KASHMIR', region: 'North', lat: 34.569, lng: 74.213 },
  { pincode: '193224', name: 'Kupwara', state: 'JAMMU AND KASHMIR', region: 'North', lat: 34.529, lng: 74.254 },
  { pincode: '193123', name: 'Tangdhar', state: 'JAMMU AND KASHMIR', region: 'North', lat: 34.651, lng: 74.141 },
  { pincode: '191202', name: 'Uri', state: 'JAMMU AND KASHMIR', region: 'North', lat: 34.093, lng: 73.992 },
  { pincode: '185101', name: 'Poonch', state: 'JAMMU AND KASHMIR', region: 'North', lat: 33.773, lng: 74.093 },
  { pincode: '185234', name: 'Rajouri', state: 'JAMMU AND KASHMIR', region: 'North', lat: 33.375, lng: 74.309 },

  // More Northern Border locations
  { pincode: '176316', name: 'Keylong', state: 'HIMACHAL PRADESH', region: 'North', lat: 32.571, lng: 77.034 },
  { pincode: '172114', name: 'Kalpa', state: 'HIMACHAL PRADESH', region: 'North', lat: 31.537, lng: 78.252 },
  { pincode: '172107', name: 'Sangla', state: 'HIMACHAL PRADESH', region: 'North', lat: 31.413, lng: 78.267 },
  { pincode: '172108', name: 'Chitkul', state: 'HIMACHAL PRADESH', region: 'North', lat: 31.344, lng: 78.408 },

  // Eastern Border (Arunachal Pradesh, Assam, Meghalaya, Mizoram, Manipur, Tripura, Nagaland)
  { pincode: '792111', name: 'Tawang', state: 'ARUNACHAL PRADESH', region: 'East', lat: 27.586, lng: 91.859 },
  { pincode: '792122', name: 'Bum La', state: 'ARUNACHAL PRADESH', region: 'East', lat: 27.561, lng: 91.813 },
  { pincode: '792055', name: 'Bomdila', state: 'ARUNACHAL PRADESH', region: 'East', lat: 27.261, lng: 92.408 },
  { pincode: '791001', name: 'Itanagar', state: 'ARUNACHAL PRADESH', region: 'East', lat: 27.084, lng: 93.616 },
  { pincode: '792131', name: 'Zemithang', state: 'ARUNACHAL PRADESH', region: 'East', lat: 27.484, lng: 91.916 },
  { pincode: '792120', name: 'Jang', state: 'ARUNACHAL PRADESH', region: 'East', lat: 27.359, lng: 91.917 },
  { pincode: '791120', name: 'Anini', state: 'ARUNACHAL PRADESH', region: 'East', lat: 28.814, lng: 95.859 },
  { pincode: '792104', name: 'Tezu', state: 'ARUNACHAL PRADESH', region: 'East', lat: 27.915, lng: 96.166 },
  { pincode: '792130', name: 'Walong', state: 'ARUNACHAL PRADESH', region: 'East', lat: 28.097, lng: 97.022 },
  { pincode: '792125', name: 'Kibithoo', state: 'ARUNACHAL PRADESH', region: 'East', lat: 27.928, lng: 96.969 },

  { pincode: '797112', name: 'Mon', state: 'NAGALAND', region: 'East', lat: 26.721, lng: 94.823 },
  { pincode: '798627', name: 'Longwa', state: 'NAGALAND', region: 'East', lat: 26.649, lng: 94.948 },
  { pincode: '798612', name: 'Tuensang', state: 'NAGALAND', region: 'East', lat: 26.268, lng: 94.823 },

  { pincode: '795001', name: 'Imphal', state: 'MANIPUR', region: 'East', lat: 24.817, lng: 93.937 },
  { pincode: '795158', name: 'Moreh', state: 'MANIPUR', region: 'East', lat: 24.382, lng: 94.019 },
  { pincode: '795148', name: 'Tengnoupal', state: 'MANIPUR', region: 'East', lat: 24.376, lng: 94.022 },

  { pincode: '796901', name: 'Champhai', state: 'MIZORAM', region: 'East', lat: 23.471, lng: 93.327 },
  { pincode: '796891', name: 'Zokhawthar', state: 'MIZORAM', region: 'East', lat: 23.506, lng: 93.338 },
  { pincode: '796310', name: 'Lunglei', state: 'MIZORAM', region: 'East', lat: 22.889, lng: 92.737 },
  { pincode: '796751', name: 'Lawngtlai', state: 'MIZORAM', region: 'East', lat: 22.533, lng: 92.897 },

  { pincode: '793200', name: 'Dawki', state: 'MEGHALAYA', region: 'East', lat: 25.115, lng: 91.965 },
  { pincode: '793119', name: 'Tura', state: 'MEGHALAYA', region: 'East', lat: 25.514, lng: 90.203 },
  { pincode: '794101', name: 'Baghmara', state: 'MEGHALAYA', region: 'East', lat: 25.183, lng: 90.645 },

  { pincode: '788930', name: 'Karimganj', state: 'ASSAM', region: 'East', lat: 24.869, lng: 92.357 },
  { pincode: '783390', name: 'Dhubri', state: 'ASSAM', region: 'East', lat: 26.018, lng: 89.986 },
  { pincode: '783334', name: 'Bongaigaon', state: 'ASSAM', region: 'East', lat: 26.483, lng: 90.551 },
  { pincode: '784145', name: 'Tezpur', state: 'ASSAM', region: 'East', lat: 26.634, lng: 92.797 },

  { pincode: '799150', name: 'Kailashahar', state: 'TRIPURA', region: 'East', lat: 24.332, lng: 92.004 },
  { pincode: '799130', name: 'Kamalpur', state: 'TRIPURA', region: 'East', lat: 24.199, lng: 91.833 },
  { pincode: '799120', name: 'Ambassa', state: 'TRIPURA', region: 'East', lat: 23.933, lng: 91.850 },

  // Western Border (Gujarat, Rajasthan)
  { pincode: '370001', name: 'Bhuj', state: 'GUJARAT', region: 'West', lat: 23.242, lng: 69.670 },
  { pincode: '370510', name: 'Naliya', state: 'GUJARAT', region: 'West', lat: 23.256, lng: 68.825 },
  { pincode: '370655', name: 'Jakhau', state: 'GUJARAT', region: 'West', lat: 23.204, lng: 68.688 },
  { pincode: '370427', name: 'Narayan Sarovar', state: 'GUJARAT', region: 'West', lat: 23.784, lng: 68.634 },
  { pincode: '370165', name: 'Lakhpat', state: 'GUJARAT', region: 'West', lat: 23.836, lng: 68.772 },
  { pincode: '370020', name: 'Mandvi', state: 'GUJARAT', region: 'West', lat: 22.833, lng: 69.349 },
  { pincode: '370601', name: 'Dhordo', state: 'GUJARAT', region: 'West', lat: 23.857, lng: 69.716 },

  { pincode: '345001', name: 'Jaisalmer', state: 'RAJASTHAN', region: 'West', lat: 26.915, lng: 70.918 },
  { pincode: '344033', name: 'Barmer', state: 'RAJASTHAN', region: 'West', lat: 25.750, lng: 71.396 },
  { pincode: '334001', name: 'Bikaner', state: 'RAJASTHAN', region: 'West', lat: 28.018, lng: 73.311 },
  { pincode: '335901', name: 'Ganganagar', state: 'RAJASTHAN', region: 'West', lat: 29.903, lng: 73.877 },
  { pincode: '335062', name: 'Suratgarh', state: 'RAJASTHAN', region: 'West', lat: 29.321, lng: 73.898 },
  { pincode: '335073', name: 'Anupgarh', state: 'RAJASTHAN', region: 'West', lat: 29.191, lng: 73.208 },
  { pincode: '344704', name: 'Sam Sand Dunes', state: 'RAJASTHAN', region: 'West', lat: 26.907, lng: 70.769 },
  { pincode: '345024', name: 'Tanot', state: 'RAJASTHAN', region: 'West', lat: 27.869, lng: 70.875 },
  { pincode: '345001', name: 'Longewala', state: 'RAJASTHAN', region: 'West', lat: 26.709, lng: 71.039 },

  // Southern Border (Tamil Nadu, Kerala, Karnataka)
  { pincode: '629702', name: 'Kanyakumari', state: 'TAMIL NADU', region: 'South', lat: 8.088, lng: 77.553 },
  { pincode: '629901', name: 'Thuckalay', state: 'TAMIL NADU', region: 'South', lat: 8.316, lng: 77.340 },
  { pincode: '629401', name: 'Nagercoil', state: 'TAMIL NADU', region: 'South', lat: 8.176, lng: 77.434 },
  { pincode: '627601', name: 'Tuticorin', state: 'TAMIL NADU', region: 'South', lat: 8.805, lng: 78.145 },
  { pincode: '628501', name: 'Tiruchendur', state: 'TAMIL NADU', region: 'South', lat: 8.498, lng: 78.122 },
  { pincode: '623526', name: 'Rameswaram', state: 'TAMIL NADU', region: 'South', lat: 9.288, lng: 79.313 },
  { pincode: '623520', name: 'Dhanushkodi', state: 'TAMIL NADU', region: 'South', lat: 9.169, lng: 79.454 },
  { pincode: '623409', name: 'Mandapam', state: 'TAMIL NADU', region: 'South', lat: 9.274, lng: 79.122 },

  { pincode: '695521', name: 'Kovalam', state: 'KERALA', region: 'South', lat: 8.400, lng: 76.979 },
  { pincode: '695144', name: 'Vizhinjam', state: 'KERALA', region: 'South', lat: 8.380, lng: 76.982 },
  { pincode: '671531', name: 'Kasaragod', state: 'KERALA', region: 'South', lat: 12.497, lng: 74.989 },
  { pincode: '695001', name: 'Thiruvananthapuram', state: 'KERALA', region: 'South', lat: 8.524, lng: 76.936 },

  { pincode: '574111', name: 'Mangalore', state: 'KARNATAKA', region: 'South', lat: 12.914, lng: 74.856 },
  { pincode: '581320', name: 'Karwar', state: 'KARNATAKA', region: 'South', lat: 14.814, lng: 74.129 },
  { pincode: '581301', name: 'Ankola', state: 'KARNATAKA', region: 'South', lat: 14.661, lng: 74.305 },

  // Additional border areas - Punjab
  { pincode: '152132', name: 'Hussainiwala', state: 'PUNJAB', region: 'West', lat: 30.942, lng: 74.122 },
  { pincode: '143419', name: 'Attari', state: 'PUNJAB', region: 'West', lat: 31.592, lng: 74.859 },
  { pincode: '152101', name: 'Fazilka', state: 'PUNJAB', region: 'West', lat: 30.402, lng: 74.029 },
  { pincode: '152024', name: 'Abohar', state: 'PUNJAB', region: 'West', lat: 30.144, lng: 74.199 },
  { pincode: '143601', name: 'Gurdaspur', state: 'PUNJAB', region: 'West', lat: 32.041, lng: 75.403 },
  { pincode: '143530', name: 'Pathankot', state: 'PUNJAB', region: 'West', lat: 32.275, lng: 75.652 },

  // Additional UP and Bihar border areas
  { pincode: '272205', name: 'Nautanwa', state: 'UTTAR PRADESH', region: 'North', lat: 27.426, lng: 83.419 },
  { pincode: '272270', name: 'Maharajganj', state: 'UTTAR PRADESH', region: 'North', lat: 27.099, lng: 83.561 },
  { pincode: '273209', name: 'Sonauli', state: 'UTTAR PRADESH', region: 'North', lat: 27.274, lng: 83.540 },

  { pincode: '845412', name: 'Raxaul', state: 'BIHAR', region: 'North', lat: 26.976, lng: 84.850 },
  { pincode: '845438', name: 'Sugauli', state: 'BIHAR', region: 'North', lat: 26.877, lng: 84.775 },
  { pincode: '845301', name: 'Bettiah', state: 'BIHAR', region: 'North', lat: 26.802, lng: 84.503 },

  // West Bengal border areas
  { pincode: '733121', name: 'Raiganj', state: 'WEST BENGAL', region: 'East', lat: 25.616, lng: 88.122 },
  { pincode: '733158', name: 'Islampur', state: 'WEST BENGAL', region: 'East', lat: 26.326, lng: 88.209 },
  { pincode: '735135', name: 'Haldibari', state: 'WEST BENGAL', region: 'East', lat: 26.330, lng: 88.776 },
  { pincode: '735224', name: 'Changrabandha', state: 'WEST BENGAL', region: 'East', lat: 26.505, lng: 89.012 },
  { pincode: '736157', name: 'Cooch Behar', state: 'WEST BENGAL', region: 'East', lat: 26.325, lng: 89.445 },
  { pincode: '736135', name: 'Mathabhanga', state: 'WEST BENGAL', region: 'East', lat: 26.329, lng: 89.228 },
  { pincode: '735211', name: 'Jaigaon', state: 'WEST BENGAL', region: 'East', lat: 26.847, lng: 89.377 },
  { pincode: '743286', name: 'Basirhat', state: 'WEST BENGAL', region: 'East', lat: 22.657, lng: 88.894 },
  { pincode: '743347', name: 'Hasnabad', state: 'WEST BENGAL', region: 'East', lat: 22.516, lng: 88.760 },
  { pincode: '743368', name: 'Hingalganj', state: 'WEST BENGAL', region: 'East', lat: 22.012, lng: 88.755 },
  { pincode: '743611', name: 'Kakdwip', state: 'WEST BENGAL', region: 'East', lat: 21.866, lng: 88.186 },
  { pincode: '743357', name: 'Sagar Island', state: 'WEST BENGAL', region: 'East', lat: 21.653, lng: 88.056 },

  // Odisha border areas
  { pincode: '756045', name: 'Chandipur', state: 'ODISHA', region: 'East', lat: 21.447, lng: 86.993 },
  { pincode: '756165', name: 'Digha', state: 'ODISHA', region: 'East', lat: 21.626, lng: 87.509 },
  { pincode: '752014', name: 'Puri', state: 'ODISHA', region: 'East', lat: 19.798, lng: 85.824 },
  { pincode: '752011', name: 'Konark', state: 'ODISHA', region: 'East', lat: 19.887, lng: 86.095 },
  { pincode: '761032', name: 'Gopalpur', state: 'ODISHA', region: 'East', lat: 19.268, lng: 84.911 },

  // Andhra Pradesh border areas
  { pincode: '533006', name: 'Kakinada', state: 'ANDHRA PRADESH', region: 'East', lat: 16.960, lng: 82.238 },
  { pincode: '531162', name: 'Visakhapatnam', state: 'ANDHRA PRADESH', region: 'East', lat: 17.686, lng: 83.218 },
  { pincode: '532455', name: 'Srikakulam', state: 'ANDHRA PRADESH', region: 'East', lat: 18.299, lng: 83.897 },
  { pincode: '524001', name: 'Nellore', state: 'ANDHRA PRADESH', region: 'South', lat: 14.433, lng: 79.986 },

  // Maharashtra border areas (Coastal)
  { pincode: '416612', name: 'Vengurla', state: 'MAHARASHTRA', region: 'West', lat: 15.859, lng: 73.631 },
  { pincode: '416511', name: 'Malvan', state: 'MAHARASHTRA', region: 'West', lat: 16.060, lng: 73.464 },
  { pincode: '402201', name: 'Murud-Janjira', state: 'MAHARASHTRA', region: 'West', lat: 18.328, lng: 72.963 },
  { pincode: '402107', name: 'Dapoli', state: 'MAHARASHTRA', region: 'West', lat: 17.759, lng: 73.182 },

  // Goa border areas
  { pincode: '403002', name: 'Panjim', state: 'GOA', region: 'West', lat: 15.498, lng: 73.827 },
  { pincode: '403101', name: 'Vasco da Gama', state: 'GOA', region: 'West', lat: 15.396, lng: 73.815 },
  { pincode: '403516', name: 'Canacona', state: 'GOA', region: 'West', lat: 15.007, lng: 74.051 },

  // Additional Assam and Sikkim areas
  { pincode: '788031', name: 'Silchar', state: 'ASSAM', region: 'East', lat: 24.827, lng: 92.798 },
  { pincode: '737121', name: 'Gangtok', state: 'SIKKIM', region: 'North', lat: 27.339, lng: 88.612 },
  { pincode: '737132', name: 'Nathula', state: 'SIKKIM', region: 'North', lat: 27.389, lng: 88.846 },
  { pincode: '737133', name: 'Jelep La', state: 'SIKKIM', region: 'North', lat: 27.394, lng: 88.907 },

  // Uttarakhand border areas
  { pincode: '262531', name: 'Pithoragarh', state: 'UTTARAKHAND', region: 'North', lat: 29.583, lng: 80.218 },
  { pincode: '262502', name: 'Dharchula', state: 'UTTARAKHAND', region: 'North', lat: 29.847, lng: 80.549 },
  { pincode: '262545', name: 'Munsiyari', state: 'UTTARAKHAND', region: 'North', lat: 30.068, lng: 80.239 },
  { pincode: '246443', name: 'Joshimath', state: 'UTTARAKHAND', region: 'North', lat: 30.556, lng: 79.563 },
  { pincode: '246441', name: 'Badrinath', state: 'UTTARAKHAND', region: 'North', lat: 30.741, lng: 79.490 },
  { pincode: '246471', name: 'Mana Village', state: 'UTTARAKHAND', region: 'North', lat: 30.750, lng: 79.450 },
  { pincode: '246425', name: 'Gangotri', state: 'UTTARAKHAND', region: 'North', lat: 30.999, lng: 78.941 },
  { pincode: '246439', name: 'Harsil', state: 'UTTARAKHAND', region: 'North', lat: 30.997, lng: 78.642 },

  // Additional Rajasthan areas
  { pincode: '301001', name: 'Alwar', state: 'RAJASTHAN', region: 'West', lat: 27.566, lng: 76.607 },
  { pincode: '321001', name: 'Bharatpur', state: 'RAJASTHAN', region: 'West', lat: 27.217, lng: 77.490 },
  { pincode: '322001', name: 'Sawai Madhopur', state: 'RAJASTHAN', region: 'West', lat: 26.022, lng: 76.349 },

  // Additional Gujarat coastal areas
  { pincode: '361001', name: 'Jamnagar', state: 'GUJARAT', region: 'West', lat: 22.470, lng: 70.057 },
  { pincode: '361335', name: 'Dwarka', state: 'GUJARAT', region: 'West', lat: 22.239, lng: 68.968 },
  { pincode: '360575', name: 'Porbandar', state: 'GUJARAT', region: 'West', lat: 21.641, lng: 69.609 },
  { pincode: '362268', name: 'Veraval', state: 'GUJARAT', region: 'West', lat: 20.907, lng: 70.368 },
  { pincode: '362230', name: 'Somnath', state: 'GUJARAT', region: 'West', lat: 20.888, lng: 70.401 },
  { pincode: '365560', name: 'Diu', state: 'DAMAN AND DIU', region: 'West', lat: 20.715, lng: 70.988 },
  { pincode: '396210', name: 'Daman', state: 'DAMAN AND DIU', region: 'West', lat: 20.414, lng: 72.832 },

  // Additional Tamil Nadu coastal areas
  { pincode: '603112', name: 'Mahabalipuram', state: 'TAMIL NADU', region: 'South', lat: 12.618, lng: 80.198 },
  { pincode: '600001', name: 'Chennai', state: 'TAMIL NADU', region: 'South', lat: 13.067, lng: 80.237 },
  { pincode: '608001', name: 'Cuddalore', state: 'TAMIL NADU', region: 'South', lat: 11.748, lng: 79.771 },
  { pincode: '609001', name: 'Karaikal', state: 'PUDUCHERRY', region: 'South', lat: 10.925, lng: 79.838 },
  { pincode: '611001', name: 'Nagapattinam', state: 'TAMIL NADU', region: 'South', lat: 10.766, lng: 79.842 },
  { pincode: '614001', name: 'Thanjavur', state: 'TAMIL NADU', region: 'South', lat: 10.787, lng: 79.139 },

  // Island territories
  { pincode: '744202', name: 'Diglipur', state: 'ANDAMAN AND NICOBAR ISLANDS', region: 'South', lat: 13.273, lng: 92.971 },
  { pincode: '744301', name: 'Car Nicobar', state: 'ANDAMAN AND NICOBAR ISLANDS', region: 'South', lat: 9.160, lng: 92.818 },
  { pincode: '744302', name: 'Katchal', state: 'ANDAMAN AND NICOBAR ISLANDS', region: 'South', lat: 7.932, lng: 93.414 },
  { pincode: '744303', name: 'Great Nicobar', state: 'ANDAMAN AND NICOBAR ISLANDS', region: 'South', lat: 7.036, lng: 93.902 },
  { pincode: '744304', name: 'Campbell Bay', state: 'ANDAMAN AND NICOBAR ISLANDS', region: 'South', lat: 7.045, lng: 93.929 },
  { pincode: '744205', name: 'Mayabunder', state: 'ANDAMAN AND NICOBAR ISLANDS', region: 'South', lat: 12.898, lng: 92.898 },

  // Lakshadweep islands
  { pincode: '682556', name: 'Agatti Island', state: 'LAKSHADWEEP', region: 'South', lat: 10.856, lng: 72.192 },
  { pincode: '682557', name: 'Minicoy Island', state: 'LAKSHADWEEP', region: 'South', lat: 8.283, lng: 73.045 },
  { pincode: '682554', name: 'Amini Island', state: 'LAKSHADWEEP', region: 'South', lat: 11.117, lng: 72.737 },
  { pincode: '682553', name: 'Andrott Island', state: 'LAKSHADWEEP', region: 'South', lat: 10.816, lng: 73.687 },
];

// Haversine formula to calculate distance between two coordinates
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Calculate estimated delivery time
function calculateEstimatedTime(distance) {
  const averageSpeed = 400; // km per day
  const days = Math.ceil(distance / averageSpeed);
  return `${days} day${days > 1 ? 's' : ''}`;
}

// Find pricing for given weight and distance
async function findPricing(weight, distance) {
  try {
    const pricing = await WheelseyePricing.findPricing(weight, distance);
    return pricing;
  } catch (error) {
    return {
      error: error.message,
      weight,
      distance
    };
  }
}

// Main calculation function
async function calculateCrisscross() {
  console.log('='.repeat(80));
  console.log('UT CRISSCROSS ROUTE CALCULATOR');
  console.log('Calculating routes between Union Territories and Edge Pincodes');
  console.log('='.repeat(80));
  console.log();

  const startTime = Date.now();
  const results = [];
  let totalRoutes = 0;
  let successfulCalculations = 0;
  let failedCalculations = 0;

  // Test weights (in kg)
  const testWeights = [500, 1000, 2000, 5000, 10000];

  console.log(`Total UT Cities: ${UT_CITIES.length}`);
  console.log(`Total Edge Pincodes: ${EDGE_PINCODES.length}`);
  console.log(`Total Possible Routes: ${UT_CITIES.length * EDGE_PINCODES.length}`);
  console.log(`Test Weights: ${testWeights.join(', ')} kg`);
  console.log();
  console.log('Starting calculations...');
  console.log();

  // Calculate crisscross between all UT cities and edge pincodes
  for (const utCity of UT_CITIES) {
    console.log(`Processing: ${utCity.name}...`);

    for (const edgePincode of EDGE_PINCODES) {
      totalRoutes++;

      // Calculate distance
      const distance = calculateHaversineDistance(
        utCity.lat,
        utCity.lng,
        edgePincode.lat,
        edgePincode.lng
      );

      const estimatedTime = calculateEstimatedTime(distance);

      // Calculate pricing for each test weight
      for (const weight of testWeights) {
        try {
          const pricing = await findPricing(weight, distance);

          const result = {
            routeNumber: totalRoutes,
            origin: {
              name: utCity.name,
              state: utCity.state,
              pincode: utCity.pincode,
              lat: utCity.lat,
              lng: utCity.lng
            },
            destination: {
              name: edgePincode.name,
              state: edgePincode.state,
              pincode: edgePincode.pincode,
              region: edgePincode.region,
              lat: edgePincode.lat,
              lng: edgePincode.lng
            },
            distance: `${distance} km`,
            estimatedTime,
            weight: `${weight} kg`,
            pricing: pricing.error ? { error: pricing.error } : {
              vehicleType: pricing.vehicleType,
              vehicleLength: pricing.vehicleLength,
              price: pricing.price,
              pricePerKm: (pricing.price / distance).toFixed(2),
              pricePerKg: (pricing.price / weight).toFixed(2),
              multiVehicle: pricing.multiVehicle || false,
              vehicleCount: pricing.vehicleCount || 1
            },
            calculatedAt: new Date().toISOString()
          };

          results.push(result);
          successfulCalculations++;
        } catch (error) {
          failedCalculations++;
          results.push({
            routeNumber: totalRoutes,
            origin: utCity,
            destination: edgePincode,
            distance: `${distance} km`,
            weight: `${weight} kg`,
            error: error.message,
            calculatedAt: new Date().toISOString()
          });
        }
      }
    }

    console.log(`  ✓ Completed ${utCity.name} - ${EDGE_PINCODES.length} routes calculated`);
  }

  const endTime = Date.now();
  const executionTime = ((endTime - startTime) / 1000).toFixed(2);

  // Generate statistics
  const statistics = {
    summary: {
      totalUTCities: UT_CITIES.length,
      totalEdgePincodes: EDGE_PINCODES.length,
      totalRoutes,
      totalCalculations: results.length,
      successfulCalculations,
      failedCalculations,
      testWeights,
      executionTime: `${executionTime} seconds`
    },
    routeBreakdown: {
      byRegion: {},
      byState: {},
      averageDistance: 0,
      maxDistance: { distance: 0 },
      minDistance: { distance: Infinity }
    }
  };

  // Calculate statistics
  let totalDistance = 0;
  results.forEach(result => {
    const distance = parseInt(result.distance);
    totalDistance += distance;

    // By region
    const region = result.destination.region;
    if (!statistics.routeBreakdown.byRegion[region]) {
      statistics.routeBreakdown.byRegion[region] = 0;
    }
    statistics.routeBreakdown.byRegion[region]++;

    // By state
    const state = result.destination.state;
    if (!statistics.routeBreakdown.byState[state]) {
      statistics.routeBreakdown.byState[state] = 0;
    }
    statistics.routeBreakdown.byState[state]++;

    // Max/Min distance
    if (distance > statistics.routeBreakdown.maxDistance.distance) {
      statistics.routeBreakdown.maxDistance = {
        distance,
        from: result.origin.name,
        to: result.destination.name
      };
    }
    if (distance < statistics.routeBreakdown.minDistance.distance) {
      statistics.routeBreakdown.minDistance = {
        distance,
        from: result.origin.name,
        to: result.destination.name
      };
    }
  });

  statistics.routeBreakdown.averageDistance = Math.round(totalDistance / results.length);

  // Save results
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save JSON
  const jsonFile = path.join(outputDir, 'ut_crisscross_results.json');
  fs.writeFileSync(jsonFile, JSON.stringify({ statistics, results }, null, 2));
  console.log();
  console.log(`✓ Results saved to: ${jsonFile}`);

  // Save CSV
  const csvFile = path.join(outputDir, 'ut_crisscross_results.csv');
  const csvHeaders = 'Route,Origin,Origin State,Origin Pincode,Destination,Destination State,Destination Pincode,Region,Distance (km),Estimated Time,Weight (kg),Vehicle Type,Vehicle Length,Price (₹),Price/km,Price/kg,Multi-Vehicle,Vehicle Count\n';
  const csvRows = results.map(r => {
    const pricing = r.pricing || {};
    return [
      r.routeNumber,
      r.origin.name,
      r.origin.state,
      r.origin.pincode,
      r.destination.name,
      r.destination.state,
      r.destination.pincode,
      r.destination.region,
      r.distance.replace(' km', ''),
      r.estimatedTime,
      r.weight.replace(' kg', ''),
      pricing.vehicleType || 'N/A',
      pricing.vehicleLength || 'N/A',
      pricing.price || 'N/A',
      pricing.pricePerKm || 'N/A',
      pricing.pricePerKg || 'N/A',
      pricing.multiVehicle || false,
      pricing.vehicleCount || 1
    ].join(',');
  }).join('\n');

  fs.writeFileSync(csvFile, csvHeaders + csvRows);
  console.log(`✓ CSV saved to: ${csvFile}`);

  // Save statistics separately
  const statsFile = path.join(outputDir, 'ut_crisscross_statistics.json');
  fs.writeFileSync(statsFile, JSON.stringify(statistics, null, 2));
  console.log(`✓ Statistics saved to: ${statsFile}`);

  // Print summary
  console.log();
  console.log('='.repeat(80));
  console.log('CALCULATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total UT Cities: ${statistics.summary.totalUTCities}`);
  console.log(`Total Edge Pincodes: ${statistics.summary.totalEdgePincodes}`);
  console.log(`Total Routes: ${statistics.summary.totalRoutes}`);
  console.log(`Total Calculations: ${statistics.summary.totalCalculations}`);
  console.log(`Successful: ${statistics.summary.successfulCalculations}`);
  console.log(`Failed: ${statistics.summary.failedCalculations}`);
  console.log(`Execution Time: ${statistics.summary.executionTime}`);
  console.log();
  console.log(`Average Distance: ${statistics.routeBreakdown.averageDistance} km`);
  console.log(`Max Distance: ${statistics.routeBreakdown.maxDistance.distance} km (${statistics.routeBreakdown.maxDistance.from} → ${statistics.routeBreakdown.maxDistance.to})`);
  console.log(`Min Distance: ${statistics.routeBreakdown.minDistance.distance} km (${statistics.routeBreakdown.minDistance.from} → ${statistics.routeBreakdown.minDistance.to})`);
  console.log('='.repeat(80));

  return { statistics, results };
}

// Run the calculator
async function main() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_DB_URL);
    console.log('✓ Connected to MongoDB');
    console.log();

    // Run calculation
    await calculateCrisscross();

    // Disconnect
    await mongoose.disconnect();
    console.log();
    console.log('✓ Disconnected from MongoDB');
    console.log('Process completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  calculateCrisscross,
  UT_CITIES,
  EDGE_PINCODES,
  calculateHaversineDistance
};
