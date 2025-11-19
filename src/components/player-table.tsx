
"use client";

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, X, Wrench, Pencil, NotebookPen, Search, EyeOff, Eye, Star } from 'lucide-react';
import { cn, formatAverage, getAverageColorClass } from '@/lib/utils';
import type { Player, PlayerCard, Position, FlatPlayer } from '@/lib/types';
import type { FormValues as AddRatingFormValues } from '@/components/add-rating-dialog';
import { PerformanceBadges } from './performance-badges';

type PlayerTableProps = {
  players: FlatPlayer[];
  position: Position;
  onOpenAddRating: (initialData?: Partial<AddRatingFormValues>) => void;
  onOpenEditCard: (player: Player, card: PlayerCard) => void;
  onOpenEditPlayer: (player: Player) => void;
  onOpenPlayerDetail: (flatPlayer: FlatPlayer) => void;
  onViewImage: (url: string, name: string) => void;
  onDeletePositionRatings: (playerId: string, cardId: string, position: Position) => void;
  onToggleSelectable: (playerId: string, cardId: string, position: Position, currentSelectable?: boolean) => void;
  onDeleteRating: (playerId: string, cardId: string, position: Position, ratingIndex: number) => void;
};

type FilterProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  styleFilter: string;
  onStyleFilterChange: (value: string) => void;
  cardFilter: string;
  onCardFilterChange: (value: string) => void;
  uniqueStyles: string[];
  uniqueCardNames: string[];
  position: Position;
};

