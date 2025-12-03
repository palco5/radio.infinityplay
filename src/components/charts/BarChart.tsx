// Komponenta za Bar Chart
import { useMemo } from 'react';

interface DataPoint {
    label: string;
    value: number;
    color?: string;
}

interface BarChartProps {
    data: DataPoint[];
    height?: number;
    showValues?: boolean;
    horizontal?: boolean;
}

export default function BarChart({
    data,
    height = 300,
    showValues = true,
    horizontal = false
}: BarChartProps) {
    const maxValue = useMemo(() => {
        if (!data || data.length === 0) return 0;
        return Math.max(...data.map(d => d.value), 1);
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400">
                Nema podataka
            </div>
        );
    }

    const defaultColors = [
        '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
        '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'
    ];

    if (horizontal) {
        return (
            <div className="space-y-3">
                {data.map((item, index) => {
                    const percentage = (item.value / maxValue) * 100;
                    const color = item.color || defaultColors[index % defaultColors.length];

                    return (
                        <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {item.label}
                                </span>
                                {showValues && (
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {item.value}
                                    </span>
                                )}
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500 ease-out"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: color
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="w-full" style={{ height }}>
            <div className="flex items-end justify-around h-full gap-2 pb-8">
                {data.map((item, index) => {
                    const percentage = (item.value / maxValue) * 100;
                    const color = item.color || defaultColors[index % defaultColors.length];

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group">
                            {/* Value label */}
                            {showValues && (
                                <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                        {item.value}
                                    </span>
                                </div>
                            )}

                            {/* Bar */}
                            <div
                                className="w-full rounded-t-lg transition-all duration-500 ease-out hover:opacity-80 cursor-pointer relative"
                                style={{
                                    height: `${percentage}%`,
                                    backgroundColor: color,
                                    minHeight: item.value > 0 ? '4px' : '0'
                                }}
                                title={`${item.label}: ${item.value}`}
                            >
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-20 rounded-t-lg" />
                            </div>

                            {/* Label */}
                            <div className="mt-2 text-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400 block max-w-full truncate">
                                    {item.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
