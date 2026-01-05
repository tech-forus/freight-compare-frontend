// import mongoose from "mongoose";

// const temporaryTransporterModel = new mongoose.Schema(
//   {
//     customerID: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "customers",
//       required: true,
//     },
//     companyName: {
//       type: String,
//       required: true,
//     },
//     vendorCode: {
//       type: String,
//       required: true,
//     },
//     approvalStatus: {
//       type: String,
//       enum: ["pending", "approved", "rejected"],
//       default: "pending",
//     },
//     vendorPhone: {
//       type: Number,
//       required: true,
//     },
//     vendorEmail: {
//       type: String,
//       required: true,
//     },
//     gstNo: {
//       type: String,
//       required: true,
//     },
//     mode: {
//       type: String,
//       required: true,
//     },
//     address: {
//       type: String,
//       required: true,
//     },
//     state: {
//       type: String,
//       required: true,
//     },
//     pincode: {
//       type: Number,
//       required: true,
//     },
//     city: {
//       type: String,
//       default: "",
//     },
//     rating: {
//       type: Number,
//       default: 3,
//     },
//     subVendor: {
//       type: String,
//       default: "",
//     },
//     selectedZones: [{
//       type: String,
//     }],
//     // Zone config: compact format { N1: ["201301","201302"], N2: ["110001"] }
//     // Maps zone code to array of pincodes assigned to that zone by user
//     zoneConfig: {
//       type: Map,
//       of: [String],
//       default: {},
//     },
//     prices: 
//       {
//         priceRate: {
//           minWeight: {
//             type: Number,

//             default: 0,
//           },
//           docketCharges: {
//             type: Number,

//             default: 0,
//           },
//           fuel: {
//             type: Number,

//             default: 0,
//           },
//           rovCharges: {
//             variable: {
//               type: Number,

//               default: 0,
//             },
//             fixed: {
//               type: Number,

//               default: 0,
//             },
//             unit: {
//               type: String,
//               enum: ['per kg', 'per shipment', 'per piece', 'per box'],
//               default: 'per kg',
//             },
//           },
//           insuaranceCharges: {
//             variable: {
//               type: Number,

//               default: 0,
//             },
//             fixed: {
//               type: Number,

//               default: 0,
//             },
//             unit: {
//               type: String,
//               enum: ['per kg', 'per shipment', 'per piece', 'per box'],
//               default: 'per kg',
//             },
//           },
//           odaCharges: {
//             variable: {
//               type: Number,

//               default: 0,
//             },
//             fixed: {
//               type: Number,

//               default: 0,
//             },
//             unit: {
//               type: String,
//               enum: ['per kg', 'per shipment', 'per piece', 'per box'],
//               default: 'per kg',
//             },
//           },
//           codCharges: {
//             variable: {
//               type: Number,

//               default: 0,
//             },
//             fixed: {
//               type: Number,

//               default: 0,
//             },
//             unit: {
//               type: String,
//               enum: ['per kg', 'per shipment', 'per piece', 'per box'],
//               default: 'per kg',
//             },
//           },
//           prepaidCharges: {
//             variable: {
//               type: Number,

//               default: 0,
//             },
//             fixed: {
//               type: Number,

//               default: 0,
//             },
//             unit: {
//               type: String,
//               enum: ['per kg', 'per shipment', 'per piece', 'per box'],
//               default: 'per kg',
//             },
//           },
//           topayCharges: {
//             variable: {
//               type: Number,

//               default: 0,
//             },
//             fixed: {
//               type: Number,

//               default: 0,
//             },
//             unit: {
//               type: String,
//               enum: ['per kg', 'per shipment', 'per piece', 'per box'],
//               default: 'per kg',
//             },
//           },
//           handlingCharges: {
//             variable: {
//               type: Number,

//               default: 0,
//             },
//             fixed: {
//               type: Number,

//               default: 0,
//             },
//             unit: {
//               type: String,
//               enum: ['per kg', 'per shipment', 'per piece', 'per box'],
//               default: 'per kg',
//             },
//           },
//           fmCharges: {
//             variable: {
//               type: Number,

