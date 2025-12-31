# Charges UI Redesign - Implementation Guide

## Overview

Complete redesign of the Charges section from a single card with simple inputs to a mixed layout with:
- **7 Simple numeric inputs** (Basic Charges)
- **5 Compact charge cards** (Special Charges)

---

## Frontend Implementation (✅ Complete)

### Files Changed/Created

1. **`src/utils/chargeValidators.ts`** (NEW)
   - Validation functions for charge cards
   - Constants: `UNIT_OPTIONS`, `VARIABLE_RANGES`, etc.
   - No auto-clamping validation logic

2. **`src/utils/validators.ts`** (UPDATED)
   - Extended Charges schema to support mixed structure
   - Added `ChargeCardSchema` for zod validation
   - Exported `ChargeCardData` type

3. **`src/hooks/useCharges.ts`** (REWRITTEN)
   - Support for mixed charge types (simple + cards)
   - New methods: `setCardField`, `validateCardField`
   - Nested error handling
   - `firstErrorRef` for focus management

4. **`src/components/CompactChargeCard.tsx`** (NEW)
   - Individual card component
   - Unit dropdown, Currency toggle, Fixed/Variable toggle
   - Fixed amount input, Variable dropdown, Weight threshold
   - Full accessibility (aria attributes)
   - Inline error display

5. **`src/components/ChargesSection.tsx`** (REBUILT)
   - Split into "Basic Charges" and "Special Charges" sections
   - Responsive grid layout (1/2/3 columns)
   - 7 simple fields + 5 compact cards

---

## UI Features

### Compact Charge Cards

Each card includes:
- **Header:** Title + tooltip icon + Unit dropdown (top-right)
- **Currency Toggle:** ₹ / % buttons
- **Mode Toggle:** Fixed / Variable (only shown when ₹ selected)
- **Fixed Amount Input:** 1-5000 range (only for ₹ + Fixed)
- **Variable Dropdown:** 5 predefined ranges (for % or ₹ + Variable)
- **Weight Threshold:** 1-20000 range input

### Cards

1. **Handling** - Material handling and processing charges
2. **ROV / FOV** - Risk of Value / Freight on Value charges
3. **COD / DOD** - Cash on Delivery / Delivery on Demand
4. **To-Pay** - To-pay shipment charges
5. **Appointment** - Scheduled delivery charges

---

## Validation Rules

### No Auto-Clamping
- Invalid values are kept as-is
- Errors shown inline below fields
- User must manually correct values

### Error Messages (Exact Text)

```
"Enter amount between 1-5,000"       // Fixed amount out of range
"Enter amount between 1-20,000"      // Weight threshold out of range
"This field is required"             // Empty required field
"Please choose a valid percentage range"  // Invalid variable selection
```

### Validation Ranges

| Field | Min | Max | Type |
|-------|-----|-----|------|
| Fixed Amount | 1 | 5,000 | Number (when ₹ + Fixed) |
| Weight Threshold | 1 | 20,000 | Number |
| Variable Range | - | - | Enum (dropdown only) |
| Unit | - | - | Enum (per kg/piece/box) |

### Variable Range Options

```
0%
0.1% - 1%
1.25% - 2.5%
3% - 4%
4% - 5%
```

---

## Behavior Rules

1. **Currency = ₹:**
   - Show Fixed/Variable toggle
   - If Fixed: Show fixed amount input (1-5000)
   - If Variable: Show variable dropdown

2. **Currency = %:**
   - Hide Fixed/Variable toggle
   - Show only variable dropdown

3. **Validation:**
   - On blur: Validate field and show inline error
   - On submit: Validate all, focus first error

4. **Error Display:**
   - Red border on invalid field
   - Red error text below field
   - `aria-invalid="true"` set
   - `aria-describedby` points to error ID

---

## Backend Implementation (Reference Provided)

### File: `server-reference/validateCharges.js`

This is a **reference implementation** for Express.js. Copy to your backend project.

#### Usage

```javascript
const { validateCharges } = require('./middleware/validateCharges');

// In your routes
router.post('/api/vendors', validateCharges, createVendor);
router.put('/api/vendors/:id', validateCharges, updateVendor);
```

#### Validation Logic

The middleware validates:
- Simple charges: 0-10000 range
- Fuel surcharge: 0-40 range
- Card units: 'per kg', 'per piece', 'per box'
- Fixed amounts: 1-5000
- Variable ranges: One of 5 predefined values
- Weight thresholds: 1-20000

