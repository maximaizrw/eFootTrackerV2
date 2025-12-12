
"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { UploadCloud, Beaker, Star } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { PlayerAttributeStats, IdealBuild, Position, PlayerStyle, BuildPosition } from "@/lib/types";
import { positions, playerStyles, getAvailableStylesForPosition } from "@/lib/types";
import { calculateAutomaticAffinity, getIdealBuildForPlayer, statLabels } from "@/lib/utils";
import { cn, getAverageColorClass } from "@/lib/utils";
import { Label } from "./ui/label";

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

const orderedStatFields: (keyof PlayerAttributeStats)[] = Object.values(statLabels).map(label => {
    return Object.keys(nameToSchemaKeyMap).find(key => nameToSchemaKeyMap[key] === Object.keys(statLabels).find(slKey => statLabels[slKey as keyof PlayerAttributeStats] === label)) as keyof PlayerAttributeStats;
}).filter(Boolean);

type PlayerTesterProps = {
  idealBuilds: IdealBuild[];
};

export function PlayerTester({ idealBuilds }: PlayerTesterProps) {
  const [pastedText, setPastedText] = React.useState('');
  const [affinity, setAffinity] = React.useState<number | null>(null);
  const [bestBuildStyle, setBestBuildStyle] = React.useState<string | null>(null);
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
    const playerStats = getValues('stats');
    if (Object.keys(playerStats).length > 0) {
      const position = getValues('position');
      const style = getValues('style');
      const isGoalkeeper = position === 'PT';

      const { bestBuild, bestStyle } = getIdealBuildForPlayer(style, position, idealBuilds, playerStats);
      const calculatedAffinity = calculateAutomaticAffinity(playerStats, bestBuild, isGoalkeeper);
      
      setAffinity(calculatedAffinity);
      setBestBuildStyle(bestStyle);
    } else {
      setAffinity(null);
      setBestBuildStyle(null);
    }
  }, [watchedStats, watchedPosition, watchedStyle, idealBuilds, getValues]);


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

  const affinityColorClass = affinity !== null ? getAverageColorClass(affinity / 10) : '';

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
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
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
            </div>
          </Form>
        </div>

        <div className="flex flex-col items-center justify-center bg-muted/50 rounded-lg p-8 space-y-4">
          <p className="text-lg font-semibold text-muted-foreground">Afinidad Calculada</p>
          {affinity !== null ? (
            <>
              <div className={cn("text-7xl font-bold flex items-center gap-2", affinityColorClass)}>
                <Star className="w-12 h-12" />
                {affinity.toFixed(2)}
              </div>
              <p className="text-sm text-center">
                Mejor Build Encontrada: <span className="font-semibold text-primary">{bestBuildStyle || 'N/A'}</span>
              </p>
            </>
          ) : (
            <div className="text-5xl font-bold text-muted-foreground/50">
              -
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
