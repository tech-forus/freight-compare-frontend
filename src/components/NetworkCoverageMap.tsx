"use client";

import { useEffect, useMemo, useState } from 'react';
import { INDIA_PATHS } from './india_paths';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Maximize2, X, Map as MapIcon } from 'lucide-react';
import {
    loadCentroids,
    getCentroid,
    getCentroidWithFallback,
    latLngToSvg,
    INDIA_SVG_VIEWBOX,
    type LatLng,
    type SvgPoint,
} from '../utils/mapProjection';
import { generateSmoothWigglyPath } from '../utils/routePathGenerator';

interface NetworkCoverageMapProps {
    fromPincode?: string;
    toPincode?: string;
}

// =============================================================================
// Zone Data for fallback labels
// =============================================================================
const ZONE_LABELS: Record<string, string> = {
    '1': 'North',
    '2': 'North-Central',
    '3': 'West',
    '4': 'West-Central',
    '5': 'South',
    '6': 'South-East',
    '7': 'East',
    '8': 'East-Central',
    '9': 'Northeast',
};

// =============================================================================
// Helper: Get zone info from pincode
// =============================================================================
interface ZoneInfo {
    x: number;
    y: number;
    label: string;
    pincode: string;
}

function getZoneFromPincode(pincode: string | undefined, centroidsLoaded: boolean): ZoneInfo | null {
    if (!pincode || pincode.length < 3) return null;

    // Try exact centroid lookup
    const coords = getCentroidWithFallback(pincode);
    if (!coords) return null;

    // Convert to SVG coordinates
    const svgPoint = latLngToSvg(coords.lat, coords.lng);

    // Determine label based on zone
    const firstDigit = pincode.charAt(0);
    const label = ZONE_LABELS[firstDigit] || 'India';

    return {
        x: svgPoint.x,
        y: svgPoint.y,
        label,
        pincode,
    };
}

// =============================================================================
// Main Component
// =============================================================================
export default function NetworkCoverageMap({ fromPincode, toPincode }: NetworkCoverageMapProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [centroidsLoaded, setCentroidsLoaded] = useState(false);

    // Load centroids on mount
    useEffect(() => {
        loadCentroids().then(() => setCentroidsLoaded(true));
    }, []);

    // Determine active route points
    const originZone = useMemo(
        () => getZoneFromPincode(fromPincode, centroidsLoaded),
        [fromPincode, centroidsLoaded]
    );
    const destZone = useMemo(
        () => getZoneFromPincode(toPincode, centroidsLoaded),
        [toPincode, centroidsLoaded]
    );

    // Valid route?
    const isRouteActive = !!(
        originZone &&
        destZone &&
        fromPincode &&
        fromPincode.length >= 3 &&
        toPincode &&
        toPincode.length >= 3
    );

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
                                        FreightCompare connects over 21,000+ pincodes across India through a verified network of 500+ logistics partners.
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
                                            Enter origin and destination pincodes to verify route availability.
                                        </div>
                                    )}
                                </div>

                                <div className="text-xs text-slate-400 font-medium">
                                    Map data FreightCompare
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

// =============================================================================
// Sub-component: Map Visual (Shared)
// =============================================================================
interface MapVisualProps {
    originZone: ZoneInfo | null;
    destZone: ZoneInfo | null;
    isRouteActive: boolean;
    isLarge?: boolean;
}

