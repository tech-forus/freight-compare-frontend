import { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';

export default function CoverageCounter() {
    const countRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const node = countRef.current;
        if (!node) return;

        const controls = animate(0, 21934, {
            duration: 2,
            ease: "easeOut",
            onUpdate(value) {
                node.textContent = Math.round(value).toLocaleString("en-IN");
            }
        });

        return () => controls.stop();
    }, []);

    return (
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Total pincode covered</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">98% of India's FTL pincodes</p>
                </div>
                <div className="text-right flex items-center gap-1">
                    <span
                        ref={countRef}
                        className="text-xl font-bold text-slate-800 font-mono tabular-nums"
                    >
                        0
                    </span>
                    <span className="text-lg">📍</span>
                </div>
            </div>
        </div>
    );
}
