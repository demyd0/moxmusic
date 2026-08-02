import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverEffect = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-[#191919]/65 p-6 backdrop-blur-xl transition-all duration-300',
        hoverEffect && 'hover:border-white/15 hover:bg-[#232323]/80 hover:shadow-2xl hover:shadow-black/60',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