function MapVisual({ originZone, destZone, isRouteActive, isLarge }: MapVisualProps) {
    return (
        <svg
            viewBox={`0 0 ${INDIA_SVG_VIEWBOX.width} ${INDIA_SVG_VIEWBOX.height}`}
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
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                {/* CLIP PATH to keep route inside India */}
                <clipPath id="mapClip">
                    {INDIA_PATHS.map((pathData: any, index: number) => (
                        <path key={index} d={pathData.d} />
                    ))}
                </clipPath>
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

            {/* Connecting Line - WIGGLY PATH (Road Trip Style) */}
            {isRouteActive && originZone && destZone && (
                <>
                    {/* Glow effect path */}
                    <motion.path
                        d={useMemo(() => generateSmoothWigglyPath(
                            { x: originZone.x, y: originZone.y },
                            { x: destZone.x, y: destZone.y },
                            {
                                segments: 40, // Higher detail for smoother small turns
                                wiggleFactor: isLarge ? 30 : 15, // Reduced from 50/25 to keep it tighter
                                tension: 0.6
                            }
                        ), [originZone.x, originZone.y, destZone.x, destZone.y, isLarge])}
                        stroke="#6366f1"
                        strokeWidth={isLarge ? 6 : 4}
                        strokeLinecap="round"
                        strokeOpacity={0.3}
                        fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 2.5, ease: "easeInOut", delay: 0.3 }}
                    />
                    {/* Main route path */}
                    <motion.path
                        d={useMemo(() => generateSmoothWigglyPath(
                            { x: originZone.x, y: originZone.y },
                            { x: destZone.x, y: destZone.y },
                            {
                                segments: 40,
                                wiggleFactor: isLarge ? 30 : 15, // Reduced from 50/25
                                tension: 0.6
                            }
                        ), [originZone.x, originZone.y, destZone.x, destZone.y, isLarge])}
                        stroke="url(#routeGradient)"
                        strokeWidth={isLarge ? 3 : 2}
                        strokeLinecap="round"
                        fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 2.5, ease: "easeInOut", delay: 0.5 }}
                    />
                </>
            )}

            {/* Active Pins */}
            {isRouteActive && (
                <>
                    {originZone && (
                        <MapPin
                            x={originZone.x}
                            y={originZone.y}
                            color="#4f46e5"
                            label={isLarge ? originZone.label : ''}
                            delay={0}
                        />
                    )}
                    {destZone && (
                        <MapPin
                            x={destZone.x}
                            y={destZone.y}
                            color="#8b5cf6"
                            label={isLarge ? destZone.label : ''}
                            delay={0.2}
                        />
                    )}
                </>
            )}

            {/* Background decoration pins when no route active */}
            {!isRouteActive && (
                <g opacity={0.4}>
                    {/* Major city indicators - using actual coordinates */}
                    <circle cx={latLngToSvg(28.6, 77.2).x} cy={latLngToSvg(28.6, 77.2).y} r={3} fill="#94a3b8" /> {/* Delhi */}
                    <circle cx={latLngToSvg(19.0, 72.8).x} cy={latLngToSvg(19.0, 72.8).y} r={3} fill="#94a3b8" /> {/* Mumbai */}
                    <circle cx={latLngToSvg(12.9, 77.5).x} cy={latLngToSvg(12.9, 77.5).y} r={3} fill="#94a3b8" /> {/* Bangalore */}
                    <circle cx={latLngToSvg(22.5, 88.3).x} cy={latLngToSvg(22.5, 88.3).y} r={3} fill="#94a3b8" /> {/* Kolkata */}
                    <circle cx={latLngToSvg(13.0, 80.2).x} cy={latLngToSvg(13.0, 80.2).y} r={3} fill="#94a3b8" /> {/* Chennai */}
                    <circle cx={latLngToSvg(17.3, 78.4).x} cy={latLngToSvg(17.3, 78.4).y} r={3} fill="#94a3b8" /> {/* Hyderabad */}
                    <circle cx={latLngToSvg(23.0, 72.5).x} cy={latLngToSvg(23.0, 72.5).y} r={3} fill="#94a3b8" /> {/* Ahmedabad */}
                    <circle cx={latLngToSvg(18.5, 73.8).x} cy={latLngToSvg(18.5, 73.8).y} r={3} fill="#94a3b8" /> {/* Pune */}
                </g>
            )}
        </svg>
    );
}

// =============================================================================
// Sub-component: Map Pin
// =============================================================================
interface MapPinProps {
    x: number;
    y: number;
    color: string;
    label?: string;
    delay?: number;
}

function MapPin({ x, y, color, label, delay = 0 }: MapPinProps) {
    return (
        <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay, type: "spring", stiffness: 300, damping: 20 }}
        >
            {/* Pulse animation */}
            <motion.circle
                cx={x}
                cy={y}
                r={20}
                fill={color}
                opacity={0.2}
                animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Main pin circle */}
            <circle cx={x} cy={y} r={6} fill={color} />
            <circle cx={x} cy={y} r={3} fill="white" />
            {/* Label */}
            {label && (
                <text
                    x={x}
                    y={y + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#475569"
                    className="font-semibold uppercase tracking-wider"
                >
                    {label}
                </text>
            )}
        </motion.g>
    );
}
