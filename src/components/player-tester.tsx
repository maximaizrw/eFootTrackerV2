

"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { UploadCloud, Beaker, Star, Target, Footprints, Dribbble, Zap, Beef, ChevronsUp, Shield, Hand } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { PlayerAttributeStats, IdealBuild, Position, PlayerStyle, BuildPosition, OutfieldBuild, GoalkeeperBuild } from "@/lib/types";
import { positions, playerStyles, getAvailableStylesForPosition } from "@/lib/types";
import { calculateProgressionStats, getIdealBuildForPlayer, statLabels, calculateProgressionSuggestions, calculateAffinityWithBreakdown, type AffinityBreakdownResult, allStatsKeys } from "@/lib/utils";
import { cn, getAverageColorClass } from "@/lib/utils";
import { Label } from "./ui/label";
import { AffinityBreakdown } from "./affinity-breakdown";
import { ScrollArea } from "./ui/scroll-area";


const statSchema = z.coerce.number().min(0).max(99).optional();

const testerSchema = z.object({
  position: z.enum(positions),
  style: z.enum(playerStyles),
  stats: z.object({
    offensiveAwareness: statSchema, ballControl: statSchema, dribbling: statSchema, tightPossession: statSchema,
    lowPass: statSchema, loftedPass: statSchema, finishing: statSchema, heading: statSchema, placeKicking: statSchema, curl: statSchema,
    defensiveAwareness: statSchema, defensiveEngagement: statSchema, tackling: statSchema, aggression: statSchema,
    goalkeeping: statSchema, gkCatching: statSchema, gkParrying: statSchema, gkReflexes: statSchema, gkReach: statSchema,
    speed: statSchema, acceleration: statSchema, kickingPower: statSchema, jump: statSchema, physicalContact: statSchema,
    balance: statSchema, stamina: statSchema,
  }),
});

type PlayerTesterFormValues = z.infer<typeof testerSchema>;

const nameToSchemaKeyMap: Record<string, keyof PlayerAttributeStats> = {
    "offensive awareness": "offensiveAwareness", "ball control": "ballControl", "dribbling": "dribbling",
    "tight possession": "tightPossession", "low pass": "lowPass", "lofted pass": "loftedPass",
    "finishing": "finishing", "heading": "heading", "place kicking": "placeKicking", "curl": "curl",
    "defensive awareness": "defensiveAwareness", "defensive engagement": "defensiveEngagement", "tackling": "tackling",
    "aggression": "aggression", "goalkeeping": "goalkeeping", "gk catching": "gkCatching", "gk parrying": "gkParrying",
    "gk reflexes": "gkReflexes", "gk reach": "gkReach", "speed": "speed", "acceleration": "acceleration",
    "kicking power": "kickingPower", "jump": "jump", "physical contact": "physicalContact", "balance": "balance", "stamina": "stamina",
};

const orderedStatFields: (keyof PlayerAttributeStats)[] = allStatsKeys;

const outfieldCategories: { key: keyof OutfieldBuild; label: string, icon: React.ElementType }[] = [
    { key: 'shooting', label: 'Tiro', icon: Target },
    { key: 'passing', label: 'Pase', icon: Footprints },
    { key: 'dribbling', label: 'Regate', icon: Dribbble },
    { key: 'dexterity', label: 'Destreza', icon: Zap },
    { key: 'lowerBodyStrength', label: 'Fuerza tren inferior', icon: Beef },
    { key: 'aerialStrength', label: 'Juego aéreo', icon: ChevronsUp },
    { key: 'defending', label: 'Defensa', icon: Shield },
];

const goalkeeperCategories: { key: keyof GoalkeeperBuild; label: string, icon: React.ElementType }[] = [
    { key: 'gk1', label: 'Portero 1', icon: Hand },
    { key: 'gk2', label: 'Portero 2', icon: Hand },
    { key: 'gk3', label: 'Portero 3', icon: Hand },
    { key: 'defending', label: 'Defensa', icon: Shield },
];

const StatDisplay = ({ label, value }: { label: string; value?: number; }) => {
    if (value === undefined || value === 0) return null;
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn(
                "font-bold",
                value >= 90 && "text-sky-400",
                value >= 85 && value < 90 && "text-green-400",
                value >= 80 && value < 85 && "text-yellow-400",
            )}>{value}</span>
        </div>
    );
  };


