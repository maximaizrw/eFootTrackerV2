
"use client";

import type { PlayerPerformance } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, Repeat, Gem, Zap, ChevronsUp, Shield, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BADGE_BONUSES } from '@/lib/utils';

type PerformanceBadgesProps = {
    performance: PlayerPerformance;
    className?: string;
};

export function PerformanceBadges({ performance, className }: PerformanceBadgesProps) {
    if (!performance) return null;

    const badges = [
        {
            name: 'isHotStreak',
            condition: performance.isHotStreak,
            tooltip: "En Racha (Mejor rendimiento reciente)",
            icon: <TrendingUp className="h-4 w-4 text-orange-400" />,
            bonus: BADGE_BONUSES.HOT_STREAK
        },
        {
            name: 'isConsistent',
            condition: performance.isConsistent,
            tooltip: "Consistente (Valoraciones muy estables)",
            icon: <Repeat className="h-4 w-4 text-cyan-400" />,
            bonus: BADGE_BONUSES.CONSISTENT
        },
        {
            name: 'isVersatile',
            condition: performance.isVersatile,
            tooltip: "Versátil (Rinde bien en múltiples posiciones)",
            icon: <Gem className="h-4 w-4 text-purple-400" />,
            bonus: BADGE_BONUSES.VERSATILE
        },
        {
            name: 'isPromising',
            condition: performance.isPromising,
            tooltip: "Promesa (Pocos partidos, gran promedio)",
            icon: <Zap className="h-4 w-4 text-yellow-400" />,
            bonus: BADGE_BONUSES.PROMISING
        },
        {
            name: 'isGameChanger',
            condition: performance.isGameChanger,
            tooltip: "Revulsivo (Rendimiento irregular pero explosivo)",
            icon: <ChevronsUp className="h-4 w-4 text-rose-400" />,
            bonus: BADGE_BONUSES.GAME_CHANGER
        },
        {
            name: 'isStalwart',
            condition: performance.isStalwart,
            tooltip: "Incondicional (Fiable y con muchos partidos)",
            icon: <Shield className="h-4 w-4 text-lime-400" />,
            bonus: BADGE_BONUSES.STALWART
        },
        {
            name: 'isSpecialist',
            condition: performance.isSpecialist,
            tooltip: "Especialista (Nivel élite en esta posición)",
            icon: <Target className="h-4 w-4 text-pink-400" />,
            bonus: BADGE_BONUSES.SPECIALIST
        }
    ];

    const visibleBadges = badges.filter(b => b.condition);

    if (visibleBadges.length === 0) return null;

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <TooltipProvider>
                {visibleBadges.map((badge) => (
                    <Tooltip key={badge.name}>
                        <TooltipTrigger>
                           <div className="flex items-center gap-0.5">
                                {badge.icon}
                                {badge.bonus > 0 && <span className="text-xs font-bold text-muted-foreground">+{badge.bonus}</span>}
                           </div>
                        </TooltipTrigger>
                        <TooltipContent><p>{badge.tooltip}</p></TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>
        </div>
    );
}
