
"use client";

import type { PlayerPerformance } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, Repeat, Gem, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type PerformanceBadgesProps = {
    performance: PlayerPerformance;
    className?: string;
};

export function PerformanceBadges({ performance, className }: PerformanceBadgesProps) {
    if (!performance) return null;

    const badges = [
        {
            condition: performance.isHotStreak,
            tooltip: "En Racha (Mejor rendimiento reciente)",
            icon: <TrendingUp className="h-4 w-4 text-orange-400" />
        },
        {
            condition: performance.isConsistent,
            tooltip: "Consistente (Valoraciones muy estables)",
            icon: <Repeat className="h-4 w-4 text-cyan-400" />
        },
        {
            condition: performance.isVersatile,
            tooltip: "Versátil (Rinde bien en múltiples posiciones)",
            icon: <Gem className="h-4 w-4 text-purple-400" />
        },
        {
            condition: performance.isPromising,
            tooltip: "Promesa (Pocos partidos, gran promedio)",
            icon: <Zap className="h-4 w-4 text-yellow-400" />
        }
    ];

    const visibleBadges = badges.filter(b => b.condition);

    if (visibleBadges.length === 0) return null;

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <TooltipProvider>
                {visibleBadges.map((badge, index) => (
                    <Tooltip key={index}>
                        <TooltipTrigger>{badge.icon}</TooltipTrigger>
                        <TooltipContent><p>{badge.tooltip}</p></TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>
        </div>
    );
}
