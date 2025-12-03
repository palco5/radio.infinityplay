import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export default function Card({ children, className = '', hover = false, glow = false }: CardProps) {
  return (
    <div
      className={`
        bg-white dark:bg-infinity-dark-800 rounded-infinity p-6 overflow-hidden
        ${hover ? 'transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer' : ''}
        ${glow ? 'shadow-glow-green' : 'shadow-lg'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
