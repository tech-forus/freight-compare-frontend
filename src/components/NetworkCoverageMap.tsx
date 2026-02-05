"use client";

import { useMemo, useState } from 'react';
import { INDIA_PATHS } from './india_paths';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Maximize2, X, Map as MapIcon } from 'lucide-react';

interface NetworkCoverageMapProps {
    fromPincode?: string;
    toPincode?: string;
}

// -----------------------------------------------------------------------------
// 1. Geography & Coordinate Mapping
// -----------------------------------------------------------------------------

// SVG Boundaries (derived from actual india_paths.ts state coordinates)
// Mainland India (excluding Andaman & Nicobar)
const SVG_BOUNDS = {
    minX: 30,    // Gujarat (westernmost)
    maxX: 585,   // Arunachal Pradesh (easternmost)
    minY: 1,     // Jammu & Kashmir (northernmost)
    maxY: 641,   // Tamil Nadu (southernmost)
};

// India's Geographic Boundaries (Lat/Long)
const GEO_BOUNDS = {
    minLat: 8.4,    // Kanyakumari (southernmost)
    maxLat: 37.0,   // Jammu & Kashmir (northernmost)
    minLng: 68.7,   // Gujarat (westernmost)
    maxLng: 97.25,  // Arunachal Pradesh (easternmost)
};

// Convert Lat/Long to SVG coordinates
const latLngToSvg = (lat: number, lng: number): { x: number; y: number } => {
    // Clamp values to India's bounds
    const clampedLat = Math.max(GEO_BOUNDS.minLat, Math.min(GEO_BOUNDS.maxLat, lat));
    const clampedLng = Math.max(GEO_BOUNDS.minLng, Math.min(GEO_BOUNDS.maxLng, lng));

    // Linear interpolation from geo to SVG coordinates
    const x = ((clampedLng - GEO_BOUNDS.minLng) / (GEO_BOUNDS.maxLng - GEO_BOUNDS.minLng)) * (SVG_BOUNDS.maxX - SVG_BOUNDS.minX) + SVG_BOUNDS.minX;
    const y = ((GEO_BOUNDS.maxLat - clampedLat) / (GEO_BOUNDS.maxLat - GEO_BOUNDS.minLat)) * (SVG_BOUNDS.maxY - SVG_BOUNDS.minY) + SVG_BOUNDS.minY;

    return { x, y };
};

