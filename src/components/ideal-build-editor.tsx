"use client";

import * as React from "react";
import type { BuildPosition, PlayerStyle, IdealBuild, PlayerAttributeStats, IdealBuildType } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { playerSkillsList, idealBuildTypes } from "@/lib/types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { UploadCloud } from "lucide-react";
import { buildPositions, playerStyles, getAvailableStylesForPosition, positionLabels } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Badge } from "./ui/badge";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const statSchema = z.coerce.number().min(0).max(99).optional();
const physicalSchema = z.coerce.number().optional();

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
  build: z.object({
    offensiveAwareness: statSchema,
    ballControl: statSchema,
    dribbling: statSchema,
    tightPossession: statSchema,
    lowPass: statSchema,
    loftedPass: statSchema,
    finishing: statSchema,
    heading: statSchema,
    placeKicking: statSchema,
    curl: statSchema,
    defensiveAwareness: statSchema,
    defensiveEngagement: statSchema,
    tackling: statSchema,
    aggression: statSchema,
    goalkeeping: statSchema,
    gkCatching: statSchema,
    gkParrying: statSchema,
    gkReflexes: statSchema,
    gkReach: statSchema,
    speed: statSchema,
    acceleration: statSchema,
    kickingPower: statSchema,
    jump: statSchema,
    physicalContact: statSchema,
    balance: statSchema,
    stamina: statSchema,
  }),
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