//               default: 0,
//             },
//             fixed: {
//               type: Number,

//               default: 0,
//             },
//             unit: {
//               type: String,
//               enum: ['per kg', 'per shipment', 'per piece', 'per box'],
//               default: 'per kg',
//             },
//           },
//           appointmentCharges: {
//             variable: {
//               type: Number,

//               default: 0,
//             },
//             fixed: {
//               type: Number,

//               default: 0,
//             },
//             unit: {
//               type: String,
//               enum: ['per kg', 'per shipment', 'per piece', 'per box'],
//               default: 'per kg',
//             },
//           },
//           divisor: {
//             type: Number,

//             default: 1,
//           },
//           minCharges: {
//             type: Number,

//             default: 0,
//           },
//           greenTax: {
//             type: Number,

//             default: 0,
//           },
//           daccCharges: {
//             type: Number,

//             default: 0,
//           },
//           miscellanousCharges: {
//             type: Number,

//             default: 0,
//           },
//           // Code to insert in temporaryTransporterModel.js
//     approvalStatus: {
//       type: String,
//       enum: ['pending', 'approved', 'rejected'],
//       default: 'pending',
//     },
//     invoiceValueCharges: { // ← NEW FIELD ADDED
// // ... rest of the schema

//         },
//         priceChart: {},
//       },
//       invoiceValueCharges: { // ← NEW FIELD ADDED
//       enabled: { type: Boolean, default: false },
//       percentage: { type: Number, min: 0, max: 100, default: 0 },
//       minimumAmount: { type: Number, min: 0, default: 0 },
//       description: { type: String, default: 'Invoice Value Handling Charges' },
//     },
//   },
//   { timestamps: true, strict: false }
// );

// export default mongoose.model(
//   "temporaryTransporters",
//   temporaryTransporterModel
// );

import mongoose from "mongoose";

