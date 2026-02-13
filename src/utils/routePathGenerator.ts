// src/utils/routePathGenerator.ts
// Generates visually appealing wiggly road paths between two points

export interface Point {
    x: number;
    y: number;
}

/**
 * Generates a wiggly, road-like SVG path between start and end points.
 * Creates natural curves with random wiggles and straight highway segments.
 * 
 * @param start - Starting point {x, y}
 * @param end - Ending point {x, y}
 * @param options - Optional configuration
 * @returns SVG path string (e.g., "M x,y C ...")
 */
export function generateWigglyPath(
    start: Point,
    end: Point,
    options: {
        segments?: number;        // Number of path segments (default: 12)
        wiggleFactor?: number;    // Max perpendicular offset in pixels (default: 25)
        highwaySegments?: number; // Number of straight segments (default: 2-3)
    } = {}
): string {
    const {
        segments = 12,
        wiggleFactor = 25,
        highwaySegments = Math.floor(Math.random() * 2) + 2, // 2 or 3 random segments
    } = options;

    // Calculate distance and direction
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // For very short distances, just use a straight line
    if (distance < 50) {
        return `M ${start.x},${start.y} L ${end.x},${end.y}`;
    }

    // Generate intermediate points with wiggles
    const points: Point[] = [];

    // Randomly select which segments will be "highways" (straight)
    const highwayIndices = new Set<number>();
    while (highwayIndices.size < highwaySegments) {
        const idx = Math.floor(Math.random() * (segments - 1)) + 1; // Not first or last
        highwayIndices.add(idx);
    }

    for (let i = 0; i <= segments; i++) {
        // Linear interpolation
        const t = i / segments;
        let x = start.x + dx * t;
        let y = start.y + dy * t;

        // Add perpendicular wiggle (except for first, last, and highway segments)
        if (i !== 0 && i !== segments && !highwayIndices.has(i)) {
            // Calculate perpendicular direction (rotate direction vector by 90°)
            const perpX = -dy / distance;
            const perpY = dx / distance;

            // Random offset with some smoothing
            const offset = (Math.random() - 0.5) * wiggleFactor * 2;

            x += perpX * offset;
            y += perpY * offset;
        }

        points.push({ x, y });
    }

    // Convert points to smooth Bezier curve path
    return pointsToBezierPath(points);
}

/**
 * Converts an array of points to a smooth SVG path using Catmull-Rom interpolation
 * converted to cubic Bezier curves.
 */
function pointsToBezierPath(points: Point[]): string {
    if (points.length < 2) {
        return '';
    }

    if (points.length === 2) {
        return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
    }

    let path = `M ${points[0].x},${points[0].y}`;

    // Use quadratic Bezier for smooth curves between points
    // For each segment, use the midpoint as control point
    for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];

        if (i === 0) {
            // First segment: use quadratic curve
            const controlX = current.x + (next.x - current.x) * 0.5;
            const controlY = current.y + (next.y - current.y) * 0.5;
            path += ` Q ${controlX},${controlY} ${next.x},${next.y}`;
        } else {
            // Subsequent segments: use cubic Bezier for smoother transitions
            const prev = points[i - 1];

            // Control points based on tangent from previous point
            const controlX1 = current.x + (current.x - prev.x) * 0.25;
            const controlY1 = current.y + (current.y - prev.y) * 0.25;

            const controlX2 = next.x - (next.x - current.x) * 0.25;
            const controlY2 = next.y - (next.y - current.y) * 0.25;

            path += ` C ${controlX1},${controlY1} ${controlX2},${controlY2} ${next.x},${next.y}`;
        }
    }

    return path;
}

/**
 * Alternative: Catmull-Rom spline based Bezier path for even smoother curves
 */
export function generateSmoothWigglyPath(
    start: Point,
    end: Point,
    options: {
        segments?: number;
        wiggleFactor?: number;
        tension?: number;
    } = {}
): string {
    const {
        segments = 25, // Increased segments for more detail
        wiggleFactor = 20,
        tension = 0.5,
    } = options;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 🛣️ Zone Definitons (randomized slightly)
    // 0.0 - 0.15: Start City (Winding, high freq)
    // 0.15 - 0.40: Highway 1 (Straightish)
    // 0.40 - 0.70: Rural/Detour (Big curves)
    // 0.70 - 0.85: Highway 2 (Straightish)
    // 0.85 - 1.0: End City (Winding, high freq)

    const points: Point[] = [];

    // Helper to get random noise
    const hash = (n: number) => {
        return Math.sin(n * 12.9898) * 43758.5453 % 1;
    }

    // Generate a random seed for this specific path so it's consistent for a render but random per path
    const seed = start.x + start.y + end.x + end.y;

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        let x = start.x + dx * t;
        let y = start.y + dy * t;

        // Skip first and last points (exact coordinates)
        if (i === 0 || i === segments) {
            points.push({ x, y });
            continue;
        }

        // Determine Zone Characteristics
        let currentWiggle = 0;

        // Perpendicular vector
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Smart Noise Generation (pseudo-random based on index + seed)
        const noise = (hash(seed + i) - 0.5) * 2; // -1 to 1

        if (t < 0.15) {
            // 🏙️ START CITY: High frequency, tight turns
            // "Weird turns" -> random zigzag
            currentWiggle = noise * wiggleFactor * 0.5; // Reduced from 0.8
        } else if (t < 0.35) {
            // 🛣️ HIGHWAY: Very straight, fast
            // Minimal wiggle
            currentWiggle = noise * wiggleFactor * 0.1;
        } else if (t < 0.65) {
            // 🚜 RURAL / DETOUR: Big smooth curves
            // Use a lower frequency wave + noise
            const curve = Math.sin(t * Math.PI * 4 + seed) * wiggleFactor * 0.6; // Reduced from 1.2
            currentWiggle = curve + (noise * wiggleFactor * 0.2);
        } else if (t < 0.85) {
            // 🛣️ HIGHWAY: Straight again
            currentWiggle = noise * wiggleFactor * 0.1;
        } else {
            // 🏙️ END CITY: High frequency, tight turns
            currentWiggle = noise * wiggleFactor * 0.5; // Reduced from 0.8
        }

        x += perpX * currentWiggle;
        y += perpY * currentWiggle;

        points.push({ x, y });
    }

    return catmullRomToBezier(points, tension);
}

/**
 * Converts points to Bezier path using Catmull-Rom interpolation
 */
function catmullRomToBezier(points: Point[], tension: number = 0.5): string {
    if (points.length < 2) return '';
    if (points.length === 2) {
        return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
    }

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        // Calculate control points using Catmull-Rom
        const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
        const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;

        const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
        const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    return path;
}
