
"use client";

import * as React from "react";
import type { Position, FlatPlayer, PlayerBuild, OutfieldBuild, GoalkeeperBuild, PlayerAttributeStats, IdealBuild, IdealBuildType } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Slider } from "./ui/slider";
import { ScrollArea } from "./ui/scroll-area";
import { Target, Footprints, Dribbble, Zap, Beef, ChevronsUp, Shield, Hand, BrainCircuit, RefreshCw, Info, Dna } from "lucide-react";
import { calculateProgressionStats, getIdealBuildForPlayer, calculateAffinityWithBreakdown, type AffinityBreakdownResult, statLabels, calculateProgressionSuggestions, isSpecialCard, isProfileIncomplete } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AffinityBreakdown } from "./affinity-breakdown";
import { useToast } from "@/hooks/use-toast";


type PlayerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flatPlayer: FlatPlayer | null;
  onSavePlayerBuild: (playerId: string, cardId: string, position: Position, build: PlayerBuild, totalProgressionPoints?: number, buildType: 'tactical' | 'average') => void;
  idealBuilds: IdealBuild[];
  idealBuildType?: IdealBuildType;
  initialSortBy?: 'average' | 'general';
};

const outfieldCategories: { key: keyof OutfieldBuild; label: string, icon: React.ElementType }[] = [
    { key: 'shooting', label: 'Tiro', icon: Target },
    { key: 'passing', label: 'Pase', icon: Footprints },
    { key: 'dribbling', label: 'Regate', icon: Dribbble },
    { key: 'dexterity', label: 'Destreza', icon: Zap },
    { key: 'lowerBodyStrength', label: 'Fuerza del tren inferior', icon: Beef },
    { key: 'aerialStrength', label: 'Juego aéreo', icon: ChevronsUp },
    { key: 'defending', label: 'Defensa', icon: Shield },
];

const goalkeeperCategories: { key: keyof GoalkeeperBuild; label: string, icon: React.ElementType }[] = [
    { key: 'gk1', label: 'Portero 1', icon: Hand },
    { key: 'gk2', label: 'Portero 2', icon: Hand },
    { key: 'gk3', label: 'Portero 3', icon: Hand },
];


