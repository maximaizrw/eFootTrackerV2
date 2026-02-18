"use client";

import * as React from "react";
import type { BuildPosition, PlayerStyle, IdealBuild, PlayerAttributeStats, IdealBuildType, PlayerSkill } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { playerSkillsList, idealBuildTypes, buildPositions, playerStyles, getAvailableStylesForPosition, positionLabels } from "@/lib/types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { UploadCloud, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Badge } from "./ui/badge";
import { cn, normalizeText, allStatsKeys } from "@/lib/utils";

const statSchema = z.union([z.coerce.number().min(0).max(99), z.literal('')]).optional();
const physicalSchema = z.union([z.coerce.number().min(0), z.literal('')]).optional();

const minMaxSchema = z.object({
  min: physicalSchema,
  max: physicalSchema,
}).optional();

const buildSchema = z.object({
  playStyle: z.enum(idealBuildTypes),
  position: z.enum(buildPositions),
  style: z.enum(playerStyles),
  profileName: z.string().optional(),
  primarySkills: z.array(z.string()).optional(),
  secondarySkills: z.array(z.string()).optional(),
  height: minMaxSchema,
  weight: minMaxSchema,
  build: z.record(z.string(), statSchema),
});

type IdealBuildFormValues = z.infer<typeof buildSchema>;

type IdealBuildEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (build: IdealBuild) => void;
  initialBuild?: IdealBuild;
  existingBuilds: IdealBuild[];
};

const statFields: { category: string, fields: { name: keyof PlayerAttributeStats, label: string }[] }[] = [
    { 
        category: 'Ataque',
        fields: [
            { name: 'offensiveAwareness', label: 'Act. Ofensiva' },
            { name: 'ballControl', label: 'Control del Balón' },
            { name: 'dribbling', label: 'Regate' },
            { name: 'tightPossession', label: 'Posesión Estrecha' },
            { name: 'lowPass', label: 'Pase Raso' },
            { name: 'loftedPass', label: 'Pase Bombeado' },
            { name: 'finishing', label: 'Finalización' },
            { name: 'heading', label: 'Cabeceo' },
            { name: 'placeKicking', label: 'Balón Parado' },
            { name: 'curl', label: 'Efecto' },
        ]
    },
    {
        category: 'Defensa',
        fields: [
            { name: 'defensiveAwareness', label: 'Act. Defensiva' },
            { name: 'defensiveEngagement', label: 'Entrada' },
            { name: 'tackling', label: 'Segada' },
            { name: 'aggression', label: 'Agresividad' },
        ]
    },
    {
        category: 'Portería',
        fields: [
            { name: 'goalkeeping', label: 'Act. de Portero' },
            { name: 'gkCatching', label: 'Atajar' },
            { name: 'gkParrying', label: 'Despejar' },
            { name: 'gkReflexes', label: 'Reflejos' },
            { name: 'gkReach', label: 'Alcance' },
        ]
    },
    {
        category: 'Atletismo',
        fields: [
            { name: 'speed', label: 'Velocidad' },
            { name: 'acceleration', label: 'Aceleración' },
            { name: 'kickingPower', label: 'Potencia de Tiro' },
            { name: 'jump', label: 'Salto' },
            { name: 'physicalContact', label: 'Contacto Físico' },
            { name: 'balance', label: 'Equilibrio' },
            { name: 'stamina', label: 'Resistencia' },
        ]
    }
];

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

