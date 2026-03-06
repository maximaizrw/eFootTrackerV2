"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { UploadCloud, Beaker } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { LiveUpdateRating, Tier } from "@/lib/types";
import { tiers, liveUpdateRatings } from "@/lib/types";
import { calculateStats, calculateFinalScore, allStatsKeys, getTierColorClass } from "@/lib/utils";
import { cn } from "@/lib/utils";

const testerSchema = z.object({
  tier: z.enum(tiers),
  liveUpdate: z.enum(liveUpdateRatings),
  stats: z.record(z.string(), z.coerce.number().min(0).max(99).optional()),
});

export function PlayerTester() {
  const [pastedText, setPastedText] = React.useState('');
  const { toast } = useToast();
  const form = useForm<z.infer<typeof testerSchema>>({
    resolver: zodResolver(testerSchema),
    defaultValues: { tier: 'B', liveUpdate: 'C', stats: {} },
  });

  const { control, setValue, getValues } = form;
  const watchedStats = useWatch({ control, name: "stats" });
  const watchedTier = useWatch({ control, name: "tier" });
  const watchedLiveUpdate = useWatch({ control, name: "liveUpdate" });

  const hasStats = React.useMemo(() => Object.keys(watchedStats || {}).length > 0, [watchedStats]);

  const results = React.useMemo(() => {
    const statsArray = Object.values(getValues('stats') || {}).filter((v): v is number => v !== undefined);
    const stats = calculateStats(statsArray);
    
    // Simulamos un promedio de notas de 7.0 para ver cómo quedaría el puntaje final
    const dummyMatchAverage = 7.0; 
    
    const score = calculateFinalScore(
        watchedTier as Tier, 
        dummyMatchAverage, 
        10, // partidos simulados
        watchedLiveUpdate as LiveUpdateRating,
        dummyMatchAverage,
        false
    );
    
    return { score, attrAverage: stats.average };
  }, [watchedTier, watchedLiveUpdate, watchedStats, getValues]);

  const handleParse = () => {
    const lines = pastedText.split('\n').filter(l => l.trim() !== '');
    const newStats: any = {};
    let count = 0;
    const isNumericOnly = lines.every(l => /^\d+/.test(l.trim()));

    if (isNumericOnly) {
        allStatsKeys.forEach((key, i) => { if (lines[i]) { newStats[key] = parseInt(lines[i].trim(), 10); count++; } });
    }
    if (count > 0) { 
        form.setValue('stats', newStats); 
        toast({ title: "Atributos Cargados", description: `Se han procesado ${count} estadísticas.` }); 
    }
    else toast({ variant: "destructive", title: "Error", description: "No se reconoció el formato de los atributos." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-accent"><Beaker />Simulador de Puntaje</CardTitle>
        <CardDescription>Visualiza cómo el Tier manual y el Live Update definen el puntaje de un jugador en el 11 Ideal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <Form {...form}>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="tier" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tier Manual</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{tiers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="liveUpdate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Letra (Live Update)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{liveUpdateRatings.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                    </div>
                </Form>
                
                <div className="pt-4 border-t">
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase">Análisis de Atributos (Opcional)</FormLabel>
                    <Textarea placeholder="Pega columna de números de eFootballHub..." value={pastedText} onChange={e => setPastedText(e.target.value)} className="min-h-[100px] mt-2" />
                    <Button onClick={handleParse} disabled={!pastedText} className="w-full mt-2" variant="secondary"><UploadCloud className="mr-2 h-4 w-4" />Calcular Promedio Base</Button>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg border">
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Simulación de Nivel</p>
                <div className={cn("text-9xl font-black mb-2", getTierColorClass(watchedTier as Tier))}>{watchedTier}</div>
                <div className="text-3xl font-black text-primary">Puntaje Definitorio: {results.score.toFixed(1)}</div>
                <div className="mt-4 text-muted-foreground text-xs text-center max-w-[250px]">
                    Este es el valor final que usa el Generador del 11 Ideal para elegir titulares. Calculado usando Tier {watchedTier}, nota hipotética 7.0 y letra {watchedLiveUpdate}.
                </div>
                {hasStats && (
                    <div className="mt-4 p-2 bg-background rounded border font-semibold text-sm">
                        Promedio Atributos: {results.attrAverage.toFixed(1)}
                    </div>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