// Pincode prefix to Lat/Long mapping (major cities/regions)
// Based on actual geographic coordinates of Indian cities
const PINCODE_LAT_LNG: Record<string, { lat: number; lng: number; label: string }> = {
    // Delhi NCR (11xxxx)
    '11': { lat: 28.6139, lng: 77.2090, label: 'Delhi' },
    // Haryana (12xxxx - 13xxxx)
    '12': { lat: 28.4595, lng: 77.0266, label: 'Gurgaon' },
    '13': { lat: 28.9845, lng: 77.7064, label: 'Meerut' },
    // Punjab (14xxxx - 16xxxx)
    '14': { lat: 30.9010, lng: 75.8573, label: 'Ludhiana' },
    '15': { lat: 31.6340, lng: 74.8723, label: 'Amritsar' },
    '16': { lat: 30.7333, lng: 76.7794, label: 'Chandigarh' },
    '17': { lat: 31.1048, lng: 77.1734, label: 'Shimla' },
    // J&K (18xxxx - 19xxxx)
    '18': { lat: 32.7266, lng: 74.8570, label: 'Jammu' },
    '19': { lat: 34.0837, lng: 74.7973, label: 'Srinagar' },

    // UP West (20xxxx - 21xxxx)
    '20': { lat: 28.5355, lng: 77.3910, label: 'Noida' },
    '21': { lat: 27.1767, lng: 78.0081, label: 'Agra' },
    // UP Central & East (22xxxx - 28xxxx)
    '22': { lat: 25.3176, lng: 82.9739, label: 'Varanasi' },
    '23': { lat: 26.8467, lng: 80.9462, label: 'Lucknow' },
    '24': { lat: 30.3165, lng: 78.0322, label: 'Dehradun' },
    '25': { lat: 26.4499, lng: 80.3319, label: 'Kanpur' },
    '26': { lat: 26.9124, lng: 75.7873, label: 'Jaipur East' },
    '27': { lat: 27.2046, lng: 79.0300, label: 'Firozabad' },
    '28': { lat: 27.1767, lng: 78.0081, label: 'Mathura' },

    // Rajasthan (30xxxx - 34xxxx)
    '30': { lat: 26.9124, lng: 75.7873, label: 'Jaipur' },
    '31': { lat: 28.0229, lng: 73.3119, label: 'Bikaner' },
    '32': { lat: 26.2389, lng: 73.0243, label: 'Jodhpur' },
    '33': { lat: 24.5854, lng: 73.7125, label: 'Udaipur' },
    '34': { lat: 27.0238, lng: 74.2179, label: 'Sikar' },

    // Gujarat (36xxxx - 39xxxx)
    '36': { lat: 22.3072, lng: 70.8022, label: 'Rajkot' },
    '37': { lat: 21.1702, lng: 72.8311, label: 'Bhavnagar' },
    '38': { lat: 23.0225, lng: 72.5714, label: 'Ahmedabad' },
    '39': { lat: 21.1702, lng: 72.8311, label: 'Surat' },

    // Maharashtra (40xxxx - 44xxxx)
    '40': { lat: 19.0760, lng: 72.8777, label: 'Mumbai' },
    '41': { lat: 18.5204, lng: 73.8567, label: 'Pune' },
    '42': { lat: 19.9975, lng: 73.7898, label: 'Nashik' },
    '43': { lat: 19.8762, lng: 75.3433, label: 'Aurangabad' },
    '44': { lat: 21.1458, lng: 79.0882, label: 'Nagpur' },

    // MP & CG (45xxxx - 49xxxx)
    '45': { lat: 22.7196, lng: 75.8577, label: 'Indore' },
    '46': { lat: 23.2599, lng: 77.4126, label: 'Bhopal' },
    '47': { lat: 26.2183, lng: 78.1828, label: 'Gwalior' },
    '48': { lat: 23.1815, lng: 79.9864, label: 'Jabalpur' },
    '49': { lat: 21.2514, lng: 81.6296, label: 'Raipur' },

    // Telangana & AP (50xxxx - 53xxxx)
    '50': { lat: 17.3850, lng: 78.4867, label: 'Hyderabad' },
    '51': { lat: 18.1124, lng: 79.0193, label: 'Karimnagar' },
    '52': { lat: 15.8281, lng: 78.0373, label: 'Kurnool' },
    '53': { lat: 17.6868, lng: 83.2185, label: 'Visakhapatnam' },

    // Karnataka (56xxxx - 59xxxx)
    '56': { lat: 12.9716, lng: 77.5946, label: 'Bangalore' },
    '57': { lat: 12.9141, lng: 74.8560, label: 'Mangalore' },
    '58': { lat: 15.3647, lng: 75.1240, label: 'Hubli' },
    '59': { lat: 16.7050, lng: 74.2433, label: 'Belgaum' },

    // Tamil Nadu (60xxxx - 64xxxx)
    '60': { lat: 13.0827, lng: 80.2707, label: 'Chennai' },
    '61': { lat: 11.6643, lng: 78.1460, label: 'Salem' },
    '62': { lat: 10.7905, lng: 78.7047, label: 'Trichy' },
    '63': { lat: 9.9252, lng: 78.1198, label: 'Madurai' },
    '64': { lat: 11.0168, lng: 76.9558, label: 'Coimbatore' },

    // Kerala (67xxxx - 69xxxx)
    '67': { lat: 11.2588, lng: 75.7804, label: 'Kozhikode' },
    '68': { lat: 9.9312, lng: 76.2673, label: 'Kochi' },
    '69': { lat: 8.5241, lng: 76.9366, label: 'Thiruvananthapuram' },

    // West Bengal (70xxxx - 74xxxx)
    '70': { lat: 22.5726, lng: 88.3639, label: 'Kolkata' },
    '71': { lat: 22.5958, lng: 88.2636, label: 'Howrah' },
    '72': { lat: 22.4575, lng: 88.1258, label: 'Hooghly' },
    '73': { lat: 26.7271, lng: 88.3953, label: 'Siliguri' },
    '74': { lat: 24.0957, lng: 88.2522, label: 'Murshidabad' },

    // Odisha (75xxxx - 77xxxx)
    '75': { lat: 20.2961, lng: 85.8245, label: 'Bhubaneswar' },
    '76': { lat: 19.8135, lng: 85.8312, label: 'Puri' },
    '77': { lat: 21.4669, lng: 83.9812, label: 'Sambalpur' },

    // Northeast (78xxxx - 79xxxx)
    '78': { lat: 26.1445, lng: 91.7362, label: 'Guwahati' },
    '79': { lat: 23.8315, lng: 91.2868, label: 'Agartala' },

    // Bihar & Jharkhand (80xxxx - 83xxxx)
    '80': { lat: 25.5941, lng: 85.1376, label: 'Patna' },
    '81': { lat: 25.2425, lng: 86.9842, label: 'Bhagalpur' },
    '82': { lat: 24.7914, lng: 84.9914, label: 'Gaya' },
    '83': { lat: 23.3441, lng: 85.3096, label: 'Ranchi' },
    '84': { lat: 26.1197, lng: 85.3910, label: 'Muzaffarpur' },
    '85': { lat: 25.9944, lng: 84.6840, label: 'Chapra' },
};

