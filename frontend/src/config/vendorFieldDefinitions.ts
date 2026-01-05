// config/vendorFieldDefinitions.ts
export const PRICE_FIELDS = {
  minWeight:             { label: "Min Chargeable Weight (KG)", max: 10000, suffix: "KG", allowDecimal: false },
  docketCharges:         { label: "Docket Charges (₹)",         max: 500,   suffix: "₹",  allowDecimal: false },
  fuel:                  { label: "Fuel Surcharge (%)",         max: 40,    suffix: "%",  allowDecimal: false, dropdown: "fuel" },
  divisor:               { label: "Volumetric Divisor",         max: 7000,                allowDecimal: false, dropdown: "divisor" },
  minCharges:            { label: "Minimum Charges (₹)",        max: 10000, suffix: "₹",  allowDecimal: false },
  greenTax:              { label: "Green Tax (₹)/NGT",          max: 10000, suffix: "₹",  allowDecimal: false },
  daccCharges:           { label: "DACC Charges (₹)",           max: 1000,  suffix: "₹",  allowDecimal: false },
  hamaliCharges:         { label: "Hamali Charges (₹)",         max: 10000, suffix: "₹",  allowDecimal: false },
  miscellanousCharges:   { label: "Misc/AOC Charges (₹)",       max: 10000, suffix: "₹",  allowDecimal: false },
} as const;

export type PriceFieldKey = keyof typeof PRICE_FIELDS;
