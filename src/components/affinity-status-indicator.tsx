
"use client";

import * as React from 'react';
import { differenceInCalendarDays, format, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FlatPlayer, IdealTeamPlayer } from '@/lib/types';

type AffinityStatusIndicatorProps = {
  player: FlatPlayer | IdealTeamPlayer;
};

function countFridaysPassed(since: Date, until: Date): number {
  let fridays = 0;
  let current = new Date(since);

  while (current < until) {
    if (getDay(current) === 5) { // 5 is Friday
      fridays++;
    }
    current.setDate(current.getDate() + 1);
  }
  return fridays;
}


export function AffinityStatusIndicator({ player }: AffinityStatusIndicatorProps) {
  const { card, position } = player;
  const updatedAt = card.buildsByPosition?.[position]?.updatedAt;

  if (!updatedAt) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-2.5 h-2.5 bg-violet-500 rounded-full flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent><p>Afinidad nunca actualizada</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
  }

  const updateDate = new Date(updatedAt);
  const today = new Date();
  const fridaysPassed = countFridaysPassed(updateDate, today);
  const formattedDate = format(updateDate, "d MMM yyyy", { locale: es });

  if (fridaysPassed >= 2) {
     return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent><p>Actualizado hace más de 2 semanas ({formattedDate})</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
     );
  }

  if (fridaysPassed >= 1) {
      return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent><p>Actualizado hace más de una semana ({formattedDate})</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
      );
  }

  return null;
}
