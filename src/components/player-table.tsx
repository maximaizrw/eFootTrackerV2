"use client";

import Image from 'next/image';
import React, { memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Search, SlidersHorizontal, Dumbbell, Pencil, Copy, CheckCircle2, Info, History, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn, formatAverage, getAverageColorClass, getProxiedImageUrl, calculateRecencyWeightedAverage, isSpecialCard } from '@/lib/utils';
import type { Player, PlayerCard, Position, FlatPlayer, LiveUpdateRating } from '@/lib/types';
import type { FormValues as AddRatingFormValues } from '@/components/add-rating-dialog';
import { LiveUpdateRatingSelector } from './live-update-rating-selector';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';

type PlayerTableProps = {
  players: FlatPlayer[];
  position: Position;
  onOpenAddRating: (initialData?: Partial<AddRatingFormValues>) => void;
  onOpenEditCard: (player: Player, card: PlayerCard) => void;
  onOpenEditPlayer: (player: Player) => void;
  onOpenEditStats: (player: Player, card: PlayerCard) => void;
  onOpenPlayerDetail: (flatPlayer: FlatPlayer) => void;
  onViewImage: (url: string, name: string) => void;
  onDeletePositionRatings: (playerId: string, cardId: string, position: Position) => void;
  onDeleteRating: (playerId: string, cardId: string, position: Position, ratingIndex: number) => void;
  onUpdateLiveUpdateRating: (playerId: string, rating: LiveUpdateRating | null) => void;
};

