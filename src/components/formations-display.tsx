
"use client";

import { useState, memo, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { FormationStats, MatchResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Link as LinkIcon, Trophy, LayoutGrid, List, Pencil, History, Star, Target, BarChart, ArrowDownUp } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from '@/lib/utils';

type FormationWithStats = FormationStats & { stats: ReturnType<typeof calculateStats> };
type SortByType = 'effectiveness' | 'goals' | 'shots';


const calculateStats = (matches: FormationStats['matches']) => {
  const total = matches.length;
  if (total === 0) {
    return { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, effectiveness: 0, total, shotsOnGoal: 0, shotsPerMatch: 0, goalsForPerMatch: 0 };
  }
  const wins = matches.filter(m => m.goalsFor > m.goalsAgainst).length;
  const draws = matches.filter(m => m.goalsFor === m.goalsAgainst).length;
  const losses = total - wins - draws;
  
  const goalsFor = matches.reduce((acc, m) => acc + m.goalsFor, 0);
  const goalsAgainst = matches.reduce((acc, m) => acc + m.goalsAgainst, 0);
  const goalDifference = goalsFor - goalsAgainst;
  
  const goalsForPerMatch = goalsFor / total;

  const shotsOnGoal = matches.reduce((acc, m) => acc + (m.shotsOnGoal || 0), 0);
  const shotsPerMatch = shotsOnGoal / total;

  const effectiveness = ((wins * 3 + draws) / (total * 3)) * 100;

  return { wins, draws, losses, goalsFor, goalsAgainst, goalDifference, effectiveness, total, shotsOnGoal, shotsPerMatch, goalsForPerMatch };
};

const MatchHistory = ({ matches, formationId, onDeleteMatchResult }: { matches: MatchResult[], formationId: string, onDeleteMatchResult: (formationId: string, matchId: string) => void }) => {
  if (matches.length === 0) return null;

  const sortedMatches = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  return (
    <Accordion type="single" collapsible className="w-full mt-4">
      <AccordionItem value="item-1">
        <AccordionTrigger>
          <div className="flex items-center text-sm">
            <History className="mr-2 h-4 w-4" />
            Historial Reciente
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2 pr-1">
            {sortedMatches.map(match => (
              <div key={match.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/40">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-bold w-4 h-4 flex items-center justify-center rounded-sm",
                       match.goalsFor > match.goalsAgainst ? "bg-green-500 text-white" :
                       match.goalsFor < match.goalsAgainst ? "bg-red-500 text-white" :
                       "bg-yellow-500 text-black"
                    )}
                  >
                    {match.goalsFor > match.goalsAgainst ? "V" : match.goalsFor < match.goalsAgainst ? "D" : "E"}
                  </span>
                  <span>
                    {match.goalsFor} - {match.goalsAgainst}
                  </span>
                  {match.shotsOnGoal !== undefined && <span className="flex items-center gap-1 text-xs text-muted-foreground">(<Target className="h-3 w-3" /> {match.shotsOnGoal})</span>}
                </div>
                 <span className="text-xs text-muted-foreground">{new Date(match.date).toLocaleDateString()}</span>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onDeleteMatchResult(formationId, match.id)}
                            >
                                <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left"><p>Eliminar resultado</p></TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

const FormationCard = ({ formation, onAddMatch, onDeleteFormation, onEdit, onViewImage, onDeleteMatchResult, onGenerateIdealTeam }: Omit<FormationsDisplayProps, 'formations'> & { onGenerateIdealTeam: (id: string) => void }) => {
    const stats = calculateStats(formation.matches);
    const effectivenessColor = 
      stats.effectiveness >= 66 ? 'text-green-500' :
      stats.effectiveness >= 33 ? 'text-yellow-500' :
      stats.total > 0 ? 'text-red-500' : 'text-muted-foreground';
    
    const gdColor =
      stats.goalDifference > 0 ? 'text-green-500' :
      stats.goalDifference < 0 ? 'text-red-500' :
      'text-muted-foreground';

    return (
      <Card key={formation.id} className="flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">
                  {formation.name}
                  {formation.creator && <span className="block text-sm font-normal text-muted-foreground -mt-1">{formation.creator}</span>}
                </CardTitle>
                <CardDescription>{formation.playStyle}</CardDescription>
              </div>
              {formation.sourceUrl && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild>
                                <Link href={formation.sourceUrl} target="_blank">
                                    <LinkIcon className="h-4 w-4" />
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Ver fuente</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
              )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="grid grid-cols-1 gap-2">
             {formation.imageUrl && (
                <button 
                  onClick={() => onViewImage(formation.imageUrl!, `${formation.name} - Táctica Principal`)}
                  className="block w-full focus:outline-none focus:ring-2 focus:ring-ring rounded-md overflow-hidden"
                >
                    <div className="aspect-video relative w-full bg-muted">
                        <Image
                          src={formation.imageUrl}
                          alt={`Táctica Principal de ${formation.name}`}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                        />
                    </div>
                  </button>
             )}
             {formation.secondaryImageUrl && (
                <button 
                  onClick={() => onViewImage(formation.secondaryImageUrl!, `${formation.name} - Táctica Secundaria`)}
                  className="block w-full focus:outline-none focus:ring-2 focus:ring-ring rounded-md overflow-hidden"
                >
                  <div className="aspect-video relative w-full bg-muted">
                      <Image
                        src={formation.secondaryImageUrl}
                        alt={`Táctica Secundaria de ${formation.name}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                  </div>
                </button>
             )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center border-b pb-3 mb-3 mt-4">
            <div className="text-green-500">
              <p className="text-2xl font-bold">{stats.wins}</p>
              <p className="text-xs">Victorias</p>
            </div>
             <div className="text-yellow-500">
              <p className="text-2xl font-bold">{stats.draws}</p>
              <p className="text-xs">Empates</p>
            </div>
            <div className="text-red-500">
              <p className="text-2xl font-bold">{stats.losses}</p>
              <p className="text-xs">Derrotas</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center">
             <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Partidos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.goalsFor}</p>
              <p className="text-xs text-muted-foreground">GF</p>
            </div>
             <div>
              <p className="text-2xl font-bold">{stats.goalsAgainst}</p>
              <p className="text-xs text-muted-foreground">GC</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${gdColor}`}>{stats.goalDifference > 0 ? '+' : ''}{stats.goalDifference}</p>
              <p className="text-xs text-muted-foreground">DG</p>
            </div>
            <div>
              <p className="text-2xl font-bold flex items-center justify-center gap-1">
                <Target className="h-5 w-5" />
                <span>{stats.shotsOnGoal}</span>
              </p>
              <p className="text-xs text-muted-foreground">{stats.shotsPerMatch.toFixed(1)} / Partido</p>
            </div>
          </div>

           <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">Efectividad</p>
              <p className={`text-3xl font-bold ${effectivenessColor}`}>{stats.effectiveness.toFixed(0)}%</p>
            </div>
            
            <MatchHistory
                matches={formation.matches}
                formationId={formation.id}
                onDeleteMatchResult={onDeleteMatchResult}
            />
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => onGenerateIdealTeam(formation.id)}>
                <Star className="mr-2 h-4 w-4" />
                Generar 11 Ideal
            </Button>
            <Button onClick={() => onAddMatch(formation.id, formation.name)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Partido
            </Button>
            <div className="col-span-2 flex items-center justify-end gap-2 mt-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => onEdit(formation)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Editar Formación</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="destructive" size="icon" onClick={() => onDeleteFormation(formation)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Eliminar Formación</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </CardFooter>
      </Card>
    );
};

const FormationRow = ({ formation, onAddMatch, onEdit, onDeleteFormation, onGenerateIdealTeam }: Omit<FormationsDisplayProps, 'formations' | 'onViewImage' | 'onDeleteMatchResult' | 'onAddMatch'> & { onAddMatch: (id: string, name: string) => void, formation: FormationWithStats }) => {
    const { stats } = formation;
    const effectivenessColor = 
      stats.effectiveness >= 66 ? 'text-green-500' :
      stats.effectiveness >= 33 ? 'text-yellow-500' :
      stats.total > 0 ? 'text-red-500' : 'text-muted-foreground';

    return (
        <div className="flex items-center justify-between p-3 bg-card rounded-lg hover:bg-muted/50 transition-colors border">
            <div className="flex-1 overflow-hidden">
                <p className="text-base font-semibold truncate">{formation.name}</p>
                <p className="text-xs text-muted-foreground truncate">{formation.creator ? `${formation.creator} - ${formation.playStyle}` : formation.playStyle}</p>
            </div>
            <div className="hidden sm:flex items-center gap-4 mx-4 flex-shrink-0">
                <div className="text-center w-16">
                    <p className="text-sm font-bold">{stats.wins}-{stats.draws}-{stats.losses}</p>
                    <p className="text-xs text-muted-foreground">V-E-D</p>
                </div>
                 <div className="text-center w-12">
                    <p className={cn("text-base font-bold", effectivenessColor)}>{stats.effectiveness.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Efect.</p>
                </div>
                 <div className="text-center w-10">
                    <p className="text-base font-bold">{stats.goalsForPerMatch.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Goles</p>
                </div>
                <div className="text-center w-10">
                    <p className="text-base font-bold">{stats.shotsPerMatch.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Tiros</p>
                </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
                <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onGenerateIdealTeam(formation.id)}>
                            <Star className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Generar 11 Ideal</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAddMatch(formation.id, formation.name)}>
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Añadir Partido</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                      <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(formation)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Editar Formación</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive" onClick={() => onDeleteFormation(formation)}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Eliminar Formación</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
};

const FormationsDisplayMemo = memo(function FormationsDisplay({ formations, onAddMatch, onDeleteFormation, onEdit, onViewImage, onDeleteMatchResult, onGenerateIdealTeam }: FormationsDisplayProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<SortByType>('effectiveness');

  const formationsWithStats: FormationWithStats[] = useMemo(() => {
    return formations.map(f => ({
        ...f,
        stats: calculateStats(f.matches)
    }));
  }, [formations]);

  const sortedFormations = useMemo(() => {
    return [...formationsWithStats].sort((a, b) => {
        switch (sortBy) {
            case 'goals':
                return b.stats.goalsForPerMatch - a.stats.goalsForPerMatch;
            case 'shots':
                return b.stats.shotsPerMatch - a.stats.shotsPerMatch;
            case 'effectiveness':
            default:
                return b.stats.effectiveness - a.stats.effectiveness;
        }
    });
  }, [formationsWithStats, sortBy]);

  if (formations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-10 bg-card rounded-lg border border-dashed">
        <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Todavía no has añadido ninguna formación.</p>
        <p className="text-sm text-muted-foreground">Haz clic en 'Añadir Formación' para empezar a registrar su rendimiento.</p>
      </div>
    );
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-4 gap-4">
            {viewMode === 'list' && (
                <div>
                     <label className="text-sm font-medium mr-2">Ordenar por:</label>
                    <ToggleGroup type="single" size="sm" value={sortBy} onValueChange={(value: SortByType) => value && setSortBy(value)}>
                        <ToggleGroupItem value="effectiveness" aria-label="Ordenar por efectividad">
                            <BarChart className="h-4 w-4 mr-2"/> Efectividad
                        </ToggleGroupItem>
                        <ToggleGroupItem value="goals" aria-label="Ordenar por goles">
                            <Trophy className="h-4 w-4 mr-2"/> Goles
                        </ToggleGroupItem>
                         <ToggleGroupItem value="shots" aria-label="Ordenar por tiros">
                            <Target className="h-4 w-4 mr-2"/> Tiros
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            )}
            <div className={cn(viewMode === 'list' ? 'flex-shrink-0' : 'w-full flex justify-end')}>
                <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}>
                    <ToggleGroupItem value="grid" aria-label="Vista de cuadrícula">
                        <LayoutGrid className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="list" aria-label="Vista de lista">
                        <List className="h-4 w-4" />
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>
        </div>
        
        {viewMode === 'grid' ? (
             <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {sortedFormations.map((formation) => (
                    <FormationCard 
                        key={formation.id}
                        formation={formation}
                        onAddMatch={onAddMatch}
                        onDeleteFormation={onDeleteFormation}
                        onEdit={onEdit}
                        onViewImage={onViewImage}
                        onDeleteMatchResult={onDeleteMatchResult}
                        onGenerateIdealTeam={onGenerateIdealTeam}
                    />
                ))}
            </div>
        ) : (
            <div className="space-y-3">
                {sortedFormations.map((formation) => (
                     <FormationRow 
                        key={formation.id}
                        formation={formation}
                        onAddMatch={onAddMatch}
                        onEdit={onEdit}
                        onDeleteFormation={onDeleteFormation}
                        onGenerateIdealTeam={onGenerateIdealTeam}
                    />
                ))}
            </div>
        )}
    </div>
  );
});

export { FormationsDisplayMemo as FormationsDisplay, calculateStats };

    
