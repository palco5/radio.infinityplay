// Komponenta za Pie/Donut Chart
import { useMemo } from 'react';

interface DataPoint {
    label: string;
    value: number;
    color?: string;
}

interface PieChartProps {
    data: DataPoint[];
    size?: number;
    donut?: boolean;
    showLegend?: boolean;
    showPercentages?: boolean;
}

export default function PieChart({
    data,
    size = 200,
    donut = false,
    showLegend = true,
    showPercentages = true
}: PieChartProps) {
    const { total, segments } = useMemo(() => {
        if (!data || data.length === 0) {
            return { total: 0, segments: [], colors: [] };
        }

        const defaultColors = [
            '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
            '#f59e0b', '#ef4444', '#06b6d4', '#84cc16',
            '#6366f1', '#14b8a6', '#f97316', '#a855f7'
        ];

        const totalValue = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = -90; // Start from top

        const segs = data.map((item, index) => {
            const percentage = (item.value / totalValue) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;

            currentAngle = endAngle;

            return {
                ...item,
                percentage,
                startAngle,
                endAngle,
                color: item.color || defaultColors[index % defaultColors.length]
            };
        });

        return {
            total: totalValue,
            segments: segs
        };
    }, [data]);

    const createArc = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
        const start = polarToCartesian(0, 0, outerRadius, endAngle);
        const end = polarToCartesian(0, 0, outerRadius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

        if (donut) {
            const innerStart = polarToCartesian(0, 0, innerRadius, endAngle);
            const innerEnd = polarToCartesian(0, 0, innerRadius, startAngle);

            return [
                'M', start.x, start.y,
                'A', outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
                'L', innerEnd.x, innerEnd.y,
                'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
                'Z'
            ].join(' ');
        }

        return [
            'M', 0, 0,
            'L', start.x, start.y,
            'A', outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
            'Z'
        ].join(' ');
    };

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians)
        };
    };

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400">
                Nema podataka
            </div>
        );
    }

    const radius = size / 2;
    const innerRadius = donut ? radius * 0.6 : 0;

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Chart */}
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    viewBox={`${-radius} ${-radius} ${size} ${size}`}
                    className="transform rotate-0"
                >
                    {segments.map((segment, index) => (
                        <g key={index} className="group">
                            <path
                                d={createArc(segment.startAngle, segment.endAngle, innerRadius, radius)}
                                fill={segment.color}
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                                stroke="white"
                                strokeWidth="2"
                            >
                                <title>{`${segment.label}: ${segment.value} (${segment.percentage.toFixed(1)}%)`}</title>
                            </path>
                        </g>
                    ))}
                </svg>

                {/* Center label for donut */}
                {donut && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {total}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            Ukupno
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            {showLegend && (
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                    {segments.map((segment, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: segment.color }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                    {segment.label}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {segment.value}
                                    {showPercentages && ` (${segment.percentage.toFixed(1)}%)`}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