export function IdealBuildEditor({ open, onOpenChange, onSave, initialBuild, existingBuilds }: IdealBuildEditorProps) {
  const { toast } = useToast();
  const [pastedText, setPastedText] = React.useState('');
  const [primarySkillsPopoverOpen, setPrimarySkillsPopoverOpen] = React.useState(false);
  const [secondarySkillsPopoverOpen, setSecondarySkillsPopoverOpen] = React.useState(false);

  const form = useForm<IdealBuildFormValues>({
    resolver: zodResolver(buildSchema),
    defaultValues: {
      playStyle: "Contraataque largo",
      position: "DC",
      style: "Cazagoles",
      profileName: "",
      primarySkills: [],
      secondarySkills: [],
      height: { min: '', max: '' },
      weight: { min: '', max: '' },
      build: {},
    },
  });

  const { watch, reset, setValue, getValues, handleSubmit: formHandleSubmit } = form;
  const watchedPosition = watch("position");
  const watchedPrimarySkills = watch("primarySkills") || [];
  const watchedSecondarySkills = watch("secondarySkills") || [];
  const isEditing = !!initialBuild?.id;

  const isDuplicateName = React.useMemo(() => {
    const currentName = watch('profileName') || '';
    const currentPos = watch('position');
    const currentStyle = watch('style');

    return existingBuilds.some(b => 
        b.id !== initialBuild?.id && 
        b.position === currentPos && 
        b.style === currentStyle && 
        normalizeText(b.profileName || '') === normalizeText(currentName)
    );
  }, [watch('position'), watch('style'), watch('profileName'), existingBuilds, initialBuild?.id]);

  React.useEffect(() => {
    if (open) {
      setPastedText('');
      const defaultBuildValues: any = {};
      orderedStatFields.forEach(key => { defaultBuildValues[key] = ''; });

      if (initialBuild) {
        reset({
          playStyle: "Contraataque largo",
          position: initialBuild.position,
          style: initialBuild.style,
          profileName: initialBuild.profileName || "",
          primarySkills: initialBuild.primarySkills || [],
          secondarySkills: initialBuild.secondarySkills || [],
          height: { min: initialBuild.height?.min ?? '', max: initialBuild.height?.max ?? '' },
          weight: { min: initialBuild.weight?.min ?? '', max: initialBuild.weight?.max ?? '' },
          build: (initialBuild.build as any) || defaultBuildValues,
        });
      } else {
        reset({
          playStyle: "Contraataque largo",
          position: "DC",
          style: "Cazagoles",
          profileName: "",
          primarySkills: [],
          secondarySkills: [],
          height: { min: '', max: '' },
          weight: { min: '', max: '' },
          build: defaultBuildValues,
        });
      }
    }
  }, [open, initialBuild, reset]);
  
  const availableStyles = React.useMemo(() => {
    return getAvailableStylesForPosition(watchedPosition, true);
  }, [watchedPosition]);

  React.useEffect(() => {
      if (!isEditing && !availableStyles.includes(watch('style'))) {
          setValue('style', availableStyles[0] || 'Ninguno');
      }
  }, [availableStyles, watch, setValue, isEditing]);

  const onSubmit = (values: IdealBuildFormValues) => {
    if (isDuplicateName) {
        toast({
            variant: "destructive",
            title: "Nombre Duplicado",
            description: "Ya existe un perfil con este nombre para la misma posición y estilo.",
        });
        return;
    }

    const finalStats: PlayerAttributeStats = {};
    orderedStatFields.forEach(key => {
        const val = values.build[key];
        if (val !== '' && val !== null && val !== undefined && !isNaN(Number(val))) {
            finalStats[key] = Number(val);
        }
    });

    onSave({
      id: initialBuild?.id,
      playStyle: "Contraataque largo",
      position: values.position,
      style: values.style,
      profileName: values.profileName,
      primarySkills: (values.primarySkills || []) as PlayerSkill[],
      secondarySkills: (values.secondarySkills || []) as PlayerSkill[],
      height: {
          min: (values.height?.min === '' || values.height?.min === undefined) ? undefined : Number(values.height.min),
          max: (values.height?.max === '' || values.height?.max === undefined) ? undefined : Number(values.height.max)
      },
      weight: {
          min: (values.weight?.min === '' || values.weight?.min === undefined) ? undefined : Number(values.weight.min),
          max: (values.weight?.max === '' || values.weight?.max === undefined) ? undefined : Number(values.weight.max)
      },
      build: finalStats,
    });
    onOpenChange(false);
  };

  const handleParseText = () => {
    const lines = pastedText.split('\n').filter(line => line.trim() !== '');
    let parsedCount = 0;
    const isNumericOnly = lines.every(line => /^\d+\s*$/.test(line.trim()));

    if (isNumericOnly) {
        lines.forEach((line, index) => {
            const key = orderedStatFields[index];
            if (key) {
                form.setValue(`build.${key}`, parseInt(line.trim(), 10), { shouldValidate: true });
                parsedCount++;
            }
        });
    } else {
        lines.forEach(line => {
            const parts = line.split(/\s+/).filter(Boolean);
            if (parts.length < 2) return;
            const val = parseInt(parts[parts.length - 1], 10);
            if (isNaN(val)) return;
            const key = nameToSchemaKeyMap[parts.slice(0, -1).join(' ').replace('●', '').trim().toLowerCase()];
            if (key) {
                form.setValue(`build.${key}`, val, { shouldValidate: true });
                parsedCount++;
            }
        });
    }

    if (parsedCount > 0) {
      toast({ title: "Estadísticas Cargadas", description: `${parsedCount} atributos.` });
      setPastedText('');
    }
  };
  
  const handleSkillToggle = (skillToToggle: string, type: 'primary' | 'secondary') => {
    const field = type === 'primary' ? 'primarySkills' : 'secondarySkills';
    const other = type === 'primary' ? 'secondarySkills' : 'primarySkills';
    const cur = getValues(field) || [];
    const otherCur = getValues(other) || [];

    if (otherCur.includes(skillToToggle)) return;
    
    const newVal = cur.includes(skillToToggle) ? cur.filter(s => s !== skillToToggle) : [...cur, skillToToggle];
    setValue(field, newVal, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar' : 'Añadir'} Build Ideal</DialogTitle>
          <DialogDescription>Configura el perfil táctico y sus activadores físicos opcionales.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={formHandleSubmit(onSubmit)} className="flex-grow overflow-hidden flex flex-col">
            <ScrollArea className="flex-grow pr-4 -mr-4">
              <div className="space-y-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="position" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posición</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{buildPositions.map(p => <SelectItem key={p} value={p}>{positionLabels[p]}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="style" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estilo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{availableStyles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="profileName" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre Perfil (Ej: Veloz)</FormLabel>
                        <FormControl><Input placeholder="Nombre personalizado" {...field} /></FormControl>
                        {isDuplicateName && (
                            <FormDescription className="text-destructive font-semibold flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Este nombre ya existe para esta posición.
                            </FormDescription>
                        )}
                    </FormItem>
                  )} />
                </div>

                <div className="flex gap-2">
                    <Textarea placeholder="Pega stats..." value={pastedText} onChange={e => setPastedText(e.target.value)} className="min-h-[40px] h-10 flex-grow" />
                    <Button type="button" onClick={handleParseText} disabled={!pastedText} size="sm"><UploadCloud className="mr-2 h-4 w-4" /> Cargar</Button>
                </div>
                
                 <div className="p-4 rounded-lg border bg-muted/20 space-y-4">
                    <h3 className="text-sm font-bold text-primary uppercase">Activadores del Perfil (Opcional)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <FormLabel className="mb-2 block text-xs">Altura (cm)</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                                <FormField control={form.control} name="height.min" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="Min" {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="height.max" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="Max" {...field} /></FormControl></FormItem>)} />
                            </div>
                        </div>
                        <div>
                            <FormLabel className="mb-2 block text-xs">Peso (kg)</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                                <FormField control={form.control} name="weight.min" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="Min" {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="weight.max" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="Max" {...field} /></FormControl></FormItem>)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 rounded-lg border bg-background/50 space-y-4">
                    <h3 className="text-sm font-bold text-primary uppercase">Habilidades Recomendadas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormItem>
                            <FormLabel>Primarias</FormLabel>
                            <Popover open={primarySkillsPopoverOpen} onOpenChange={setPrimarySkillsPopoverOpen}>
                                <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-auto min-h-10"><div className="flex gap-1 flex-wrap">{watchedPrimarySkills.length > 0 ? watchedPrimarySkills.map(s => <Badge key={s} variant="default">{s}</Badge>) : <span className="text-muted-foreground text-xs">Seleccionar...</span>}</div><Check className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty>{playerSkillsList.map(s => <CommandItem key={s} value={s} onSelect={() => handleSkillToggle(s, 'primary')}><Check className={cn("mr-2 h-4 w-4", watchedPrimarySkills.includes(s) ? "opacity-100" : "opacity-0")} />{s}</CommandItem>)}</CommandList></Command></PopoverContent>
                            </Popover>
                        </FormItem>
                        <FormItem>
                            <FormLabel>Secundarias</FormLabel>
                            <Popover open={secondarySkillsPopoverOpen} onOpenChange={setSecondarySkillsPopoverOpen}>
                                <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-auto min-h-10"><div className="flex gap-1 flex-wrap">{watchedSecondarySkills.length > 0 ? watchedSecondarySkills.map(s => <Badge key={s} variant="secondary">{s}</Badge>) : <span className="text-muted-foreground text-xs">Seleccionar...</span>}</div><Check className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty>{playerSkillsList.map(s => <CommandItem key={s} value={s} onSelect={() => handleSkillToggle(s, 'secondary')}><Check className={cn("mr-2 h-4 w-4", watchedSecondarySkills.includes(s) ? "opacity-100" : "opacity-0")} />{s}</CommandItem>)}</CommandList></Command></PopoverContent>
                            </Popover>
                        </FormItem>
                    </div>
                </div>

                {statFields.map(cat => (
                  <div key={cat.category}>
                    <h3 className="text-lg font-semibold mb-3 text-primary">{cat.category}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
                      {cat.fields.map(f => (
                        <FormField key={f.name} control={form.control} name={`build.${f.name}`} render={({ field: ff }) => (
                          <FormItem><FormLabel className="text-xs">{f.label}</FormLabel><FormControl><Input type="number" min="0" max="99" {...ff} /></FormControl><FormMessage /></FormItem>
                        )} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="flex-shrink-0 pt-4 mt-4 border-t">
              {isDuplicateName && (
                  <div className="mr-auto text-destructive text-xs font-bold animate-pulse">
                      ¡Atención! El nombre del perfil debe ser diferente para la copia.
                  </div>
              )}
              <Button type="submit" disabled={isDuplicateName}>{isEditing ? 'Guardar Cambios' : 'Guardar Build Ideal'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
