import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // NEW: Import Link
import { BoxDetails as BoxDetailsType, ShipmentOverviewType, VendorQuote } from '../types';
import ShipmentOverview from '../components/ShipmentOverview';
import BoxDetails from '../components/BoxDetails';
import FreightOptions from '../components/FreightOptions';
import VendorComparison from '../components/VendorComparison';
import { calculateTotals } from '../utils/calculations';
import { calculateVendorQuotes } from '../data/vendors';
import { usePincodeData } from '../hooks/usePincodeData'; // Use pincode system
import { zoneDistanceService } from '../services/zoneDistanceService'; // Zone-based distance
import { Truck, Calculator as CalculatorIcon, Package, LogIn } from 'lucide-react'; // NEW: Added LogIn icon

const Calculator = () => {
  // NEW: Use existing pincode data system
  const pincodeData = usePincodeData();

  // State for shipment overview
  const [shipment, setShipment] = useState<ShipmentOverviewType>({
    date: new Date().toISOString().split('T')[0],
    shipperLocation: '',
    destination: '',
    modeOfTransport: 'Road',
    totalBoxes: 0,
    totalWeight: 0,
    actualWeight: 0,
  });

  // State for box details
  const [boxes, setBoxes] = useState<BoxDetailsType[]>([]);

  // State for freight options
  const [isExpressShipment, setIsExpressShipment] = useState(false);
  const [isFragileShipment, setIsFragileShipment] = useState(false);

  // State for vendor quotes
  const [vendorQuotes, setVendorQuotes] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // NEW: State for zone distance service
  const [isZoneDistanceReady, setIsZoneDistanceReady] = useState(false);

  // Calculate totals whenever boxes change
  const totals = calculateTotals(boxes);

  // Update shipment totals when boxes change
  useEffect(() => {
    setShipment((prev: any) => ({
      ...prev,
      totalBoxes: totals.totalBoxes,
      totalWeight: totals.totalWeight
    }));
  }, [boxes]);

  // NEW: Load zone distance matrix on mount
  useEffect(() => {
    const loadZoneDistance = async () => {
      try {
        await zoneDistanceService.loadDistanceMatrix();
        setIsZoneDistanceReady(true);
      } catch (error) {
        console.error('Failed to load zone distance matrix:', error);
        // Service will fall back to old system if this fails
      }
    };

    loadZoneDistance();
  }, []);
  
  const calculateQuotes = () => {
    if (!shipment.shipperLocation || !shipment.destination) {
      alert('Please enter both origin and destination pincodes');
      return;
    }

    if (boxes.length === 0) {
      alert('Please add at least one box to calculate shipping costs');
      return;
    }

    setIsCalculating(true);

    // Simulate API call with a slight delay
    setTimeout(() => {
      let distance: number;
      let routeInfo = '';

      // ❌ NO FALLBACKS - Require pincode data to be ready
      if (!pincodeData.ready || !isZoneDistanceReady) {
        setIsCalculating(false);
        alert('⚠️ Pincode service not ready. Please wait a moment and try again.');
        return;
      }

      // Lookup both pincodes in database
      const fromPincodeData = pincodeData.lookupByPincode(shipment.shipperLocation);
      const toPincodeData = pincodeData.lookupByPincode(shipment.destination);

      // ❌ STRICT VALIDATION - Show error if origin pincode not found
      if (!fromPincodeData) {
        setIsCalculating(false);
        alert(`❌ Origin pincode ${shipment.shipperLocation} not found in database.\n\nPlease enter a valid Indian pincode.`);
        console.error(`Origin pincode not found: ${shipment.shipperLocation}`);
        return;
      }

      // ❌ STRICT VALIDATION - Show error if destination pincode not found
      if (!toPincodeData) {
        setIsCalculating(false);
        alert(`❌ Destination pincode ${shipment.destination} not found in database.\n\nPlease enter a valid Indian pincode.`);
        console.error(`Destination pincode not found: ${shipment.destination}`);
        return;
      }

      // Get zones for both pincodes
      const fromZone = fromPincodeData.zone;
      const toZone = toPincodeData.zone;

      // Get zone-based distance
      const zoneDistance = zoneDistanceService.getZoneDistance(fromZone, toZone);

      // ❌ STRICT VALIDATION - Show error if zone distance not found
      if (zoneDistance === null) {
        setIsCalculating(false);
        alert(`❌ Distance not available for route:\n${fromPincodeData.city} (${fromZone}) → ${toPincodeData.city} (${toZone})\n\nPlease contact support to add this route.`);
        console.error(`Zone distance not found: ${fromZone} → ${toZone}`);
        return;
      }

      // ✅ All validations passed - use zone-based distance
      distance = zoneDistance;
      routeInfo = `${fromPincodeData.city}, ${fromPincodeData.state} (${fromZone}) → ${toPincodeData.city}, ${toPincodeData.state} (${toZone})`;
      console.log(`✅ Using zone-based distance: ${distance} km`);
      console.log(`📍 Route: ${routeInfo}`);

      // Calculate vendor quotes (unchanged - existing pricing logic)
      const quotes = calculateVendorQuotes(
        shipment.actualWeight || totals.totalWeight,
        totals.totalVolumetricWeight,
        distance,
        shipment.modeOfTransport,
        isExpressShipment,
        isFragileShipment
      );

      setVendorQuotes(quotes);
      setIsCalculating(false);
      setShowResults(true);

      // Log calculation details
      console.log('📦 Calculation Summary:');
      console.log(`   Distance: ${distance} km`);
      console.log(`   Route: ${routeInfo}`);
      console.log(`   Vendors: ${quotes.length}`);

      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Truck className="text-blue-700 h-8 w-8" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">FreightCompare</h1>
            </div>
            <div className="flex items-center space-x-4"> {/* NEW: Flex container for text and button */}
              <div className="text-sm text-gray-500 hidden sm:block">The Logistics Cost Calculator</div> {/* NEW: Hide on small screens */}
              {/* NEW: Admin Login Button */}
              <Link to="/admin/login">
                <button
                  type="button"
                  className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm"
                >
                  <LogIn size={16} className="mr-1 sm:mr-2" />
                  Admin
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Freight Cost Calculator</h1>
          <p className="text-gray-600">Compare shipping rates from multiple vendors based on your shipment details</p>
        </div>
        
        {/* Form Sections */}
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <Package className="text-blue-600 h-5 w-5 mr-2" />
            <h2 className="text-lg font-semibold">Shipment Information</h2>
          </div>
          <ShipmentOverview 
            shipment={shipment} 
            setShipment={setShipment}
            totalBoxes={totals.totalBoxes}
            totalWeight={totals.totalWeight}
          />
          
          <BoxDetails 
            boxes={boxes} 
            setBoxes={setBoxes}
            mode={shipment.modeOfTransport}
          />
          
          <FreightOptions
            isExpressShipment={isExpressShipment}
            setIsExpressShipment={setIsExpressShipment}
            isFragileShipment={isFragileShipment}
            setIsFragileShipment={setIsFragileShipment}
          />
          
          <div className="flex justify-center mt-8 mb-12">
            <button
              onClick={calculateQuotes}
              disabled={isCalculating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium text-lg transition-colors disabled:bg-blue-300"
            >
              <CalculatorIcon size={20} />
              {isCalculating ? 'Calculating...' : 'Calculate Freight Costs'}
            </button>
          </div>
        </div>
        
        {/* Results Section */}
        {showResults && (
          <div id="results" className="mt-8 animate-fadeIn">
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Results</h2>
              <div className="ml-auto">
                <button 
                  onClick={() => window.print()} 
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md transition-colors"
                >
                  Print Results
                </button>
              </div>
            </div>
            
            <VendorComparison quotes={vendorQuotes as any} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Calculator;