// Fallback zone coordinates (by first digit) - using geographic centers
const ZONE_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
    '1': { lat: 28.7, lng: 77.1, label: 'North' },
    '2': { lat: 27.0, lng: 80.0, label: 'North-Central' },
    '3': { lat: 25.0, lng: 73.0, label: 'West' },
    '4': { lat: 19.5, lng: 75.0, label: 'West-Central' },
    '5': { lat: 16.0, lng: 78.5, label: 'South' },
    '6': { lat: 11.0, lng: 78.0, label: 'South-East' },
    '7': { lat: 22.5, lng: 87.5, label: 'East' },
    '8': { lat: 25.0, lng: 85.0, label: 'East-Central' },
};

// Helper: Get SVG coordinates from pincode
const getZoneFromPincode = (pincode?: string) => {
    if (!pincode || pincode.length < 2) return null;

    // Check 2-digit prefix first
    const twoDigit = pincode.substring(0, 2);
    if (PINCODE_LAT_LNG[twoDigit]) {
        const geo = PINCODE_LAT_LNG[twoDigit];
        const svgCoords = latLngToSvg(geo.lat, geo.lng);
        return { ...svgCoords, label: geo.label, id: twoDigit };
    }

    // Fallback to 1-digit zone
    const firstDigit = pincode.charAt(0);
    if (ZONE_COORDS[firstDigit]) {
        const geo = ZONE_COORDS[firstDigit];
        const svgCoords = latLngToSvg(geo.lat, geo.lng);
        return { ...svgCoords, label: geo.label, id: firstDigit };
    }

    return null;
};

// -----------------------------------------------------------------------------
// 2. Component
// -----------------------------------------------------------------------------

