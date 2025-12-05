
"use client";

import * as React from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FlatPlayer, IdealTeamPlayer } from '@/lib/types';

type AffinityStatusIndicatorProps = {
  player: FlatPlayer | IdealTeamPlayer;
};

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
  const daysPassed = differenceInCalendarDays(today, updateDate);
  const formattedDate = format(updateDate, "d MMM yyyy", { locale: es });

  if (daysPassed >= 14) {
     return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent><p>Actualizado hace más de 14 días ({formattedDate})</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
     );
  }

  if (daysPassed >= 7) {
      return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent><p>Actualizado hace más de 7 días ({formattedDate})</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
      );
  }

  return null;
}
