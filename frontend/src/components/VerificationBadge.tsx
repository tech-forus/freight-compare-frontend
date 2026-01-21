import React from 'react';
import { CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

export type VerificationStatus = 'verified' | 'unverified' | 'unknown';

interface VerificationBadgeProps {
    status: VerificationStatus;
    className?: string;
}

/**
 * VerificationBadge Component
 * 
 * Displays vendor verification status with appropriate styling and icon.
 * - Verified: Green background with checkmark
 * - Unverified: Orange background with alert icon
 * - Unknown: Gray background with question mark
 */
const VerificationBadge: React.FC<VerificationBadgeProps> = ({
    status,
    className = ''
}) => {
    // Configuration for each status type
    const statusConfig = {
        verified: {
            label: 'Verified',
            icon: CheckCircle,
            bgColor: 'bg-green-100',
            textColor: 'text-green-800',
            borderColor: 'border-green-200',
        },
        unverified: {
            label: 'Unverified',
            icon: AlertCircle,
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-800',
            borderColor: 'border-yellow-200',
        },
        unknown: {
            label: 'Status Unknown',
            icon: HelpCircle,
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-600',
            borderColor: 'border-gray-200',
        },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
            title={`This vendor is ${config.label.toLowerCase()}`}
        >
            <Icon size={12} />
            {config.label}
        </span>
    );
};

export default VerificationBadge;