const temporaryTransporterModel = new mongoose.Schema(
  {
    customerID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customers",
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    vendorCode: {
      type: String,
      required: true,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    vendorPhone: {
      type: Number,
      required: true,
    },
    vendorEmail: {
      type: String,
      required: true,
    },
    gstNo: {
      type: String,
      required: true,
    },
    transportMode: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    pincode: {
      type: Number,
      required: true,
    },
    city: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      default: 3,
    },
    googleReviewUrl: {
      type: String,
      default: "",
    },
    googleReviewRating: {
      type: Number,
      default: null,
    },
    subVendor: {
      type: String,
      default: "",
    },
    // NEW: Contact person name for autofill
    contactPersonName: {
      type: String,
      default: "",
    },
    // NEW: Service mode (FTL, LTL, PTL, etc.)
    serviceMode: {
      type: String,
      enum: ['FTL', 'LTL', 'PTL', ''],
      default: "",
    },
    // NEW: Volumetric unit (cm, in, inches)
    volumetricUnit: {
      type: String,
      default: "cm",
    },
    // NEW: CFT factor
    cftFactor: {
      type: Number,
      default: null,
    },
    selectedZones: [{
      type: String,
    }],
    // Zone config: compact format { N1: ["201301","201302"], N2: ["110001"] }
    // Maps zone code to array of pincodes assigned to that zone by user
    zoneConfig: {
      type: Map,
      of: [String],
      default: {},
    },
    // NEW: Pincode-authoritative serviceability array
    // This is the CANONICAL source of truth for which pincodes this vendor services
    // Each entry contains: { pincode, zone (auto-assigned), state, city, isODA, active }
    serviceability: [{
      pincode: { type: String, required: true },
      zone: { type: String, required: true },
      state: { type: String, default: '' },
      city: { type: String, default: '' },
      isODA: { type: Boolean, default: false },
      active: { type: Boolean, default: true },
    }],
    // Checksum for serviceability data (for detecting changes)
    serviceabilityChecksum: {
      type: String,
      default: '',
    },
    // Source of serviceability: 'excel', 'manual', 'cloned', 'wizard'
    serviceabilitySource: {
      type: String,
      enum: ['excel', 'manual', 'cloned', 'wizard', ''],
      default: '',
    },
    prices: {
      priceRate: {
        minWeight: {
          type: Number,
          default: 0,
        },
        docketCharges: {
          type: Number,
          default: 0,
        },
        fuel: {
          type: Number,
          default: 0,
        },
        rovCharges: {
          variable: {
            type: Number,
            default: 0,
          },
          fixed: {
            type: Number,
            default: 0,
          },
          unit: {
            type: String,
            enum: ['per kg', 'per shipment', 'per piece', 'per box'],
            default: 'per kg',
          },
        },
        insuaranceCharges: {
          variable: {
            type: Number,
            default: 0,
          },
          fixed: {
            type: Number,
            default: 0,
          },
          unit: {
            type: String,
            enum: ['per kg', 'per shipment', 'per piece', 'per box'],
            default: 'per kg',
          },
        },
        odaCharges: {
          variable: {
            type: Number,
            default: 0,
          },
          fixed: {
            type: Number,
            default: 0,
          },
          unit: {
            type: String,
            enum: ['per kg', 'per shipment', 'per piece', 'per box'],
            default: 'per kg',
          },
        },
        codCharges: {
          variable: {
            type: Number,
            default: 0,
          },
          fixed: {
            type: Number,
            default: 0,
          },
          unit: {
            type: String,
            enum: ['per kg', 'per shipment', 'per piece', 'per box'],
            default: 'per kg',
          },
        },
        prepaidCharges: {
          variable: {
            type: Number,
            default: 0,
          },
          fixed: {
            type: Number,
            default: 0,
          },
          unit: {
            type: String,
            enum: ['per kg', 'per shipment', 'per piece', 'per box'],
            default: 'per kg',
          },
        },
        topayCharges: {
          variable: {
            type: Number,
            default: 0,
          },
          fixed: {
            type: Number,
            default: 0,
          },
          unit: {
            type: String,
            enum: ['per kg', 'per shipment', 'per piece', 'per box'],
            default: 'per kg',
          },
        },
        handlingCharges: {
          variable: {
            type: Number,
            default: 0,
          },
          fixed: {
            type: Number,
            default: 0,
          },
          unit: {
            type: String,
            enum: ['per kg', 'per shipment', 'per piece', 'per box'],
            default: 'per kg',
          },
        },
        fmCharges: {
          variable: {
            type: Number,
            default: 0,
          },
          fixed: {
            type: Number,
            default: 0,
          },
          unit: {
            type: String,
            enum: ['per kg', 'per shipment', 'per piece', 'per box'],
            default: 'per kg',
          },
        },
        appointmentCharges: {
          variable: {
            type: Number,
            default: 0,
          },
          fixed: {
            type: Number,
            default: 0,
          },
          unit: {
            type: String,
            enum: ['per kg', 'per shipment', 'per piece', 'per box'],
            default: 'per kg',
          },
        },
        divisor: {
          type: Number,
          default: 5000,  // Standard volumetric divisor for cm³ to kg conversion
        },
        minCharges: {
          type: Number,
          default: 0,
        },
        greenTax: {
          type: Number,
          default: 0,
        },
        daccCharges: {
          type: Number,
          default: 0,
        },
        miscellanousCharges: {
          type: Number,
          default: 0,
        },
      },
      priceChart: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      invoiceValueCharges: {
        enabled: { type: Boolean, default: false },
        percentage: { type: Number, min: 0, max: 100, default: 0 },
        minimumAmount: { type: Number, min: 0, default: 0 },
        description: { type: String, default: 'Invoice Value Handling Charges' },
      },
    },
  },
  { timestamps: true, strict: true }
);

// Database indexes for query performance
temporaryTransporterModel.index({ customerID: 1 }); // Fast customer lookups
temporaryTransporterModel.index({ customerID: 1, approvalStatus: 1 }); // Compound index for filtered queries

export default mongoose.model(
  "temporaryTransporters",
  temporaryTransporterModel
);