const orderedStatFields: (keyof PlayerAttributeStats)[] = statFields.flatMap(category => category.fields.map(field => field.name));

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
      height: { min: undefined, max: undefined },
      weight: { min: undefined, max: undefined },
      build: {},
    },
  });

  const { watch, reset, setValue, getValues } = form;
  const watchedPosition = watch("position");
  const watchedPrimarySkills = watch("primarySkills") || [];
  const watchedSecondarySkills = watch("secondarySkills") || [];
  const isEditing = !!initialBuild?.id;

  React.useEffect(() => {
    if (open) {
      setPastedText('');
      const defaultBuildValues: Record<string, any> = {};
      statFields.forEach(cat => {
        cat.fields.forEach(f => {
          defaultBuildValues[f.name] = '';
        });
      });

      if (initialBuild) {
        const initialBuildValues: Record<string, any> = {};
        statFields.forEach(cat => {
          cat.fields.forEach(f => {
            initialBuildValues[f.name] = initialBuild.build?.[f.name as keyof PlayerAttributeStats] ?? '';
          });
        });
        reset({
          playStyle: "Contraataque largo",
          position: initialBuild.position,
          style: initialBuild.style,
          profileName: initialBuild.profileName || "",
          primarySkills: initialBuild.primarySkills || [],
          secondarySkills: initialBuild.secondarySkills || [],
          height: { min: initialBuild.height?.min, max: initialBuild.height?.max },
          weight: { min: initialBuild.weight?.min, max: initialBuild.weight?.max },
          build: initialBuildValues as any,
        });
      } else {
        reset({
          playStyle: "Contraataque largo",
          position: "DC",
          style: "Cazagoles",
          profileName: "",
          primarySkills: [],
          secondarySkills: [],
          height: { min: undefined, max: undefined },
          weight: { min: undefined, max: undefined },
          build: defaultBuildValues as any,
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

  const handleSubmit = (values: IdealBuildFormValues) => {
    const finalStats: PlayerAttributeStats = {};
    statFields.forEach(category => {
        category.fields.forEach(field => {
            const key = field.name as keyof PlayerAttributeStats;
            const value = values.build[key];
            if (value !== '' && value !== null && value !== undefined && !isNaN(Number(value))) {
                finalStats[key] = Number(value);
            }
        });
    });

    const finalBuild: IdealBuild = {
      playStyle: "Contraataque largo",
      position: values.position,
      style: values.style,
      profileName: values.profileName,
      primarySkills: values.primarySkills || [],
      secondarySkills: values.secondarySkills || [],
      height: { min: values.height?.min, max: values.height?.max },
      weight: { min: values.weight?.min, max: values.weight?.max },
      build: finalStats,
    };
    
    onSave(finalBuild);
    onOpenChange(false);
  };

  const handleParseText = () => {
    const lines = pastedText.split('\n').filter(line => line.trim() !== '');
    let parsedCount = 0;
    const isNumericOnly = lines.every(line => /^\d+\s*$/.test(line.trim()));

    if (isNumericOnly) {
        if (lines.length !== orderedStatFields.length) {
            toast({
                variant: "destructive",
                title: "Error de Formato",
                description: `Se esperaban ${orderedStatFields.length} atributos, pero se encontraron ${lines.length}.`,
            });
            return;
        }
        lines.forEach((line, index) => {
            const value = parseInt(line.trim(), 10);
            const schemaKey = orderedStatFields[index];
            if (schemaKey) {
                form.setValue(`build.${schemaKey}`, value, { shouldValidate: true });
                parsedCount++;
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
                form.setValue(`build.${schemaKey}`, value, { shouldValidate: true });
                parsedCount++;
            }
        });
    }

    if (parsedCount > 0) {
      toast({ title: "Estadísticas Cargadas", description: `Se han cargado ${parsedCount} atributos.` });
      setPastedText('');
    }
  };
  
  const handleSkillToggle = (skillToToggle: string, type: 'primary' | 'secondary') => {
    const fieldName = type === 'primary' ? 'primarySkills' : 'secondarySkills';
    const otherFieldName = type === 'primary' ? 'secondarySkills' : 'primarySkills';
    const currentValues = getValues(fieldName) || [];
    const otherValues = getValues(otherFieldName) || [];

    if (otherValues.includes(skillToToggle)) {
        toast({ variant: "destructive", title: "Habilidad Duplicada", description: "Una habilidad no puede ser primaria y secundaria a la vez." });
        return;
    }
    
    const isSelected = currentValues.includes(skillToToggle);
    const newValues = isSelected ? currentValues.filter((s) => s !== skillToToggle) : [...currentValues, skillToToggle];
    setValue(fieldName, newValues, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar' : 'Añadir'} Build Ideal</DialogTitle>
          <DialogDescription>
            Define los atributos ideales y los activadores por rango físico opcional.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-grow overflow-hidden flex flex-col">
            <ScrollArea className="flex-grow pr-4 -mr-4">
              <div className="space-y-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posición</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona posición" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {buildPositions.map(p => <SelectItem key={p} value={p}>{positionLabels[p]}</SelectItem>)}
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
                        <FormLabel>Estilo de Jugador</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona estilo" />
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
                  <FormField
                    control={form.control}
                    name="profileName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Perfil (Ej: Veloz, Tanque...)</FormLabel>
                        <FormControl>
                          <Input placeholder="Personaliza el nombre del perfil" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2">
                    <Textarea
                        placeholder="Pega las estadísticas aquí..."
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        className="min-h-[40px] h-10 flex-grow"
                    />
                    <Button type="button" onClick={handleParseText} disabled={!pastedText} size="sm">
                        <UploadCloud className="mr-2 h-4 w-4" /> Cargar
                    </Button>
                </div>
                
                 <div className="p-4 rounded-lg border bg-muted/20 space-y-4">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Activadores del Perfil (Opcional)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <FormLabel className="mb-2 block text-xs">Altura (cm)</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                                <FormField control={form.control} name="height.min" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="Min" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="height.max" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="Max" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} /></FormControl></FormItem>)} />
                            </div>
                        </div>
                        <div>
                            <FormLabel className="mb-2 block text-xs">Peso (kg)</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                                <FormField control={form.control} name="weight.min" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="Min" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="weight.max" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="Max" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} /></FormControl></FormItem>)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 rounded-lg border bg-background/50 space-y-4">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Habilidades Recomendadas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="primarySkills"
                            render={() => (
                                <FormItem>
                                <FormLabel>Habilidades Primarias</FormLabel>
                                <Popover open={primarySkillsPopoverOpen} onOpenChange={setPrimarySkillsPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-auto min-h-10">
                                        <div className="flex gap-1 flex-wrap">
                                            {watchedPrimarySkills.length > 0 ? watchedPrimarySkills.map(s => <Badge key={s} variant="default">{s}</Badge>) : <span className="text-muted-foreground text-xs">Seleccionar...</span>}
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty>{playerSkillsList.map(s => <CommandItem key={s} value={s} onSelect={() => handleSkillToggle(s, 'primary')}><Check className={cn("mr-2 h-4 w-4", watchedPrimarySkills.includes(s) ? "opacity-100" : "opacity-0")} />{s}</CommandItem>)}</CommandList></Command>
                                    </PopoverContent>
                                </Popover>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="secondarySkills"
                            render={() => (
                                <FormItem>
                                <FormLabel>Habilidades Secundarias</FormLabel>
                                <Popover open={secondarySkillsPopoverOpen} onOpenChange={setSecondarySkillsPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-auto min-h-10">
                                        <div className="flex gap-1 flex-wrap">
                                            {watchedSecondarySkills.length > 0 ? watchedSecondarySkills.map(s => <Badge key={s} variant="secondary">{s}</Badge>) : <span className="text-muted-foreground text-xs">Seleccionar...</span>}
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Sin resultados.</CommandEmpty>{playerSkillsList.map(s => <CommandItem key={s} value={s} onSelect={() => handleSkillToggle(s, 'secondary')}><Check className={cn("mr-2 h-4 w-4", watchedSecondarySkills.includes(s) ? "opacity-100" : "opacity-0")} />{s}</CommandItem>)}</CommandList></Command>
                                    </PopoverContent>
                                </Popover>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {statFields.map((category) => (
                  <div key={category.category}>
                    <h3 className="text-lg font-semibold mb-3 text-primary">{category.category}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
                      {category.fields.map((field) => (
                        <FormField
                          key={field.name}
                          control={form.control}
                          name={`build.${field.name as any}`}
                          render={({ field: formField }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{field.label}</FormLabel>
                              <FormControl>
                                <Input type="number" min="40" max="99" {...formField} value={formField.value ?? ''} onChange={e => formField.onChange(e.target.value === '' ? undefined : e.target.value)} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="flex-shrink-0 pt-4 mt-4 border-t">
              <Button type="submit">{isEditing ? 'Guardar Cambios' : 'Guardar Build Ideal'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