type PlayerTesterProps = {
  idealBuilds: IdealBuild[];
};

const PlayerTesterMemo = React.memo(function PlayerTester({ idealBuilds }: PlayerTesterProps) {
  const [pastedText, setPastedText] = React.useState('');
  const [affinityBreakdown, setAffinityBreakdown] = React.useState<AffinityBreakdownResult>({ totalAffinityScore: 0, breakdown: [] });
  const [bestBuildStyle, setBestBuildStyle] = React.useState<string | null>(null);
  const [progressionSuggestions, setProgressionSuggestions] = React.useState<Partial<OutfieldBuild & GoalkeeperBuild>>({});
  const [progressionPoints, setProgressionPoints] = React.useState<number | undefined>(undefined);
  const [finalPlayerStats, setFinalPlayerStats] = React.useState<PlayerAttributeStats>({});


  const { toast } = useToast();

  const form = useForm<PlayerTesterFormValues>({
    resolver: zodResolver(testerSchema),
    defaultValues: {
      position: "DC",
      style: "Cazagoles",
      stats: {},
    },
  });

  const { control, setValue, getValues } = form;
  const watchedPosition = useWatch({ control, name: "position" });
  const watchedStyle = useWatch({ control, name: "style" });
  const watchedStats = useWatch({ control, name: "stats" });

  const availableStyles = React.useMemo(() => {
    return getAvailableStylesForPosition(watchedPosition, true);
  }, [watchedPosition]);

  React.useEffect(() => {
      if (!availableStyles.includes(watchedStyle)) {
          setValue('style', availableStyles[0] || 'Ninguno');
      }
  }, [availableStyles, watchedStyle, setValue]);

  React.useEffect(() => {
    const baseStats = getValues('stats');
    if (Object.keys(baseStats).length > 0) {
        const position = getValues('position');
        const style = getValues('style');
        const isGoalkeeper = position === 'PT';

        const { bestBuild, bestStyle } = getIdealBuildForPlayer(style, position, idealBuilds);
        const suggestions = calculateProgressionSuggestions(baseStats, bestBuild, isGoalkeeper, progressionPoints);
        
        const finalStats = calculateProgressionStats(baseStats, suggestions, isGoalkeeper);
        const breakdown = calculateAffinityWithBreakdown(finalStats, bestBuild);
        
        setFinalPlayerStats(finalStats);
        setProgressionSuggestions(suggestions);
        setAffinityBreakdown(breakdown);
        setBestBuildStyle(bestStyle);
    } else {
        setFinalPlayerStats({});
        setProgressionSuggestions({});
        setAffinityBreakdown({ totalAffinityScore: 0, breakdown: [] });
        setBestBuildStyle(null);
    }
}, [watchedStats, watchedPosition, watchedStyle, idealBuilds, getValues, progressionPoints]);


  const handleParseText = () => {
    const lines = pastedText.split('\n').filter(line => line.trim() !== '');
    let parsedCount = 0;
    const newStats: Partial<PlayerAttributeStats> = {};
    
    const isNumericOnly = lines.every(line => /^\d+\s*$/.test(line.trim()));

    if (isNumericOnly && lines.length > 25) { // Simple check
        orderedStatFields.forEach((schemaKey, index) => {
             if (lines[index]) {
                const value = parseInt(lines[index].trim(), 10);
                if (schemaKey) {
                    newStats[schemaKey] = value;
                    parsedCount++;
                }
            }
        });
    } else {
        lines.forEach(line => {
            const parts = line.split(/\s+/).filter(Boolean);
            if (parts.length < 2) return;

            const value = parseInt(parts[parts.length - 1], 10);
            if (isNaN(value)) return;
            
            const namePart = parts.slice(0, -1).join(' ').replace('●', '').trim().toLowerCase();
            
            const schemaKey = nameToSchemaKeyMap[namePart];
            if (schemaKey) {
                newStats[schemaKey] = value;
                parsedCount++;
            }
        });
    }

    if (parsedCount > 0) {
      form.setValue('stats', newStats as PlayerAttributeStats);
      toast({
        title: "Estadísticas Cargadas",
        description: `Se han cargado ${parsedCount} atributos en el probador.`,
      });
    } else {
       toast({
        variant: "destructive",
        title: "Error al Cargar",
        description: "No se pudieron encontrar atributos válidos. Revisa el formato.",
      });
    }
  };

  const affinityScore = affinityBreakdown.totalAffinityScore;
  const hasStats = Object.keys(watchedStats).length > 0;
  const affinityColorClass = affinityScore !== null ? getAverageColorClass(affinityScore / 10) : '';
  const hasSuggestions = Object.values(progressionSuggestions).some(v => v && v > 0);
  const suggestionCategories = watchedPosition === 'PT' ? goalkeeperCategories : outfieldCategories;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-accent">
          <Beaker />
          Probador de Jugadores
        </CardTitle>
        <CardDescription>
          Pega las estadísticas de un jugador, elige una posición y estilo para calcular su afinidad con tus builds ideales.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4 md:col-span-1">
          <div>
            <Label htmlFor="stats-paste">Pegar Estadísticas</Label>
            <Textarea
              id="stats-paste"
              placeholder="Pega aquí las estadísticas del jugador desde eFootballHub u otro sitio..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="min-h-[150px] mt-2"
            />
          </div>
          <Button onClick={handleParseText} disabled={!pastedText}>
            <UploadCloud className="mr-2 h-4 w-4" />
            Cargar y Analizar Estadísticas
          </Button>

          <Form {...form}>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posición en Campo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Elige posición" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estilo de Juego</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Elige estilo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableStyles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="col-span-2 space-y-2">
                <Label htmlFor="progression-points-tester">Puntos de Progresión Totales (Opcional)</Label>
                <Input 
                  id="progression-points-tester"
                  type="number"
                  placeholder="Ej: 50"
                  value={progressionPoints === undefined ? '' : progressionPoints}
                  onChange={(e) => setProgressionPoints(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                />
              </div>
            </div>
          </Form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 md:col-span-2 gap-6">
            <div className="flex flex-col items-center justify-start bg-muted/50 rounded-lg p-6 space-y-4">
                <p className="text-lg font-semibold text-muted-foreground">Afinidad Calculada</p>
                {hasStats ? (
                    <div className="text-center">
                    <div className={cn("text-7xl font-bold flex items-center justify-center gap-2", affinityColorClass)}>
                        <Star className="w-12 h-12" />
                        {affinityScore.toFixed(2)}
                    </div>
                    <p className="text-sm mt-1">
                        Build Ideal usada: <span className="font-semibold text-primary">{bestBuildStyle || 'N/A'}</span>
                    </p>
                    </div>
                ) : (
                    <div className="text-5xl font-bold text-muted-foreground/50 self-center mt-8">
                    -
                    </div>
                )}
                 {hasSuggestions && (
                    <div className="w-full pt-4 mt-4 border-t">
                    <p className="text-base font-semibold text-muted-foreground text-center mb-3">Puntos de Progresión Sugeridos</p>
                    <div className="space-y-2">
                        {suggestionCategories.map(({ key, label, icon: Icon }) => {
                            const value = (progressionSuggestions as any)[key];
                            if (!value || value <= 0) return null;
                            return (
                                <div key={key} className="flex items-center justify-between p-2 bg-background/50 rounded-md">
                                    <span className="flex items-center gap-2 text-sm"><Icon className="w-4 h-4 text-muted-foreground"/>{label}</span>
                                    <span className="font-bold text-primary text-lg">{value}</span>
                                </div>
                            );
                        })}
                    </div>
                    </div>
                 )}
            </div>
            <div className="flex flex-col items-center justify-start bg-muted/50 rounded-lg p-6 space-y-4">
                <p className="text-lg font-semibold text-muted-foreground">Estadísticas Finales</p>
                {hasStats ? (
                    <div className="w-full space-y-1">
                        {allStatsKeys.map(key => (
                            <StatDisplay 
                                key={key}
                                label={statLabels[key]}
                                value={finalPlayerStats[key]}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-5xl font-bold text-muted-foreground/50 self-center mt-8">
                    -
                    </div>
                )}
            </div>
             {hasStats && (
                <div className="w-full pt-4 md:col-span-2">
                    <p className="text-lg font-semibold text-muted-foreground text-center mb-3">Desglose de Afinidad</p>
                    <ScrollArea className="h-[400px] pr-4">
                        <AffinityBreakdown breakdownResult={affinityBreakdown} />
                    </ScrollArea>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
});

export { PlayerTesterMemo as PlayerTester };