export default function NetworkCoverageMap({ fromPincode, toPincode }: NetworkCoverageMapProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Determine active route points
    const originZone = useMemo(() => getZoneFromPincode(fromPincode), [fromPincode]);
    const destZone = useMemo(() => getZoneFromPincode(toPincode), [toPincode]);

    // Valid route?
    const isRouteActive = !!(originZone && destZone && fromPincode && fromPincode.length >= 3 && toPincode && toPincode.length >= 3);

    return (
        <>
            {/* --- COMPACT CARD VIEW --- */}
            <motion.div
                layoutId="map-container"
                className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col items-center justify-center relative shadow-sm group cursor-pointer transition-all hover:border-indigo-200"
                onClick={() => setIsExpanded(true)}
            >
                {/* Header */}
                <div className="absolute top-3 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
                    <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Network Map</p>
                        <motion.p
                            key={isRouteActive ? "active" : "inactive"}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-[10px] text-slate-400 mt-0.5"
                        >
                            {isRouteActive ? "Route verified within network" : "Click to explore network"}
                        </motion.p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                        {isRouteActive && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100"
                            >
                                <CheckCircle2 size={10} />
                                <span className="text-[10px] font-bold">Verified</span>
                            </motion.div>
                        )}
                        <div className="bg-slate-50 p-1.5 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto hover:text-indigo-600 hover:bg-indigo-50">
                            <Maximize2 size={14} />
                        </div>
                    </div>
                </div>

                {/* Map Visual */}
                <div className="relative w-full h-[180px] mt-4 flex items-center justify-center pointer-events-none">
                    <MapVisual
                        originZone={originZone}
                        destZone={destZone}
                        isRouteActive={isRouteActive}
                    />
                </div>
            </motion.div>


            {/* --- EXPANDED MODAL VIEW --- */}
            <AnimatePresence>
                {isExpanded && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            layoutId="map-container"
                            className="bg-white w-full max-w-4xl aspect-[16/9] rounded-2xl shadow-2xl relative overflow-hidden flex"
                        >
                            {/* Close Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                                className="absolute top-4 right-4 z-20 p-2 bg-white/80 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            {/* Left Panel: Info */}
                            <div className="w-1/3 bg-slate-50 border-r border-slate-100 p-8 flex flex-col justify-between z-10">
                                <div>
                                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                                        <MapIcon size={24} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Network Coverage</h2>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                                        FreightCompare connects over 21,000+ pincodes across India through a verified network of 500+ logicstics partners.
                                    </p>

                                    {isRouteActive ? (
                                        <div className="space-y-4">
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Origin</div>
                                                <div className="text-lg font-bold text-slate-800">{originZone?.label || "Unknown Zone"}</div>
                                                <div className="text-sm text-slate-500 font-mono">{fromPincode}</div>
                                            </div>
                                            <div className="flex justify-center text-slate-300">↓</div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Destination</div>
                                                <div className="text-lg font-bold text-slate-800">{destZone?.label || "Unknown Zone"}</div>
                                                <div className="text-sm text-slate-500 font-mono">{toPincode}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-sm font-medium">
                                            Enter origin and destination pincodes to verify route availablity.
                                        </div>
                                    )}
                                </div>

                                <div className="text-xs text-slate-400 font-medium">
                                    Map data © 2024 FreightCompare
                                </div>
                            </div>

                            {/* Right Panel: Large Map */}
                            <div className="w-2/3 bg-white relative flex items-center justify-center p-12">
                                <div className="w-full h-full max-w-lg">
                                    <MapVisual
                                        originZone={originZone}
                                        destZone={destZone}
                                        isRouteActive={isRouteActive}
                                        isLarge
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}


// -----------------------------------------------------------------------------
// 3. Sub-component: Map Visual (Shared)
// -----------------------------------------------------------------------------

function MapVisual({ originZone, destZone, isRouteActive, isLarge }: { originZone: any, destZone: any, isRouteActive: boolean, isLarge?: boolean }) {

    return (
        <svg
            viewBox="0 0 612 696"
            preserveAspectRatio="xMidYMid meet"
            className={`w-full h-full transition-all duration-700 ${isRouteActive ? 'opacity-100' : 'opacity-60 grayscale-[50%]'}`}
        >
            <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f1f5f9" />
                    <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
            </defs>

            {/* India Base Map - Multi-Path from Official SVG */}
            <g className="drop-shadow-sm">
                {INDIA_PATHS.map((pathData: any, index: number) => (
                    <path
                        key={index}
                        d={pathData.d}
                        fill="url(#mapGradient)"
                        stroke="#cbd5e1"
                        strokeWidth="0.5"
                        className="transition-colors duration-300 hover:fill-slate-200"
                    >
                        <title>{pathData.name}</title>
                    </path>
                ))}
            </g>

            {/* Connecting Line */}
            {isRouteActive && originZone && destZone && (
                <motion.path
                    d={`M ${originZone.x} ${originZone.y} Q 306 348 ${destZone.x} ${destZone.y}`}
                    fill="transparent"
                    stroke="#6366f1"
                    strokeWidth={isLarge ? 3 : 4}
                    strokeLinecap="round"
                    strokeDasharray="0 1"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.2, ease: "easeInOut", delay: 0.5 }}
                />
            )}

            {/* Active Pins */}
            {isRouteActive && (
                <>
                    {/* Origin Pin */}
                    {originZone && <MapPin x={originZone.x} y={originZone.y} color="#4f46e5" label={isLarge ? originZone.label : ''} delay={0} />}
                    {/* Dest Pin */}
                    {destZone && <MapPin x={destZone.x} y={destZone.y} color="#4f46e5" label={isLarge ? destZone.label : ''} delay={0.2} />}
                </>
            )}

            {/* Background Cluster Pins (Static decoration) */}
            {!isRouteActive && Object.values(ZONE_COORDS).map((zone, i) => {
                const svgCoords = latLngToSvg(zone.lat, zone.lng);
                return <circle key={i} cx={svgCoords.x} cy={svgCoords.y} r={3} fill="#94a3b8" opacity={0.4} />;
            })}
        </svg>
    )
}

function MapPin({ x, y, color, label, delay = 0 }: { x: number, y: number, color: string, label?: string, delay?: number }) {
    return (
        <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay, type: "spring", stiffness: 300, damping: 20 }}
        >
            <motion.circle
                cx={x}
                cy={y}
                r={20}
                fill={color}
                opacity={0.2}
                animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
            <circle cx={x} cy={y} r={5} fill={color} />
            {label && (
                <text x={x} y={y + 15} textAnchor="middle" fontSize="10" fill="#475569" className="font-semibold uppercase tracking-wider">
                    {label}
                </text>
            )}
        </motion.g>
    )
}