export function PlayerDetailDialog({ open, onOpenChange, flatPlayer, onSavePlayerBuild, idealBuilds, idealBuildType = 'Contraataque largo', initialSortBy = 'general' }: PlayerDetailDialogProps) {
  const [buildType, setBuildType] = React.useState<'tactical' | 'average'>(initialSortBy === 'average' ? 'average' : 'tactical');
  const [build, setBuild] = React.useState<PlayerBuild>({ manualAffinity: 0 });
  const [totalProgressionPoints, setTotalProgressionPoints] = React.useState<number | undefined>(undefined);

  const { toast } = useToast();
  
  const position = flatPlayer?.position;
  const card = flatPlayer?.card;
  const player = flatPlayer?.player;
  const isGoalkeeper = position === 'PT';
  const specialCard = isSpecialCard(card?.name || '');

  const baseStats = React.useMemo(() => card?.attributeStats || {}, [card?.attributeStats]);
  
  const { bestBuild, bestBuildStyle } = React.useMemo(() => {
    if (!card || !position) return { bestBuild: null, bestBuildStyle: null };
    const result = getIdealBuildForPlayer(card.style, position, idealBuilds, 'Contraataque largo', card.physicalAttributes?.height);
    return { bestBuild: result.bestBuild, bestBuildStyle: result.bestStyle };
  }, [card?.style, position, idealBuilds, card?.physicalAttributes?.height]);

  React.useEffect(() => {
    if (open && flatPlayer && position && card) {
      const fieldName = buildType === 'tactical' ? 'buildsByPosition' : 'averageBuildsByPosition';
      const initialBuild = (card as any)[fieldName]?.[position];
      setBuild(initialBuild || { manualAffinity: 0 });
      setTotalProgressionPoints(card.totalProgressionPoints);
    }
  }, [open, flatPlayer, card, position, buildType]);

  React.useEffect(() => {
    if(open) {
        setBuildType(initialSortBy === 'average' ? 'average' : 'tactical');
    }
  }, [open, initialSortBy]);

  const finalStats = React.useMemo(() => {
    if (!card || !position) return {};
    return specialCard ? baseStats : calculateProgressionStats(baseStats, build, isGoalkeeper);
  }, [build, baseStats, card, position, specialCard, isGoalkeeper]);

  const localAffinityResult = React.useMemo<AffinityBreakdownResult>(() => {
    if (!card || !bestBuild) return { totalAffinityScore: 0, breakdown: [] };
    return calculateAffinityWithBreakdown(finalStats, bestBuild, card.physicalAttributes, card.skills);
  }, [finalStats, bestBuild, card]);

  const handleSave = () => {
    if (player && card && position) {
      const buildToSave = { ...build, manualAffinity: localAffinityResult.totalAffinityScore, updatedAt: new Date().toISOString() };
      onSavePlayerBuild(player.id, card.id, position, buildToSave, totalProgressionPoints, buildType);
      onOpenChange(false);
    }
  };
  
  const handleUpdateAffinity = () => {
    if (player && card && position) {
      const buildToSave = { ...build, manualAffinity: localAffinityResult.totalAffinityScore, updatedAt: new Date().toISOString() };
      onSavePlayerBuild(player.id, card.id, position, buildToSave, totalProgressionPoints, buildType);
    }
  };

  const handleSuggestBuild = () => {
    if (!card || !position || !bestBuild) {
        toast({
            variant: "destructive",
            title: "No se encontró Build Ideal",
            description: `No hay una build ideal definida para ${position} con estilo ${card?.style || ''}.`,
        });
        return;
    }
    
    const pointsToUse = totalProgressionPoints || 50; 
    const suggestions = calculateProgressionSuggestions(baseStats, bestBuild, isGoalkeeper, pointsToUse);
    
    setBuild(prev => ({ ...prev, ...suggestions }));
    toast({ title: "Sugerencias Cargadas", description: `Se han distribuido ${pointsToUse} puntos basados en Contraataque largo.` });
  };

  const updatedAt = build?.updatedAt;
  const formattedDate = updatedAt 
    ? format(new Date(updatedAt), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es }) 
    : 'N/A';

  const handleSliderChange = (category: keyof OutfieldBuild | keyof GoalkeeperBuild, value: number) => {
    setBuild(prev => ({ ...prev, [category]: value }));
  }

  const StatDisplay = ({ label, value, baseValue }: { label: string; value?: number; baseValue?: number }) => {
    const hasIncreased = value !== undefined && baseValue !== undefined && value > baseValue;
    if (value === undefined || value === 0) return null;
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn(
                "font-bold",
                hasIncreased && "text-primary",
                !hasIncreased && value >= 90 && "text-sky-400",
                !hasIncreased && value >= 85 && value < 90 && "text-green-400",
                !hasIncreased && value >= 80 && value < 85 && "text-yellow-400",
            )}>{value}</span>
        </div>
    );
  };
  
  const getBaseValue = (stat: keyof PlayerAttributeStats, baseStat: keyof PlayerAttributeStats) => {
      return baseStats[baseStat] !== undefined ? baseStats[baseStat] : baseStats[stat];
  }

  const incomplete = card ? isProfileIncomplete(card) : false;
  const titleColorClass = incomplete ? "text-red-500" : "";


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className={cn(titleColorClass)}>Build para {player?.name} ({card?.name}) en <span className="text-primary">{position}</span></DialogTitle>
          <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full w-fit border text-xs text-muted-foreground">
                  <Dna className="h-3 w-3 text-primary" />
                  <span>Contraataque largo: <span className="text-foreground font-semibold">{bestBuildStyle}</span></span>
              </div>
              <Tabs value={buildType} onValueChange={(v) => setBuildType(v as any)} className="w-auto">
                  <TabsList className="grid w-full grid-cols-2 h-8 p-0.5">
                      <TabsTrigger value="tactical" className="text-xs py-1">Build Táctica</TabsTrigger>
                      <TabsTrigger value="average" className="text-xs py-1">Build Promedio</TabsTrigger>
                  </TabsList>
              </Tabs>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="build" className="flex-grow overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="build">Distribución de Puntos</TabsTrigger>
            <TabsTrigger value="affinity">Impacto en Afinidad</TabsTrigger>
          </TabsList>
          
          <TabsContent value="build" className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden mt-4">
              <ScrollArea className="flex-grow pr-4 -mr-4">
                  <div className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="manualAffinity">Afinidad Calculada</Label>
                          <div className="flex items-center gap-2">
                              <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-base md:text-sm text-foreground/80 font-bold items-center">
                                  {localAffinityResult.totalAffinityScore.toFixed(2)}
                              </div>
                              <Button variant="outline" size="icon" onClick={handleUpdateAffinity}>
                                  <RefreshCw className="h-4 w-4" />
                              </Button>
                          </div>
                          <p className="text-xs text-muted-foreground text-center">Últ. act build: <span className="font-semibold text-foreground">{formattedDate}</span></p>
                          <p className="text-xs text-muted-foreground text-center">Editando: <span className="font-semibold text-primary uppercase">{buildType === 'tactical' ? 'Táctica' : 'Promedio'}</span></p>
                      </div>
                      
                      {specialCard ? (
                          <Alert>
                              <Info className="h-4 w-4" />
                              <AlertTitle>Carta Especial</AlertTitle>
                              <AlertDescription>
                                  Las cartas especiales no tienen puntos de progresión ajustables.
                              </AlertDescription>
                          </Alert>
                      ) : (
                          <>
                              <div className="flex items-end gap-2 pt-2">
                                <div className="flex-grow space-y-2">
                                  <Label htmlFor="progression-points">Puntos de Progresión Totales</Label>
                                  <Input 
                                    id="progression-points"
                                    type="number"
                                    placeholder="Ej: 50"
                                    value={totalProgressionPoints || ''}
                                    onChange={(e) => setTotalProgressionPoints(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                    disabled={specialCard}
                                  />
                                </div>
                                <Button variant="outline" onClick={handleSuggestBuild} disabled={specialCard}>
                                    <BrainCircuit className="mr-2 h-4 w-4" />
                                    Sugerir
                                </Button>
                              </div>

                              {(isGoalkeeper ? goalkeeperCategories : outfieldCategories).map(({key, label, icon: Icon}) => (
                                  <div key={key} className="space-y-2 pt-2">
                                      <Label className="flex items-center gap-2">{<Icon className="w-4 h-4" />} {label}: <span className="font-bold text-primary">{(build as any)[key] || 0}</span></Label>
                                      <Slider 
                                          value={[(build as any)[key] || 0]}
                                          onValueChange={(v) => handleSliderChange(key as any, v[0])}
                                          max={16}
                                          step={1}
                                          disabled={specialCard}
                                      />
                                  </div>
                              ))}
                          </>
                      )}
                  </div>
              </ScrollArea>
              <ScrollArea className="flex-grow pr-4 -mr-4 md:border-l md:pl-8 md:-ml-8">
                   <p className="font-medium text-sm text-muted-foreground mb-4">Estadísticas Finales ({buildType === 'tactical' ? 'Táctica' : 'Promedio'})</p>
                   <div className="space-y-4">
                      {!isGoalkeeper && (
                          <div>
                               <h4 className="font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4"/>Ataque</h4>
                               <div className="space-y-1 pl-6">
                                  {Object.keys(statLabels)
                                    .filter(key => ['offensiveAwareness', 'ballControl', 'dribbling', 'tightPossession', 'lowPass', 'loftedPass', 'finishing', 'heading', 'placeKicking', 'curl'].includes(key))
                                    .map(key => (
                                      <StatDisplay 
                                        key={key} 
                                        label={statLabels[key as keyof PlayerAttributeStats]} 
                                        value={finalStats[key as keyof PlayerAttributeStats]} 
                                        baseValue={getBaseValue(key as keyof PlayerAttributeStats, `base${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof PlayerAttributeStats)} 
                                      />
                                    ))
                                  }
                               </div>
                          </div>
                      )}
                       <div>
                           <h4 className="font-semibold mb-2 flex items-center gap-2"><Shield className="w-4 h-4"/>Defensa</h4>
                           <div className="space-y-1 pl-6">
                              {Object.keys(statLabels)
                                .filter(key => ['defensiveAwareness', 'defensiveEngagement', 'tackling', 'aggression'].includes(key))
                                .map(key => (
                                  <StatDisplay 
                                    key={key} 
                                    label={statLabels[key as keyof PlayerAttributeStats]} 
                                    value={finalStats[key as keyof PlayerAttributeStats]} 
                                    baseValue={getBaseValue(key as keyof PlayerAttributeStats, `base${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof PlayerAttributeStats)} 
                                  />
                                ))
                              }
                           </div>
                      </div>
                       <div>
                           <h4 className="font-semibold mb-2 flex items-center gap-2"><Hand className="w-4 h-4"/>Portería</h4>
                           <div className="space-y-1 pl-6">
                             {Object.keys(statLabels)
                                .filter(key => ['goalkeeping', 'gkCatching', 'gkParrying', 'gkReflexes', 'gkReach'].includes(key))
                                .map(key => (
                                  <StatDisplay 
                                    key={key} 
                                    label={statLabels[key as keyof PlayerAttributeStats]} 
                                    value={finalStats[key as keyof PlayerAttributeStats]} 
                                    baseValue={getBaseValue(key as keyof PlayerAttributeStats, `base${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof PlayerAttributeStats)} 
                                  />
                                ))
                              }
                           </div>
                      </div>
                       <div>
                           <h4 className="font-semibold mb-2 flex items-center gap-2"><Zap className="w-4 h-4"/>Físico</h4>
                           <div className="space-y-1 pl-6">
                              {Object.keys(statLabels)
                                .filter(key => ['speed', 'acceleration', 'kickingPower', 'jump', 'physicalContact', 'balance', 'stamina'].includes(key))
                                .map(key => (
                                  <StatDisplay 
                                    key={key} 
                                    label={statLabels[key as keyof PlayerAttributeStats]} 
                                    value={finalStats[key as keyof PlayerAttributeStats]} 
                                    baseValue={getBaseValue(key as keyof PlayerAttributeStats, `base${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof PlayerAttributeStats)} 
                                  />
                                ))
                              }
                           </div>
                      </div>
                   </div>
              </ScrollArea>
          </TabsContent>
          <TabsContent value="affinity" className="flex-grow overflow-hidden mt-4">
              <ScrollArea className="h-full pr-4 -mr-4">
                <AffinityBreakdown breakdownResult={localAffinityResult} tacticName="Contraataque largo" />
              </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4 border-t mt-4 flex-shrink-0">
          <Button onClick={handleSave}>Guardar Build de {buildType === 'tactical' ? 'Táctica' : 'Promedio'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