const Filters = ({
  searchTerm,
  onSearchTermChange,
  styleFilter,
  onStyleFilterChange,
  cardFilter,
  onCardFilterChange,
  uniqueStyles,
  uniqueCardNames,
  position
}: FilterProps) => (
  <div className="flex flex-col md:flex-row gap-2">
    <div className="relative flex-grow">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={`Buscar en ${position}...`}
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        className="pl-10 w-full"
      />
    </div>
    <Select value={styleFilter} onValueChange={onStyleFilterChange}>
      <SelectTrigger className="w-full md:w-[180px]">
        <SelectValue placeholder="Filtrar por estilo" />
      </SelectTrigger>
      <SelectContent>
        {uniqueStyles.map(style => (
          <SelectItem key={style} value={style}>{style === 'all' ? 'Todos los Estilos' : style}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={cardFilter} onValueChange={onCardFilterChange}>
      <SelectTrigger className="w-full md:w-[180px]">
        <SelectValue placeholder="Filtrar por carta" />
      </SelectTrigger>
      <SelectContent>
        {uniqueCardNames.map(name => (
          <SelectItem key={name} value={name}>{name === 'all' ? 'Todas las Cartas' : name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

type PaginationProps = {
    currentPage: number;
    totalPages: number;
    onPageChange: (direction: 'next' | 'prev') => void;
};

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-end gap-2 p-4 border-t">
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange('prev')}
                disabled={currentPage === 0}
            >
                Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
                Página {currentPage + 1} de {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange('next')}
                disabled={currentPage >= totalPages - 1}
            >
                Siguiente
            </Button>
        </div>
    );
};


export function PlayerTable({
  players: flatPlayers,
  position,
  onOpenAddRating,
  onOpenEditCard,
  onOpenEditPlayer,
  onOpenPlayerDetail,
  onViewImage,
  onDeletePositionRatings,
  onToggleSelectable,
  onDeleteRating,
}: PlayerTableProps) {
  
  if (flatPlayers.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center text-center p-10">
        <p className="text-lg font-medium text-muted-foreground">
          {`Todavía no hay jugadores en la posición de ${position}.`}
        </p>
        <p className="text-sm text-muted-foreground">
          {"¡Haz clic en 'Añadir Valoración' para empezar!"}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%] min-w-[150px]">Jugador</TableHead>
            <TableHead className="hidden md:table-cell">Estilo</TableHead>
            <TableHead>Prom.</TableHead>
            <TableHead>General</TableHead>
            <TableHead className="w-[35%] min-w-[200px] hidden md:table-cell">Valoraciones</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flatPlayers.map((flatPlayer) => {
            const { player, card, ratingsForPos, performance, hasStatsBuild, generalScore } = flatPlayer;
            const cardAverage = performance.stats.average;
            
            const averageColorClass = getAverageColorClass(cardAverage);
            const generalColorClass = getAverageColorClass(generalScore / 10);
            
            const isPosSelectable = card.selectablePositions?.[position] ?? true;

            return (
              <TableRow key={`${player.id}-${card.id}-${position}`} className={!isPosSelectable ? 'bg-muted/30 hover:bg-muted/50' : ''}>
                <TableCell className="p-2 md:p-4">
                  <div className="flex items-center gap-2">
                    {card.imageUrl ? (
                      <button onClick={() => onViewImage(card.imageUrl!, `${player.name} - ${card.name}`)} className="focus:outline-none focus:ring-2 focus:ring-ring rounded-full">
                        <Image
                          src={card.imageUrl}
                          alt={card.name}
                          width={40}
                          height={40}
                          className="bg-transparent object-contain w-8 h-8 md:w-10 md:h-10"
                        />
                      </button>
                    ) : (
                      <div className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-1 md:gap-2">
                          <button 
                              onClick={() => onOpenPlayerDetail(flatPlayer)}
                              className="font-medium text-sm md:text-base hover:underline text-left"
                          >
                              {player.name}
                          </button>
                          <PerformanceBadges performance={performance} className="hidden md:flex" />
                          {hasStatsBuild && (
                              <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger>
                                          <NotebookPen className="h-4 w-4 text-accent" />
                                      </TooltipTrigger>
                                      <TooltipContent><p>Build de Estadísticas Guardada</p></TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                          )}
                      </div>
                      <div className="text-xs text-muted-foreground">{card.name} ({performance.stats.matches} P.)</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {card.style && card.style !== "Ninguno" ? (
                    <Badge variant="secondary">{card.style}</Badge>
                  ) : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                  <div className={cn("text-base md:text-lg font-bold", averageColorClass)}>
                    {formatAverage(cardAverage)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className={cn("text-base md:text-lg font-bold flex items-center gap-1", generalColorClass)}>
                    <Star className="w-4 h-4" />
                    {generalScore.toFixed(0)}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell p-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {ratingsForPos.slice(-5).map((rating, index) => {
                        const originalIndex = Math.max(0, ratingsForPos.length - 5) + index;
                        return (
                          <div key={originalIndex} className="group/rating relative">
                            <Badge variant="default" className="text-sm">
                              {rating.toFixed(1)}
                            </Badge>
                            <Button
                              size="icon" variant="destructive"
                              className="absolute -top-2 -right-2 h-4 w-4 rounded-full opacity-0 group-hover/rating:opacity-100 transition-opacity z-10"
                              onClick={() => onDeleteRating(player.id, card.id, position, originalIndex)}
                              aria-label={`Eliminar valoración ${rating}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </TableCell>
                <TableCell className="text-right p-1 md:p-2">
                  <div className="flex items-center justify-end">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              aria-label={`Añadir valoración a ${player.name} (${card.name})`}
                              onClick={() => onOpenAddRating({
                                  playerId: player.id,
                                  playerName: player.name,
                                  cardName: card.name,
                                  position: position,
                                  style: card.style
                              })}
                          >
                              <PlusCircle className="h-5 w-5 md:h-4 md:w-4 text-primary/80 hover:text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Añadir valoración</p></TooltipContent>
                      </Tooltip>
                      <div className="hidden md:flex">
                         <Tooltip>
                            <TooltipTrigger asChild>
                            <Button
                                variant="ghost" size="icon" className="h-8 w-8 rounded-full"
                                aria-label={`Activar/Desactivar para ${position}`}
                                onClick={() => onToggleSelectable(player.id, card.id, position, isPosSelectable)}
                                >
                                {isPosSelectable ? <Eye className="h-4 w-4 text-muted-foreground/80 hover:text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-destructive/80 hover:text-destructive" />}
                            </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{isPosSelectable ? `No seleccionar para ${position}` : `Sí seleccionar para ${position}`}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                aria-label={`Editar jugador ${player.name}`}
                                onClick={() => onOpenEditPlayer(player)}
                                >
                                <Pencil className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground" />
                            </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Editar nombre del jugador</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                            <Button
                                variant="ghost" size="icon" className="h-8 w-8 rounded-full"
                                aria-label={`Editar carta ${card.name}`}
                                onClick={() => onOpenEditCard(player, card)}
                                >
                                <Wrench className="h-4 w-4 text-muted-foreground/80 hover:text-muted-foreground" />
                            </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Editar carta (nombre, estilo e imagen)</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                            <Button
                                variant="ghost" size="icon" className="h-8 w-8 rounded-full"
                                aria-label={`Eliminar valoraciones de ${card.name} (${player.name}) para la posición ${position}`}
                                onClick={() => onDeletePositionRatings(player.id, card.id, position)}>
                                <Trash2 className="h-4 w-4 text-destructive/80 hover:text-destructive" />
                            </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Eliminar todas las valoraciones para esta posición</p></TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

PlayerTable.Filters = Filters;
PlayerTable.Pagination = Pagination;
