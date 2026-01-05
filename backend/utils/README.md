# Utils Directory - Shared Services

## 🎯 distanceService.js - SINGLE SOURCE OF TRUTH

**This is the ONLY place distance calculation should be implemented.**

### Usage

```javascript
import { calculateDistanceBetweenPincode } from '../utils/distanceService.js';

// Calculate distance between pincodes
const result = await calculateDistanceBetweenPincode('110020', '560060');
// { estTime: "6", distance: "2100 km", distanceKm: 2100 }
```

### ⚠️ IMPORTANT RULES

#### ✅ DO:
- **ALWAYS** import `calculateDistanceBetweenPincode` from this file
- Report bugs in this file (create GitHub issue)
- Use try-catch to handle errors

#### ❌ DON'T:
- **NEVER** copy this function to other files
- **NEVER** create local distance calculation functions
- **NEVER** use haversine formula directly
- **NEVER** call Google Maps API directly

### Error Handling

The function throws specific errors that you should handle:

```javascript
try {
  const result = await calculateDistanceBetweenPincode(origin, destination);
  // Use result.distanceKm, result.estTime, result.distance
} catch (error) {
  if (error.code === 'NO_ROAD_ROUTE') {
    // No road connection exists (e.g., Andaman Islands)
    return res.status(400).json({
      error: "Route not serviceable",
      message: error.message
    });
  }
  if (error.code === 'PINCODE_NOT_FOUND') {
    // Invalid pincode
    return res.status(400).json({
      error: "Invalid pincode",
      field: error.field
    });
  }
  // Handle other errors...
}
```

### Why This Matters

**Problem**: We had 3 different implementations of distance calculation:
- `utils/distanceService.js` (correct - Google Maps)
- `controllers/biddingController.js` (wrong - haversine fallback)
- `routes/vendorRoute.js` (wrong - inline API call)

**Result**: Different endpoints returned different distances for same route!
- `/api/transporter/calculate-price` → 2100 km ✅
- `/api/bidding/calculate` → 1736 km ❌

**Solution**: ONE function to rule them all. Delete duplicates. Import everywhere.

### Current Consumers

These files correctly import from distanceService:

1. ✅ `controllers/biddingController.js`
2. ✅ `controllers/transportController.js`
3. ✅ `routes/vendorRoute.js`
4. ✅ `utils/priceService.js`

### Implementation Details

- **API**: Google Maps Distance Matrix API
- **Cache**: 30-day in-memory Map
- **Performance**: <5ms (cached), ~500ms (first call)
- **Cost**: ~₹0.40 per uncached request
- **Accuracy**: 98%+ (matches Google Maps exactly)

### Testing

Run the test script to verify:

```bash
cd backend
node test-distance-google.js
```

### Architecture Decision Record

**Date**: 2025-12-31
**Decision**: Use single distanceService.js for ALL distance calculations
**Rationale**:
- Prevents code duplication
- Ensures consistency across all endpoints
- Centralizes Google Maps API usage
- Makes caching efficient
- Easier to maintain and debug

**Consequences**:
- Developers MUST import from this file
- NO local implementations allowed
- Changes affect all endpoints (intentional!)

---

## Related Files

- `distanceService.js` - Distance calculation (THIS FILE)
- `chargeableWeightService.js` - Chargeable weight calculation
- `priceService.js` - Price calculation orchestration

---

**Last Updated**: 2025-12-31
**Maintained By**: Backend Team
