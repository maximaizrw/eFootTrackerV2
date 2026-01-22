"use client";

import * as React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { LiveUpdateRating } from '@/lib/types';
import { liveUpdateRatings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { X } from 'lucide-react';

type LiveUpdateRatingSelectorProps = {
  value?: LiveUpdateRating | null;
  onValueChange: (value: LiveUpdateRating | null) => void;
};

const ratingStyles: Record<LiveUpdateRating, { color: string, label: string }> = {
  A: { color: 'bg-sky-400 text-primary-foreground', label: 'Forma Excelente (+5)' },
  B: { color: 'bg-green-500 text-primary-foreground', label: 'Buena Forma (+2)' },
  C: { color: 'bg-yellow-400 text-black', label: 'Forma Normal (0)' },
  D: { color: 'bg-orange-500 text-primary-foreground', label: 'Mala Forma (-5)' },
  E: { color: 'bg-red-600 text-primary-foreground', label: 'Pésima Forma (-10)' },
};

const defaultStyle = { color: 'bg-muted/30 text-muted-foreground', label: 'Sin actualización de forma' };

export function LiveUpdateRatingSelector({ value, onValueChange }: LiveUpdateRatingSelectorProps) {
  const currentStyle = value ? ratingStyles[value] : defaultStyle;
  const currentLabel = value || '-';

  const handleSelect = (e: Event, rating: LiveUpdateRating | null) => {
    e.preventDefault();
    onValueChange(rating);
  }

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className={cn(
                  "h-6 w-6 rounded-full font-bold text-xs border-2 flex-shrink-0",
                  currentStyle.color,
                  value ? `border-${currentStyle.color.split('-')[1]}-600` : 'border-muted-foreground/30'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {currentLabel}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{currentStyle.label}</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {liveUpdateRatings.map(rating => (
            <DropdownMenuItem key={rating} onSelect={(e) => handleSelect(e, rating)}>
              <div className={cn("w-3 h-3 rounded-full mr-2", ratingStyles[rating].color)} />
              <span>{ratingStyles[rating].label}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => handleSelect(e, null)}>
            <X className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Limpiar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