const Filters = memo(({
  searchTerm,
  onSearchTermChange,
  styleFilter,
  onStyleFilterChange,
  cardFilter,
  onCardFilterChange,
  uniqueStyles,
  uniqueCardNames,
  sortCriteria,
  onSortCriteriaChange,
  filteredPlayers,
}: any) => {
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();

  const handleCopyList = () => {
    if (!filteredPlayers || filteredPlayers.length === 0) return;
    
    const listText = filteredPlayers
      .map((p: FlatPlayer) => `${p.player.name} - ${p.card.name}`)
      .join('\n');
    
    navigator.clipboard.writeText(listText).then(() => {
      setCopied(true);
      toast({
        title: "Lista Copiada",
        description: `Se han copiado ${filteredPlayers.length} jugadores al portapapeles.`,
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
              placeholder={`Buscar por nombre de jugador...`}
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="pl-10 w-full"
          />
          </div>
      </div>
      
      <div className="flex flex-wrap gap-2 items-center">
          <Select value={styleFilter} onValueChange={onStyleFilterChange}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Estilo" /></SelectTrigger>
              <SelectContent>
                  {uniqueStyles.map((s: string) => <SelectItem key={s} value={s}>{s === 'all' ? 'Todos los Estilos' : s}</SelectItem>)}
              </SelectContent>
          </Select>
          <Select value={cardFilter} onValueChange={onCardFilterChange}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Carta" /></SelectTrigger>
              <SelectContent>
                  {uniqueCardNames.map((n: string) => <SelectItem key={n} value={n}>{n === 'all' ? 'Todas las Cartas' : n}</SelectItem>)}
              </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2 ml-auto">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyList} 
                className="h-8 gap-2 border-primary/30 hover:border-primary hover:bg-primary/5"
                disabled={!filteredPlayers || filteredPlayers.length === 0}
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">Copiar Listado</span>
              </Button>

              <Select value={sortCriteria} onValueChange={onSortCriteriaChange}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="general">Ordenar por Puntaje</SelectItem>
                      <SelectItem value="average">Ordenar por Notas</SelectItem>
                  </SelectContent>
              </Select>
          </div>
      </div>
    </div>
  );
});

const Pagination = memo(({ currentPage, totalPages, onPageChange }: any) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-end gap-2 p-4 border-t">
            <Button variant="outline" size="sm" onClick={() => onPageChange('prev')} disabled={currentPage === 0}>Anterior</Button>
            <span className="text-sm text-muted-foreground">Página {currentPage + 1} de {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => onPageChange('next')} disabled={currentPage >= totalPages - 1}>Siguiente</Button>
        </div>
    );
});

const PlayerTableMemo = memo(function PlayerTable({
  players: flatPlayers,
  position,
  onOpenAddRating,
  onOpenEditCard,
  onOpenEditPlayer,
  onOpenEditStats,
  onOpenPlayerDetail,
  onViewImage,
  onDeletePositionRatings,
  onDeleteRating,
  onUpdateLiveUpdateRating,
}: PlayerTableProps) {

  if (flatPlayers.length === 0) return <div className="p-10 text-center text-muted-foreground">Sin jugadores en esta posición.</div>;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jugador</TableHead>
            <TableHead className="hidden md:table-cell">Estilo</TableHead>
            <TableHead>Votos</TableHead>
            <TableHead>Prom.</TableHead>
            <TableHead>Overall</TableHead>
            <TableHead className="hidden md:table-cell">Últimas Notas</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flatPlayers.map((flatPlayer) => {
            const { player, card, ratingsForPos, likesForPos, performance, overall } = flatPlayer;
            const likes = likesForPos.filter(l => l === true).length;
            const dislikes = likesForPos.filter(l => l === false).length;
            const cardAverage = performance.stats.average;
            
            const recentAverage = calculateRecencyWeightedAverage(ratingsForPos, 5, 2.5, 0.9);

            return (
              <TableRow key={`${player.id}-${card.id}-${position}`} className="hover:bg-muted/50">
                <TableCell className="p-2 md:p-4">
                  <div className="flex items-center gap-2">
                    {card.imageUrl ? (
                      <button onClick={() => onViewImage(card.imageUrl!, `${player.name}`)} className="rounded-full overflow-hidden flex-shrink-0">
                        <Image src={getProxiedImageUrl(card.imageUrl)} alt={card.name} width={40} height={40} className="w-8 h-8 md:w-10 md:h-10 object-contain" unoptimized referrerPolicy="no-referrer" />
                      </button>
                    ) : <div className="w-8 h-8 md:w-10 md:h-10 bg-muted rounded-full flex-shrink-0" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                          <LiveUpdateRatingSelector value={player.liveUpdateRating} onValueChange={(v) => onUpdateLiveUpdateRating(player.id, v)} />
                          <div className="flex items-center gap-1 min-w-0">
                            <button 
                              onClick={() => onOpenPlayerDetail(flatPlayer)} 
                              className="font-medium text-sm md:text-base hover:underline truncate transition-colors text-left text-foreground"
                            >
                              {player.name}
                            </button>
                          </div>
                      </div>
                      <span className="text-xs text-muted-foreground truncate block">
                        {card.name} ({performance.stats.matches} P.)
                        {card.trainedPosition === position && !isSpecialCard(card.name) && Object.keys(card.ratingsByPosition).length > 1 && (
                          <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 border-orange-400 text-orange-500">
                            Entrenado
                          </Badge>
                        )}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {card.style !== "Ninguno" ? <Badge variant="secondary">{card.style}</Badge> : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs font-semibold">
                    <ThumbsUp className="h-3 w-3 text-green-500" /><span className="text-green-500">{likes}</span>
                    <ThumbsDown className="h-3 w-3 text-red-500 ml-1" /><span className="text-red-500">{dislikes}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={cn("text-base font-bold", getAverageColorClass(cardAverage))}>{formatAverage(cardAverage)}</div>
                </TableCell>
                <TableCell>
                  <div className="text-base font-black text-primary group-hover:underline decoration-dotted">{overall.toFixed(1)}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex gap-1 items-center">
                    <div className="flex gap-1">
                      {ratingsForPos.slice(-3).map((r, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{r.toFixed(1)}</Badge>
                      ))}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                          <History className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-0">
                        <div className="p-2 border-b bg-muted/50 text-[10px] font-bold uppercase tracking-widest text-center">Historial de Notas</div>
                        <ScrollArea className="h-48">
                          <div className="p-1 space-y-1">
                            {[...ratingsForPos].reverse().map((r, idx) => {
                              const originalIndex = ratingsForPos.length - 1 - idx;
                              return (
                                <div key={originalIndex} className="flex items-center justify-between p-1.5 rounded hover:bg-muted text-xs group">
                                  <span className="font-mono font-bold">{r.toFixed(1)}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" 
                                    onClick={() => onDeleteRating(player.id, card.id, position, originalIndex)}
                                  >
                                    <X className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onOpenAddRating({ playerId: player.id, playerName: player.name, cardName: card.name, position, style: card.style, cardPositionCount: Object.keys(card.ratingsByPosition).length, currentTrainedPosition: card.trainedPosition ?? null } as any)}><PlusCircle className="h-4 w-4 text-primary" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onOpenPlayerDetail(flatPlayer)} title="Ficha Completa"><Dumbbell className="h-4 w-4" /></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>¿Eliminar posición?</AlertDialogTitle><AlertDialogDescription>Se borrarán todas las notas de {player.name} en {position}.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => onDeletePositionRatings(player.id, card.id, position)}>Eliminar Todo</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});

export const PlayerTable = Object.assign(PlayerTableMemo, { Filters, Pagination });
