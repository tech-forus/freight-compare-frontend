# Serviceability Migration Guide

## Problem
Old vendors created before the schema fix have empty `serviceability: []` in MongoDB because the `priceChart: {}` bug caused Mongoose to strip the field during save.

## Solution Applied

### 1. Schema Fix (DONE)
**File**: `backend/model/temporaryTransporterModel.js:598`

Changed:
```javascript
priceChart: {},
```

To:
```javascript
priceChart: {
  type: mongoose.Schema.Types.Mixed,
  default: {}
},
```

**Why**: The empty object `{}` caused Mongoose to treat `prices` as a strict subdocument, overriding the parent schema's `strict: false` and stripping the `serviceability` field during save.

### 2. Migration for Old Vendors

#### Run Migration Script
```bash
cd backend
node scripts/migrateServiceability.js
```

#### What It Does
1. Finds vendors with `zoneConfig` but empty `serviceability`
2. Rebuilds `serviceability` array from `zoneConfig` pincodes
3. Sets `serviceabilitySource: 'migrated'`
4. Preserves all other vendor data

#### Limitations
- `state` and `city` fields will be empty (need manual update or lookup)
- `isODA` defaults to `false` (may need correction)
- `serviceabilityChecksum` will be empty (regenerate on next edit)

## Verification

### 1. Test New Vendor Save
```javascript
// Create a new vendor with serviceability
POST /api/transporter/addtiedupcompanies
{
  // ... vendor data
  serviceability: [
    { pincode: "110001", zone: "N1", state: "Delhi", city: "New Delhi", isODA: false, active: true }
  ],
  serviceabilityChecksum: "abc123",
  serviceabilitySource: "excel"
}

// Check MongoDB
db.temporaryTransporters.findOne({ companyName: "NewVendor" })
// Should show: serviceability: [ { pincode: "110001", zone: "N1", ... } ]
```

### 2. Check Old Vendors After Migration
```javascript
db.temporaryTransporters.find({ serviceabilitySource: "migrated" })
// Should show rebuilt serviceability arrays
```

## Rollback
If issues occur, the migration can be reversed:
```javascript
db.temporaryTransporters.updateMany(
  { serviceabilitySource: "migrated" },
  { $set: { serviceability: [], serviceabilitySource: "" } }
)
```

## Long-term Recommendations

1. **Add validation**: Consider adding schema validation to prevent empty arrays
2. **Add checksums**: Implement checksum verification on save
3. **Add logging**: Log when serviceability is empty on new saves
4. **UI warning**: Show warning in UI if vendor has no serviceability data
