"use client";

import * as React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { LiveUpdateRating } from '@/lib/types';
import { liveUpdateRatings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Check, Pin, PinOff, X } from 'lucide-react';

type LiveUpdateRatingSelectorProps = {
  value?: LiveUpdateRating | null;
  onValueChange: (value: LiveUpdateRating | null) => void;
  isPermanent?: boolean;
  onPermanentChange?: (value: boolean) => void;
};

const ratingStyles: Record<LiveUpdateRating, { color: string; label: string }> = {
    A: { color: 'text-sky-400', label: 'Forma Excelente (+8)' },
    B: { color: 'text-green-500', label: 'Buena Forma (+4)' },
    C: { color: 'text-yellow-400', label: 'Forma Normal (0)' },
    D: { color: 'text-orange-500', label: 'Mala Forma (-5)' },
    E: { color: 'text-red-600', label: 'Pésima Forma (-10)' },
};

const ratingBgColors: Record<LiveUpdateRating, string> = {
    A: 'bg-sky-400',
    B: 'bg-green-500',
    C: 'bg-yellow-400',
    D: 'bg-orange-500',
    E: 'bg-red-600',
};

const defaultStyle = { color: 'text-muted-foreground', label: 'Sin actualización de forma' };

export function LiveUpdateRatingSelector({ value, onValueChange, isPermanent = false, onPermanentChange }: LiveUpdateRatingSelectorProps) {
  const currentStyle = value ? ratingStyles[value] : defaultStyle;
  const currentLabel = value || '-';

  const handleSelect = (e: Event, rating: LiveUpdateRating | null) => {
    e.preventDefault();
    e.stopPropagation();
    onValueChange(rating);
  }

  const handlePermanentToggle = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    onPermanentChange?.(!isPermanent);
  };

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "h-auto w-auto p-0 text-base font-bold flex-shrink-0 focus-visible:ring-0 gap-0.5",
                  currentStyle.color
                )}
              >
                {currentLabel}
                {isPermanent && <Pin className="h-3 w-3" />}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isPermanent ? `${currentStyle.label} - permanente` : currentStyle.label}</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {liveUpdateRatings.map(rating => (
            <DropdownMenuItem key={rating} onSelect={(e) => handleSelect(e, rating)}>
              <div className={cn("w-3 h-3 rounded-full mr-2", ratingBgColors[rating])} />
              <span className={cn(ratingStyles[rating].color, 'font-bold w-4')}>{rating}</span>
              <span className="ml-2">{ratingStyles[rating].label}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => handleSelect(e, null)}>
            <X className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Limpiar</span>
          </DropdownMenuItem>
          {onPermanentChange && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handlePermanentToggle}>
                {isPermanent ? (
                  <PinOff className="mr-2 h-4 w-4 text-muted-foreground" />
                ) : (
                  <Pin className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                <span>{isPermanent ? 'Quitar letra permanente' : 'Letra permanente'}</span>
                {isPermanent && <Check className="ml-auto h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
