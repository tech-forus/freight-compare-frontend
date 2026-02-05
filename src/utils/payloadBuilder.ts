import type { WizardDataV1, PriceMatrix } from "../types/wizard.types";

export interface VendorPayload {
  customerID: string;
  companyName: string;
  vendorCode: string;
  vendorPhone: number;
  vendorEmail: string;
  gstNo: string;
  transportMode: "road" | "air" | "rail" | "ship";
  address: string;
  state: string;
  pincode: number;
  prices: {
    priceRate: {
      minWeight: number;
      docketCharges: number;
      fuel: number;
      rovCharges: { variable: number; fixed: number };
      codCharges: { variable: number; fixed: number };
      topayCharges: { variable: number; fixed: number };
      handlingCharges: {
        variable: number;
        fixed: number;
        threshholdweight: number;
      };
      appointmentCharges: { variable: number; fixed: number };
      divisor: number;
      minCharges: number;
      greenTax: number;
      daccCharges: number;
      miscellanousCharges: number;
      insuaranceCharges: { variable: number; fixed: number };
      odaCharges: { variable: number; fixed: number };
      prepaidCharges: { variable: number; fixed: number };
      fmCharges: { variable: number; fixed: number };
    };
    priceChart: PriceMatrix;
  };
}

/**
 * Build backend payload from wizard data and form data
 */
export const buildVendorPayload = (
  formData: {
    customerID: string;
    companyName: string;
    vendorCode: string;
    vendorPhone: string;
    vendorEmail: string;
    gstNo: string;
    transportMode: string;
    address: string;
    state: string;
    pincode: string;
  },
  wizardData: WizardDataV1
): VendorPayload => {
  // Parse numeric fields
  const vendorPhone = parseInt(formData.vendorPhone, 10);
  const pincode = parseInt(formData.pincode, 10);

  // Validate numeric conversions
  if (isNaN(vendorPhone) || isNaN(pincode)) {
    throw new Error("Invalid phone number or pincode");
  }

  // Ensure transportMode is valid
  const validModes = ["road", "air", "rail", "ship"];
  const mode = validModes.includes(formData.transportMode)
    ? (formData.transportMode as "road" | "air" | "rail" | "ship")
    : "road";

  // Build priceRate from wizard.other
  const other = wizardData.other;
  
  // Determine divisor (use 2800 as fallback if both are null)
  const divisor = other.divisor ?? other.cftFactor ?? 2800;

  const payload: VendorPayload = {
    customerID: formData.customerID,
    companyName: formData.companyName,
    vendorCode: formData.vendorCode,
    vendorPhone,
    vendorEmail: formData.vendorEmail,
    gstNo: formData.gstNo,
    transportMode: mode,
    address: formData.address,
    state: formData.state.toUpperCase(),
    pincode,
    prices: {
      priceRate: {
        minWeight: other.minWeight,
        docketCharges: other.docketCharges,
        fuel: other.fuel,
        rovCharges: {
          variable: other.rovCharges.variable,
          fixed: other.rovCharges.fixed,
        },
        codCharges: {
          variable: other.codCharges.variable,
          fixed: other.codCharges.fixed,
        },
        topayCharges: {
          variable: other.topayCharges.variable,
          fixed: other.topayCharges.fixed,
        },
        handlingCharges: {
          variable: other.handlingCharges.variable,
          fixed: other.handlingCharges.fixed,
          threshholdweight: other.handlingCharges.threshholdweight,
        },
        appointmentCharges: {
          variable: other.appointmentCharges.variable,
          fixed: other.appointmentCharges.fixed,
        },
        divisor,
        minCharges: other.minCharges,
        greenTax: other.greenTax,
        daccCharges: other.daccCharges,
        miscellanousCharges: other.miscellanousCharges,
        insuaranceCharges: {
          variable: other.insuaranceCharges.variable,
          fixed: other.insuaranceCharges.fixed,
        },
        odaCharges: {
          variable: other.odaCharges.variable,
          fixed: other.odaCharges.fixed,
        },
        prepaidCharges: {
          variable: other.prepaidCharges.variable,
          fixed: other.prepaidCharges.fixed,
        },
        fmCharges: {
          variable: other.fmCharges.variable,
          fixed: other.fmCharges.fixed,
        },
      },
      priceChart: wizardData.priceMatrix,
    },
  };

  return payload;
};