#### Error Response Format

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "handlingCharges.fixedAmount": "Enter amount between 1-5,000",
    "rovCharges.weightThreshold": "Enter amount between 1-20,000",
    "codCharges.variableRange": "Please choose a valid percentage range"
  }
}
```

Returns **400 Bad Request** on validation failure.

---

## Data Structure

### Simple Charges (Numbers)

```typescript
{
  docketCharges: number;      // 0-10000
  minWeightKg: number;        // 0-10000
  minCharges: number;         // 0-10000
  hamaliCharges: number;      // 0-10000
  greenTax: number;           // 0-10000
  miscCharges: number;        // 0-10000
  fuelSurchargePct: number;   // 0-40
}
```

### Card-Based Charges (Objects)

```typescript
{
  handlingCharges: ChargeCardData;
  rovCharges: ChargeCardData;
  codCharges: ChargeCardData;
  toPayCharges: ChargeCardData;
  appointmentCharges: ChargeCardData;
}

interface ChargeCardData {
  unit: 'per kg' | 'per piece' | 'per box';
  currency: 'INR' | 'PERCENT';
  mode: 'FIXED' | 'VARIABLE';
  fixedAmount: number;      // 1-5000 (when INR + FIXED)
  variableRange: string;    // One of VARIABLE_RANGES
  weightThreshold: number;  // 1-20000
}
```

---

## Testing Checklist

### UI Tests

- [ ] Cards display in responsive grid (1/2/3 columns)
- [ ] Unit dropdown works in card header
- [ ] Currency toggle (₹/%) updates correctly
- [ ] Fixed/Variable toggle shows only for ₹
- [ ] Fixed input shows only for ₹ + Fixed
- [ ] Variable dropdown shows for % or ₹ + Variable
- [ ] Weight threshold always visible
- [ ] Entering 0 in fixed amount → shows "Enter amount between 1-5,000"
- [ ] Entering 6000 in fixed amount → shows error, value kept
- [ ] Entering 0 in weight threshold → shows "Enter amount between 1-20,000"
- [ ] Entering 30000 in weight threshold → shows error, value kept
- [ ] Blur triggers validation
- [ ] Errors display inline in red
- [ ] No auto-clamping of invalid values
- [ ] Simple charges still work as before

### Accessibility Tests

- [ ] All toggles have `aria-pressed`
- [ ] All inputs have `aria-invalid` when errored
- [ ] Error messages have unique IDs
- [ ] Inputs have `aria-describedby` pointing to error IDs
- [ ] Keyboard navigation works
- [ ] Screen reader announces errors

### Backend Tests

- [ ] Valid payload passes validation
- [ ] Fixed amount < 1 → 400 error
- [ ] Fixed amount > 5000 → 400 error
- [ ] Weight threshold < 1 → 400 error
- [ ] Weight threshold > 20000 → 400 error
- [ ] Invalid unit → 400 error
- [ ] Invalid variable range → 400 error
- [ ] Error response has correct format
- [ ] Error field names match frontend structure

---

## Integration with Your Backend

### Option 1: Express.js

Use the provided `server-reference/validateCharges.js` directly:

```javascript
const { validateCharges } = require('./middleware/validateCharges');

app.post('/api/vendors', validateCharges, async (req, res) => {
  // req.body.charges is already validated
  const vendor = await Vendor.create(req.body);
  res.json({ success: true, data: vendor });
});
```

### Option 2: Other Frameworks

Extract the validation logic from `validateCharges.js` and adapt to your framework:

- **NestJS:** Create a ValidationPipe
- **FastAPI:** Create Pydantic models
- **Spring Boot:** Use @Valid with custom validators
- **Laravel:** Create FormRequest validation

The validation rules are framework-agnostic.

---

## Migration Notes

### Breaking Changes

The `Charges` type structure has changed:

**Before:**
```typescript
{
  handlingCharges: number;
  rovCharges: number;
  codCharges: number;
  toPayCharges: number;
  appointmentCharges: number;
}
```

**After:**
```typescript
{
  handlingCharges: ChargeCardData;
  rovCharges: ChargeCardData;
  codCharges: ChargeCardData;
  toPayCharges: ChargeCardData;
  appointmentCharges: ChargeCardData;
}
```

### Migration Script

If you have existing data, you'll need a migration to convert:

```javascript
// Migration example
function migrateCharges(oldCharges) {
  return {
    ...oldCharges,
    handlingCharges: {
      unit: 'per kg',
      currency: 'INR',
      mode: 'FIXED',
      fixedAmount: oldCharges.handlingCharges || 0,
      variableRange: '0%',
      weightThreshold: 1,
    },
    // Repeat for rovCharges, codCharges, toPayCharges, appointmentCharges
  };
}
```

---

## Summary

✅ **Frontend:** Fully implemented with compact cards, validation, accessibility
✅ **Backend:** Reference middleware provided for Express.js
✅ **Validation:** Strict rules, no auto-clamping, exact error messages
✅ **UX:** Inline errors, blur validation, focus management, responsive grid
✅ **Accessibility:** Full ARIA support, keyboard navigation

**Total Code:**
- 3 new files created
- 3 files updated
- ~750 lines of new code
- Fully backward compatible for simple charges
