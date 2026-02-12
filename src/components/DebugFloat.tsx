import React from 'react';

interface DebugFloatProps {
    logs: string[];
}

export const DebugFloat: React.FC<DebugFloatProps> = ({ logs }) => {
    // Only show in dev or if debug flag is set
    const isDebug = import.meta.env.DEV || (typeof window !== 'undefined' && localStorage.getItem('debug') === '1');

    if (!isDebug) return null;
    if (!logs || logs.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg shadow-xl max-w-sm max-h-80 overflow-y-auto text-xs font-mono backdrop-blur-md border border-slate-700">
            <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2 sticky top-0 bg-black/90">
                <span className="font-bold text-blue-400">Debug Stream ({logs.length})</span>
            </div>
            <div className="flex flex-col gap-1.5">
                {logs.slice().reverse().map((log, i) => (
                    <div key={i} className="break-words border-l-2 border-slate-700 pl-2">
                        <span className="text-slate-500 text-[10px] mr-2">
                            {logs.length - i}
                        </span>
                        <span className={log.includes('ERROR') ? 'text-red-400' : 'text-slate-300'}>
                            {log}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DebugFloat;
