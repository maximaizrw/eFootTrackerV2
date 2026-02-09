
"use client";

import * as React from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FlatPlayer, IdealTeamPlayer, IdealBuildType } from '@/lib/types';

type AffinityStatusIndicatorProps = {
  player: FlatPlayer | IdealTeamPlayer;
  currentTactic?: IdealBuildType;
};

export function AffinityStatusIndicator({ player, currentTactic = 'General' }: AffinityStatusIndicatorProps) {
  const { card, position } = player;
  
  // Try to find build for current tactic first
  let build = card.buildsByTactic?.[currentTactic]?.[position];
  if (!build && currentTactic !== 'General') {
      build = card.buildsByPosition?.[position];
  }
  
  const updatedAt = build?.updatedAt;

  if (!updatedAt) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-2.5 h-2.5 bg-violet-500 rounded-full flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent><p>Afinidad nunca actualizada para [{currentTactic}]</p></TooltipContent>
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
