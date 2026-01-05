import React from 'react';
import { motion } from 'framer-motion';

// --- Type Definitions ---
type LatLng = { lat: number; lng: number };

interface IndiaMapProps {
  originCoords: LatLng | null;
  destCoords: LatLng | null;
}

// --- Map Projection Constants ---
// These values map real-world latitude/longitude to the SVG's coordinate system.
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 1118;
const MAP_LAT_MIN = 6.75;  // Southernmost point of India (approx)
const MAP_LAT_MAX = 35.5;  // Northernmost point of India (approx)
const MAP_LNG_MIN = 68.1;  // Westernmost point of India (approx)
const MAP_LNG_MAX = 97.4;  // Easternmost point of India (approx)

/**
 * Converts geographical coordinates (lat, lng) to SVG points (x, y).
 * It inverts the Y-axis because SVG's y=0 is at the top, while latitude's y=0 is at the bottom.
 */
const convertLatLngToSvgPoint = (coords: LatLng): { x: number; y: number } => {
  const x = ((coords.lng - MAP_LNG_MIN) / (MAP_LNG_MAX - MAP_LNG_MIN)) * MAP_WIDTH;
  const y = ((MAP_LAT_MAX - coords.lat) / (MAP_LAT_MAX - MAP_LAT_MIN)) * MAP_HEIGHT;
  return { x, y };
};

// --- The Map Component ---
export const IndiaMap: React.FC<IndiaMapProps> = ({ originCoords, destCoords }) => {
  
  // Calculate SVG points only if coordinates are provided
  const originPoint = originCoords ? convertLatLngToSvgPoint(originCoords) : null;
  const destPoint = destCoords ? convertLatLngToSvgPoint(destCoords) : null;

  // Animation variants for the route path
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 2, ease: "easeInOut" },
    },
  };
  
  // Animation variants for the endpoint markers
  const pointVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      transition: { duration: 0.5, delay: 1.8 } // Delay to appear after the path draws
    }
  }

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1118.8"
      className="w-full h-full object-contain"
      // This triggers the animations on all children when the component appears
      initial="hidden"
      animate={originPoint && destPoint ? "visible" : "hidden"}
    >
      <defs>
        {/* Gradient for the glowing path */}
        <linearGradient id="glowPath" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0ea5e9" /> {/* Sky Blue */}
          <stop offset="100%" stopColor="#facc15" /> {/* Yellow */}
        </linearGradient>
        
        {/* SVG filter to create the glow effect */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Base Map SVG Path */}
      <path
        d="M974.8 454.7c-3.1-6.1-5.1-12.7-5.5-19.6-.5-6.5-.4-13.1-.2-19.6.3-5.3 1.1-10.6 1.1-15.9 0-3.9-1-7.8-1.5-11.7-2.3-13.6-2.5-27.4-4.8-41-1.3-8.8-1.5-17.7-1.5-26.6 0-14.8-.4-29.6-1.5-44.4-1.3-15.4-3.1-30.8-3.4-46.3-.2-11.6.4-23.2 2-34.7 1.8-13.6 2.3-27.3 2-41-1.3-46-17.6-89.2-46.8-124-11.4-13.2-24.3-24.6-38.3-34.1-1.6-1.1-3.2-2.1-4.8-3.2-15-10-31-18.7-47.5-26.6-11.1-5.2-22.3-10-33.8-14-9.3-3.2-18.7-5.8-28.2-7.8-14-3.1-28.2-4.5-42.5-4.5h-20.9c-11.4 0-22.7.2-34 1-13.3 1-26.5 2.6-39.6 5.3-15.2 3.1-30.2 7-44.8 12.2-28.3 9.8-54.8 23-79.1 39.8-9.4 6.5-18.6 13.4-27.4 20.7-5.4 4.5-10.7 9-15.8 13.9-9.1 8.8-17.7 18-25.5 27.9-10.8 13.7-20.1 28.5-27.4 44.1-3.1 6.5-5.9 13.3-8.3 20.1-5.8 16.1-9.3 33.3-12.7 50.4l-11.2 59.9c-2.8 15-2.6 30.3-2.6 45.6 0 20.4-3.2 40.5-4.8 60.9l-3.2 44.9c-1.3 20.6-2.1 41.3-2.8 62-.2 5.3-.3 10.7-.3 16.1v4.3c.5 13.4 1.8 26.8 3.4 40.1l3.7 27.9c.7 5.4 1.1 10.8 1.8 16.3 1.5 12.9 2.1 25.8 3.7 38.6 1.8 14 3.7 28 6.5 41.8 4.8 24.3 10.1 48.3 17.6 71.3 5.4 16.6 11.6 32.7 18.9 48.1l20.4 41.5c4 8.3 8.3 16.3 12.9 24.1 13.7 23.3 30.1 44.1 49.3 62.2 24.8 23.3 54.3 40.2 87.2 50.1 29.8 8.8 61.1 11.2 92.1 7.8 26.6-3.1 52.3-10.7 76-23l26.9-13.7c9.3-4.8 18.4-10.1 27.1-15.8 18.1-11.7 35.1-25.1 50.1-40.7 12.2-12.9 23.3-27.1 32.7-42.6l23.3-39.3c9.3-15.8 16.9-32.5 23-49.9l12.4-36.2c4.3-12.4 7.5-25.1 9.8-38.1l2-11.2c2.1-13.7 2.1-27.6 2.3-41.5l.2-22.7c-1.5-12.9-2.6-25.8-3.7-38.8z"
        fill="currentColor"
        // This color is brighter for better contrast on a dark background
        className="text-slate-500/60"
      />

      {/* This block only renders when we have both start and end points */}
      {originPoint && destPoint && (
        <>
          {/* Glowing Path using the SVG filter */}
          <motion.path
            d={`M ${originPoint.x} ${originPoint.y} L ${destPoint.x} ${destPoint.y}`}
            fill="none"
            stroke="url(#glowPath)"
            strokeWidth="6"
            strokeLinecap="round"
            filter="url(#glow)"
            variants={pathVariants}
          />
          {/* The clean, main path on top of the glow */}
          <motion.path
            d={`M ${originPoint.x} ${originPoint.y} L ${destPoint.x} ${destPoint.y}`}
            fill="none"
            stroke="white"
            strokeOpacity="0.8"
            strokeWidth="2"
            strokeLinecap="round"
            variants={pathVariants}
          />

          {/* Origin Marker */}
          <motion.circle cx={originPoint.x} cy={originPoint.y} r="12" fill="#0ea5e9" variants={pointVariants} />
          <motion.circle cx={originPoint.x} cy={originPoint.y} r="6" fill="white" variants={pointVariants} />

          {/* Destination Marker */}
          <motion.circle cx={destPoint.x} cy={destPoint.y} r="12" fill="#facc15" variants={pointVariants} />
          <motion.circle cx={destPoint.x} cy={destPoint.y} r="6" fill="white" variants={pointVariants} />
        </>
      )}
    </motion.svg>
  );
};