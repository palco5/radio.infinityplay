// Komponenta za Line Chart
import { useMemo } from 'react';

interface DataPoint {
    label: string;
    value: number;
}

interface LineChartProps {
    data: DataPoint[];
    height?: number;
    color?: string;
    showGrid?: boolean;
    showLabels?: boolean;
}

export default function LineChart({
    data,
    height = 200,
    color = '#10b981',
    showGrid = true,
    showLabels = true
}: LineChartProps) {
    const { max, points, gridLines } = useMemo(() => {
        if (!data || data.length === 0) {
            return { max: 0, points: '', gridLines: [] };
        }

        const values = data.map(d => d.value);
        const maxValue = Math.max(...values, 1);
        const padding = 20;
        const chartHeight = height - padding * 2;
        const chartWidth = 100;
        const stepX = chartWidth / (data.length - 1 || 1);

        // Kreiraj SVG path
        const pathPoints = data.map((point, index) => {
            const x = index * stepX;
            const y = chartHeight - (point.value / maxValue) * chartHeight + padding;
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        // Kreiraj grid linije
        const gridCount = 5;
        const gridStep = chartHeight / gridCount;
        const lines = Array.from({ length: gridCount + 1 }, (_, i) => ({
            y: i * gridStep + padding,
            value: Math.round(maxValue * (1 - i / gridCount))
        }));

        return { max: maxValue, points: pathPoints, gridLines: lines };
    }, [data, height]);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400">
                Nema podataka
            </div>
        );
    }

    return (
        <div className="w-full relative">
            <svg
                viewBox={`0 0 100 ${height}`}
                className="w-full"
                preserveAspectRatio="none"
            >
                {/* Grid linije */}
                {showGrid && gridLines.map((line, i) => (
                    <g key={i}>
                        <line
                            x1="0"
                            y1={line.y}
                            x2="100"
                            y2={line.y}
                            stroke="currentColor"
                            strokeWidth="0.2"
                            className="text-gray-300 dark:text-gray-700"
                            strokeDasharray="2,2"
                        />
                        {showLabels && (
                            <text
                                x="-2"
                                y={line.y}
                                fontSize="3"
                                fill="currentColor"
                                className="text-gray-500 dark:text-gray-400"
                                textAnchor="end"
                                dominantBaseline="middle"
                            >
                                {line.value}
                            </text>
                        )}
                    </g>
                ))}

                {/* Gradient za fill */}
                <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                    </linearGradient>
                </defs>

                {/* Fill area */}
                <path
                    d={`${points} L 100 ${height - 20} L 0 ${height - 20} Z`}
                    fill="url(#chartGradient)"
                />

                {/* Line */}
                <path
                    d={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Data points */}
                {data.map((point, index) => {
                    const stepX = 100 / (data.length - 1 || 1);
                    const x = index * stepX;
                    const y = (height - 40) - (point.value / max) * (height - 40) + 20;

                    return (
                        <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r="1.5"
                            fill={color}
                            className="hover:r-2 transition-all"
                        >
                            <title>{`${point.label}: ${point.value}`}</title>
                        </circle>
                    );
                })}
            </svg>

            {/* X-axis labels */}
            {showLabels && (
                <div className="flex justify-between mt-2 px-1">
                    {data.map((point, index) => {
                        // Prikaži samo svaki drugi label ako ima puno podataka
                        if (data.length > 10 && index % 2 !== 0) return null;

                        return (
                            <span
                                key={index}
                                className="text-xs text-gray-500 dark:text-gray-400"
                                style={{ flex: data.length > 10 ? '0 0 auto' : 1 }}
                            >
                                {point.label}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
