// Test file for Wheelseye pricing logic
import { calculateLocalWheelseyePrice } from '../services/wheelseye';

// Test cases to verify pricing logic
export function testWheelseyePricing() {
  console.log('🧪 Testing Wheelseye Pricing Logic...\n');

  // Test Case 1: Tata Ace - 900kg, 100km
  console.log('Test Case 1: Tata Ace');
  const test1 = calculateLocalWheelseyePrice(900, 100, [
    { count: 1, length: 50, width: 50, height: 50, weight: 900 }
  ]);
  console.log(`Weight: 900kg, Distance: 100km`);
  console.log(`Vehicle: ${test1.vehicle}, Price: ₹${test1.price}`);
  console.log(`Expected: Tata Ace, ₹4300\n`);

  // Test Case 2: Pickup - 1100kg, 200km
  console.log('Test Case 2: Pickup');
  const test2 = calculateLocalWheelseyePrice(1100, 200, [
    { count: 1, length: 60, width: 60, height: 60, weight: 1100 }
  ]);
  console.log(`Weight: 1100kg, Distance: 200km`);
  console.log(`Vehicle: ${test2.vehicle}, Price: ₹${test2.price}`);
  console.log(`Expected: Pickup, ₹7000\n`);

  // Test Case 3: Eicher 14 ft - 2000kg, 500km
  console.log('Test Case 3: Eicher 14 ft');
  const test3 = calculateLocalWheelseyePrice(2000, 500, [
    { count: 1, length: 100, width: 100, height: 100, weight: 2000 }
  ]);
  console.log(`Weight: 2000kg, Distance: 500km`);
  console.log(`Vehicle: ${test3.vehicle}, Price: ₹${test3.price}`);
  console.log(`Expected: Eicher 14 ft, ₹22600\n`);

  // Test Case 4: Eicher 19 ft - 5000kg, 1000km
  console.log('Test Case 4: Eicher 19 ft');
  const test4 = calculateLocalWheelseyePrice(5000, 1000, [
    { count: 1, length: 150, width: 150, height: 150, weight: 5000 }
  ]);
  console.log(`Weight: 5000kg, Distance: 1000km`);
  console.log(`Vehicle: ${test4.vehicle}, Price: ₹${test4.price}`);
  console.log(`Expected: Eicher 19 ft, ₹35900\n`);

  // Test Case 5: Container 32 ft MXL - 15000kg, 1500km
  console.log('Test Case 5: Container 32 ft MXL');
  const test5 = calculateLocalWheelseyePrice(15000, 1500, [
    { count: 1, length: 200, width: 200, height: 200, weight: 15000 }
  ]);
  console.log(`Weight: 15000kg, Distance: 1500km`);
  console.log(`Vehicle: ${test5.vehicle}, Price: ₹${test5.price}`);
  console.log(`Expected: Container 32 ft MXL, ₹113300\n`);

  // Test Case 6: Edge case - very light weight
  console.log('Test Case 6: Very light weight (fallback)');
  const test6 = calculateLocalWheelseyePrice(500, 300, [
    { count: 1, length: 30, width: 30, height: 30, weight: 500 }
  ]);
  console.log(`Weight: 500kg, Distance: 300km`);
  console.log(`Vehicle: ${test6.vehicle}, Price: ₹${test6.price}`);
  console.log(`Expected: Fallback pricing\n`);

  // Test Case 7: Edge case - very heavy weight
  console.log('Test Case 7: Very heavy weight (multiple vehicles)');
  const test7 = calculateLocalWheelseyePrice(25000, 800, [
    { count: 1, length: 300, width: 300, height: 300, weight: 25000 }
  ]);
  console.log(`Weight: 25000kg, Distance: 800km`);
  console.log(`Vehicle: ${test7.vehicle}, Price: ₹${test7.price}`);
  console.log(`Expected: Multiple vehicles pricing\n`);

  console.log('✅ Wheelseye pricing tests completed!');
}

// Export for use in other files
export default testWheelseyePricing;

