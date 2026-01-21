import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AdminStatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendUp?: boolean;
    description?: string;
    color?: string;
}

const AdminStatsCard: React.FC<AdminStatsCardProps> = ({
    title,
    value,
    icon: Icon,
    trend,
    trendUp,
    description,
    color = "blue"
}) => {
    const getTheme = () => {
        switch (color) {
            case 'purple': return { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' };
            case 'green': return { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' };
            case 'orange': return { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' };
            case 'indigo': return { bg: 'bg-indigo-50', text: 'text-indigo-600', iconBg: 'bg-indigo-100' };
            default: return { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' };
        }
    };

    const theme = getTheme();

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${theme.iconBg} ${theme.text}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {trendUp ? '↑' : '↓'} {trend}
                    </span>
                )}
            </div>

            <div className="space-y-1">
                <h3 className="text-slate-500 font-medium text-sm tracking-wide uppercase">{title}</h3>
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
            </div>

            {description && (
                <p className="mt-4 text-xs text-slate-400 font-medium pt-4 border-t border-slate-100">
                    {description}
                </p>
            )}
        </div>
    );
};

export default AdminStatsCard;
