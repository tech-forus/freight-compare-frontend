import { parseDistanceToKm } from "../utils/distanceParser";
import { SPECIAL_VENDOR_IDS, SPECIAL_VENDOR_NAMES, fetchSpecialVendorRating } from "../constants/specialVendors";
import { API_BASE_URL } from "../config/api";
import axios from "axios";
import { ShipmentBox } from "./wheelseye";

const BASE_URL = API_BASE_URL;

const AUTH_HEADER = (token?: string) =>
    token ? { Authorization: `Bearer ${token}` } : undefined;

export interface IndiaPostBreakdown {
    price: number;
    weightBreakdown?: {
        actualWeight: number;
        volumetricWeight: number;
        chargeableWeight: number;
    };
    matchedWeight?: number;
    matchedDistance?: number;
}

export async function getIndiaPostPriceFromAPI(
    chargeableWeight: number,
    distanceKm: number,
    shipment: ShipmentBox[],
    fromPincode: string,
    toPincode: string,
    token?: string
): Promise<IndiaPostBreakdown | null> {
    const url = `${BASE_URL}/api/vendor/indiapost-pricing`;
    try {
        const res = await axios.post(
            url,
            {
                weight: chargeableWeight,
                distance: distanceKm,
                shipment_details: shipment,
                origin: fromPincode,
                destination: toPincode
            },
            { headers: AUTH_HEADER(token) }
        );

        if (res.data?.success && res.data.data?.price) {
            return {
                price: res.data.data.price,
                weightBreakdown: res.data.weightBreakdown,
                matchedWeight: res.data.data.matchedWeight,
                matchedDistance: res.data.data.matchedDistance,
            };
        }
    } catch (error: any) {
        // 403 means pincodes are blacklisted
        if (error.response?.status === 403) {
            console.log('IndiaPost does not serve these pincodes.', { fromPincode, toPincode });
            return null;
        }
        console.warn("IndiaPost pricing API failed:", error.response?.data?.message || error.message);
    }
    return null;
}

export async function buildIndiaPostQuote(opts: {
    fromPincode: string;
    toPincode: string;
    shipment: ShipmentBox[];
    totalWeight: number;
    token?: string;
    distanceKmOverride?: number;
}) {
    const {
        fromPincode,
        toPincode,
        shipment,
        totalWeight,
        token,
        distanceKmOverride,
    } = opts;

    let distanceKm = parseDistanceToKm(distanceKmOverride);

    if (distanceKm <= 0) {
        // We could call the IndiaPost distance endpoint here, but assuming distance is already parsed
        return null;
    }

    let totalVolumetricWeight = 0;
    shipment.forEach((box) => {
        const volumetric = (box.length * box.width * box.height * box.count) / 5000;
        totalVolumetricWeight += volumetric;
    });

    const actualWeight = totalWeight;
    const volumetricWeight = totalVolumetricWeight;
    const chargeableWeight = Math.max(actualWeight, volumetricWeight);

    const indiaPostResult = await getIndiaPostPriceFromAPI(
        chargeableWeight,
        distanceKm,
        shipment,
        fromPincode,
        toPincode,
        token
    );

    if (!indiaPostResult) return null;

    const ratingObj = await fetchSpecialVendorRating(SPECIAL_VENDOR_IDS.INDIA_POST);
    const etaDays = (km: number) => Math.ceil(km / 300); // Standard speed post eta assumption

    const base = {
        actualWeight,
        volumetricWeight,
        chargeableWeight,
        matchedWeight: indiaPostResult.matchedWeight ?? chargeableWeight,
        matchedDistance: indiaPostResult.matchedDistance ?? distanceKm,
        distance: `${Math.round(distanceKm)} km`,
        originPincode: fromPincode,
        destinationPincode: toPincode,
        isTiedUp: false,
    };

    const quote = {
        ...base,
        message: "",
        isHidden: false,
        transporterData: {
            _id: SPECIAL_VENDOR_IDS.INDIA_POST,
            rating: ratingObj.rating,
            name: SPECIAL_VENDOR_NAMES.INDIA_POST,
            type: "LTL"  // Typically part load
        },
        companyName: SPECIAL_VENDOR_NAMES.INDIA_POST,
        transporterName: SPECIAL_VENDOR_NAMES.INDIA_POST,
        category: SPECIAL_VENDOR_NAMES.INDIA_POST,
        rating: ratingObj.rating,
        vendorRatings: ratingObj.vendorRatings,
        totalRatings: ratingObj.totalRatings,
        totalCharges: indiaPostResult.price,
        price: indiaPostResult.price,
        total: indiaPostResult.price,
        totalPrice: indiaPostResult.price,
        estimatedTime: etaDays(distanceKm),
        estimatedDelivery: `${etaDays(distanceKm)} Day${etaDays(distanceKm) > 1 ? "s" : ""}`,
        deliveryTime: `${etaDays(distanceKm)} Day${etaDays(distanceKm) > 1 ? "s" : ""}`,
        vehicle: "IndiaPost Service",
        vehicleLength: "Box",
        loadSplit: null,
        vehicleBreakdown: null,
    };

    return quote;
}
