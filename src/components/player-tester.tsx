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
import { UploadCloud, Beaker, Star, Target, Footprints, Dribbble, Zap, Beef, ChevronsUp, Shield, Hand, Check, ChevronsUpDown } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { PlayerAttributeStats, IdealBuild, Position, PlayerStyle, BuildPosition, OutfieldBuild, GoalkeeperBuild, PlayerSkill } from "@/lib/types";
import { positions, playerStyles, getAvailableStylesForPosition, playerSkillsList } from "@/lib/types";
import { calculateProgressionStats, getIdealBuildForPlayer, statLabels, calculateProgressionSuggestions, calculateAffinityWithBreakdown, type AffinityBreakdownResult, allStatsKeys, getAverageColorClass } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Label } from "./ui/label";
import { AffinityBreakdown } from "./affinity-breakdown";
import { ScrollArea } from "./ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Badge } from "./ui/badge";

const statSchema = z.coerce.number().min(0).max(99).optional();

const testerSchema = z.object({
  position: z.enum(positions),
  style: z.enum(playerStyles),
  skills: z.array(z.string()).optional(),
  height: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
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
    "actitud defensiva": "defensiveAwareness", "defensive awareness": "defensiveAwareness", 
    "entrada": "defensiveEngagement", "defensive engagement": "defensiveEngagement",
    "dedicacion defensiva": "tackling", "tackling": "tackling",
    "agresividad": "aggression", "aggression": "aggression",
    "goalkeeping": "goalkeeping", "gk catching": "gkCatching", "gk parrying": "gkParrying",
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

export function PlayerTester({ idealBuilds }: { idealBuilds: IdealBuild[] }) {
  const [pastedText, setPastedText] = React.useState('');
  const [affinityBreakdown, setAffinityBreakdown] = React.useState<AffinityBreakdownResult>({ totalAffinityScore: 0, breakdown: [], skillsBreakdown: [] });
  const [bestBuildStyle, setBestBuildStyle] = React.useState<string | null>(null);
  const [progressionSuggestions, setProgressionSuggestions] = React.useState<Partial<OutfieldBuild & GoalkeeperBuild>>({});
  const [progressionPoints, setProgressionPoints] = React.useState<number | undefined>(undefined);
  const [finalPlayerStats, setFinalPlayerStats] = React.useState<PlayerAttributeStats>({});
  const [skillsPopoverOpen, setSkillsPopoverOpen] = React.useState(false);

  const { toast } = useToast();
  const form = useForm<PlayerTesterFormValues>({
    resolver: zodResolver(testerSchema),
    defaultValues: { position: "DC", style: "Cazagoles", skills: [], stats: {} },
  });

  const { control, setValue, getValues } = form;
  const watchedPosition = useWatch({ control, name: "position" });
  const watchedStyle = useWatch({ control, name: "style" });
  const watchedStats = useWatch({ control, name: "stats" });
  const watchedSkills = useWatch({ control, name: 'skills' }) || [];
  const watchedHeight = useWatch({ control, name: "height" });
  const watchedWeight = useWatch({ control, name: "weight" });

  React.useEffect(() => {
    const available = getAvailableStylesForPosition(watchedPosition, true);
    if (!available.includes(watchedStyle)) setValue('style', available[0] || 'Ninguno');
  }, [watchedPosition, watchedStyle, setValue]);

  React.useEffect(() => {
    const base = getValues('stats');
    if (Object.keys(base).length > 0) {
        const { bestBuild, bestStyle } = getIdealBuildForPlayer(watchedStyle, watchedPosition, idealBuilds, 'Contraataque largo', watchedHeight);
        const sugg = calculateProgressionSuggestions(base, bestBuild, watchedPosition === 'PT', progressionPoints);
        const final = calculateProgressionStats(base, sugg, watchedPosition === 'PT');
        const breakdown = calculateAffinityWithBreakdown(final, bestBuild, { height: watchedHeight, weight: watchedWeight }, watchedSkills as PlayerSkill[]);
        setFinalPlayerStats(final); setProgressionSuggestions(sugg); setAffinityBreakdown(breakdown); setBestBuildStyle(bestStyle);
    } else {
        setFinalPlayerStats({}); setProgressionSuggestions({}); setAffinityBreakdown({ totalAffinityScore: 0, breakdown: [] }); setBestBuildStyle(null);
    }
  }, [watchedStats, watchedPosition, watchedStyle, watchedSkills, watchedHeight, watchedWeight, idealBuilds, getValues, progressionPoints]);

  const handleParse = () => {
    const lines = pastedText.split('\n').filter(l => l.trim() !== '');
    const newStats: Partial<PlayerAttributeStats> = {};
    let count = 0;
    if (lines.every(l => /^\d+\s*$/.test(l.trim())) && lines.length > 25) {
        orderedStatFields.forEach((key, i) => { if (lines[i]) { newStats[key] = parseInt(lines[i].trim(), 10); count++; } });
    } else {
        lines.forEach(l => {
            const p = l.split(/\s+/).filter(Boolean);
            if (p.length < 2) return;
            const v = parseInt(p[p.length - 1], 10); if (isNaN(v)) return;
            const key = nameToSchemaKeyMap[p.slice(0, -1).join(' ').replace('●', '').trim().toLowerCase()];
            if (key) { newStats[key] = v; count++; }
        });
    }
    if (count > 0) { form.setValue('stats', newStats as PlayerAttributeStats); toast({ title: "Cargado", description: `${count} atributos.` }); }
    else toast({ variant: "destructive", title: "Error", description: "Formato no reconocido." });
  };

  const handleSkill = (s: string) => {
    const cur = getValues('skills') || [];
    setValue('skills', cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s], { shouldValidate: true });
  };

  const hasStats = Object.keys(watchedStats).length > 0;
  const suggCats = watchedPosition === 'PT' ? goalkeeperCategories : outfieldCategories;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-accent"><Beaker />Probador</CardTitle>
        <CardDescription>Simula afinidades pegando estadísticas.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4 md:col-span-1">
          <Textarea placeholder="Pega stats aquí..." value={pastedText} onChange={e => setPastedText(e.target.value)} className="min-h-[150px]" />
          <Button onClick={handleParse} disabled={!pastedText}><UploadCloud className="mr-2 h-4 w-4" />Analizar</Button>
          <Form {...form}>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="position" render={({ field }) => (
                  <FormItem><FormLabel>Posición</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></FormItem>
                )} />
                <FormField control={form.control} name="style" render={({ field }) => (
                  <FormItem><FormLabel>Estilo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{getAvailableStylesForPosition(watchedPosition, true).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="height" render={({ field }) => (<FormItem><FormLabel>Altura</FormLabel><FormControl><Input type="number" placeholder="cm" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="weight" render={({ field }) => (<FormItem><FormLabel>Peso</FormLabel><FormControl><Input type="number" placeholder="kg" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} /></FormControl></FormItem>)} />
              </div>
              <FormItem><FormLabel>Habilidades</FormLabel>
                <Popover open={skillsPopoverOpen} onOpenChange={setSkillsPopoverOpen}>
                  <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-auto min-h-10"><div className="flex gap-1 flex-wrap">{watchedSkills.length > 0 ? watchedSkills.map(s => <Badge key={s} variant="secondary">{s}</Badge>) : <span className="text-muted-foreground text-xs">Seleccionar...</span>}</div><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty>{playerSkillsList.map(s => <CommandItem key={s} value={s} onSelect={() => handleSkill(s)}><Check className={cn("mr-2 h-4 w-4", watchedSkills.includes(s) ? "opacity-100" : "opacity-0")} />{s}</CommandItem>)}</CommandList></Command></PopoverContent>
                </Popover>
              </FormItem>
              <FormItem><FormLabel>Puntos de Progresión</FormLabel><Input type="number" placeholder="Ej: 50" value={progressionPoints ?? ''} onChange={e => setProgressionPoints(e.target.value ? parseInt(e.target.value, 10) : undefined)} /></FormItem>
            </div>
          </Form>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 md:col-span-2 gap-6">
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <p className="text-lg font-semibold text-muted-foreground">Afinidad</p>
                {hasStats ? <div className="text-center"><div className={cn("text-7xl font-bold flex items-center justify-center gap-2", getAverageColorClass(affinityBreakdown.totalAffinityScore/10))}><Star className="w-12 h-12" />{affinityBreakdown.totalAffinityScore.toFixed(2)}</div><p className="text-sm mt-1">Perfil: <span className="font-semibold text-primary">{bestBuildStyle || 'N/A'}</span></p></div> : <div className="text-5xl font-bold text-muted-foreground/50 text-center mt-8">-</div>}
                {Object.values(progressionSuggestions).some(v => v && v > 0) && (
                    <div className="w-full pt-4 mt-4 border-t"><p className="text-base font-semibold text-muted-foreground text-center mb-3">Sugerencias</p>
                    <div className="space-y-2">{suggCats.map(c => { const v = (progressionSuggestions as any)[c.key]; return v > 0 ? (<div key={c.key} className="flex items-center justify-between p-2 bg-background/50 rounded-md"><span className="flex items-center gap-2 text-sm"><c.icon className="w-4 h-4" />{c.label}</span><span className="font-bold text-primary">{v}</span></div>) : null; })}</div></div>
                )}
            </div>
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <p className="text-lg font-semibold text-muted-foreground">Stats Finales</p>
                {hasStats ? <div className="w-full space-y-1">{(watchedPosition === 'PT' ? goalkeeperStatsKeys : allStatsKeys).map(k => <StatDisplay key={k} label={statLabels[k]} value={finalPlayerStats[k]} />)}</div> : <div className="text-5xl font-bold text-muted-foreground/50 text-center mt-8">-</div>}
            </div>
            {hasStats && <div className="md:col-span-2 pt-4"><p className="text-lg font-semibold text-muted-foreground text-center mb-3">Desglose</p><ScrollArea className="h-[400px]"><AffinityBreakdown breakdownResult={affinityBreakdown} /></ScrollArea></div>}
        </div>
      </CardContent>
    </Card>
  );
}

const goalkeeperStatsKeys: (keyof PlayerAttributeStats)[] = ['goalkeeping', 'gkCatching', 'gkParrying', 'gkReflexes', 'gkReach'];
