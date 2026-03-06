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
import { UploadCloud, Beaker, Star, Target, Check, ChevronsUpDown, LayoutGrid } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { PlayerAttributeStats, Position, PlayerStyle, LiveUpdateRating, Tier } from "@/lib/types";
import { positions, playerStyles, playerSkillsList } from "@/lib/types";
import { calculateStats, calculateTierInfo, allStatsKeys, statLabels, getAverageColorClass, getTierColorClass } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Badge } from "./ui/badge";

const testerSchema = z.object({
  position: z.enum(positions),
  style: z.enum(playerStyles),
  skills: z.array(z.string()).optional(),
  liveUpdate: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  stats: z.record(z.string(), z.coerce.number().min(0).max(99).optional()),
});

export function PlayerTester() {
  const [pastedText, setPastedText] = React.useState('');
  const { toast } = useToast();
  const form = useForm<z.infer<typeof testerSchema>>({
    resolver: zodResolver(testerSchema),
    defaultValues: { position: "DC", style: "Cazagoles", skills: [], liveUpdate: 'C', stats: {} },
  });

  const { control, setValue, getValues } = form;
  const watchedStats = useWatch({ control, name: "stats" });
  const watchedLiveUpdate = useWatch({ control, name: "liveUpdate" });

  const hasStats = React.useMemo(() => Object.keys(watchedStats || {}).length > 0, [watchedStats]);

  const results = React.useMemo(() => {
    if (!hasStats) return null;
    const statsArray = Object.values(getValues('stats')).filter((v): v is number => v !== undefined);
    const stats = calculateStats(statsArray);
    return calculateTierInfo(stats.average, stats.matches || 10, watchedLiveUpdate as LiveUpdateRating);
  }, [hasStats, watchedLiveUpdate, watchedStats, getValues]);

  const handleParse = () => {
    const lines = pastedText.split('\n').filter(l => l.trim() !== '');
    const newStats: any = {};
    let count = 0;
    const isNumericOnly = lines.every(l => /^\d+/.test(l.trim()));

    if (isNumericOnly) {
        allStatsKeys.forEach((key, i) => { if (lines[i]) { newStats[key] = parseInt(lines[i].trim(), 10); count++; } });
    }
    if (count > 0) { form.setValue('stats', newStats); toast({ title: "Cargado", description: `${count} atributos.` }); }
    else toast({ variant: "destructive", title: "Error", description: "Formato no reconocido." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-accent"><Beaker />Probador de Rendimiento</CardTitle>
        <CardDescription>Analiza el Tier de un jugador pegando sus estadísticas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <Textarea placeholder="Pega columna de números..." value={pastedText} onChange={e => setPastedText(e.target.value)} className="min-h-[150px]" />
                <Button onClick={handleParse} disabled={!pastedText} className="w-full"><UploadCloud className="mr-2 h-4 w-4" />Analizar</Button>
                <Form {...form}>
                    <FormField control={form.control} name="liveUpdate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Letra (Live Update)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{['A', 'B', 'C', 'D', 'E'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                </Form>
            </div>

            {results ? (
                <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg border">
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Tier Calculado</p>
                    <div className={cn("text-9xl font-black mb-4", getTierColorClass(results.tier))}>{results.tier}</div>
                    <div className="text-2xl font-bold">Puntuación: {results.score.toFixed(1)}</div>
                </div>
            ) : (
                <div className="flex items-center justify-center border border-dashed rounded-lg text-muted-foreground p-8">Ingresa estadísticas para ver el resultado</div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
