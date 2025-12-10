
"use client";

import * as React from "react";
import type { Position, PlayerStyle, IdealBuild, OutfieldBuild, GoalkeeperBuild } from "@/lib/types";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
import { Label } from "@/components/ui/label";
import { Slider } from "./ui/slider";
import { ScrollArea } from "./ui/scroll-area";
import { positions, playerStyles, getAvailableStylesForPosition } from "@/lib/types";
import { Target, Footprints, Dribbble, Zap, Beef, ChevronsUp, Shield, Hand } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const buildSchema = z.object({
  position: z.enum(positions),
  style: z.enum(playerStyles),
  build: z.object({
    shooting: z.number().min(0).max(20).optional(),
    passing: z.number().min(0).max(20).optional(),
    dribbling: z.number().min(0).max(20).optional(),
    dexterity: z.number().min(0).max(20).optional(),
    lowerBodyStrength: z.number().min(0).max(20).optional(),
    aerialStrength: z.number().min(0).max(20).optional(),
    defending: z.number().min(0).max(20).optional(),
    gk1: z.number().min(0).max(20).optional(),
    gk2: z.number().min(0).max(20).optional(),
    gk3: z.number().min(0).max(20).optional(),
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

export function IdealBuildEditor({ open, onOpenChange, onSave, initialBuild, existingBuilds }: IdealBuildEditorProps) {
  const { toast } = useToast();
  const form = useForm<IdealBuildFormValues>({
    resolver: zodResolver(buildSchema),
    defaultValues: {
      position: "DC",
      style: "Cazagoles",
      build: {},
    },
  });

  const { watch, reset, setValue } = form;
  const watchedPosition = watch("position");
  const isGoalkeeper = watchedPosition === 'PT';
  const isEditing = !!initialBuild?.id;

  React.useEffect(() => {
    if (open) {
      if (initialBuild) {
        reset({
          position: initialBuild.position,
          style: initialBuild.style,
          build: initialBuild.build,
        });
      } else {
        reset({
          position: "DC",
          style: "Cazagoles",
          build: {},
        });
      }
    }
  }, [open, initialBuild, reset]);
  
  const availableStyles = React.useMemo(() => {
    return getAvailableStylesForPosition(watchedPosition, false);
  }, [watchedPosition]);

  React.useEffect(() => {
      if (!availableStyles.includes(watch('style'))) {
          setValue('style', availableStyles[0]);
      }
  }, [availableStyles, watch, setValue]);

  const handleSubmit = (values: IdealBuildFormValues) => {
    const buildId = `${values.position}-${values.style}`;
    const isDuplicate = existingBuilds.some(b => b.id === buildId && buildId !== initialBuild?.id);

    if (isDuplicate) {
        toast({
            variant: "destructive",
            title: "Build Duplicada",
            description: `Ya existe una build ideal para ${values.position} - ${values.style}.`,
        });
        return;
    }
    
    onSave({
      id: isEditing ? initialBuild!.id : buildId,
      ...values,
    });
    onOpenChange(false);
  };
  
  const categories = isGoalkeeper ? goalkeeperCategories : outfieldCategories;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar' : 'Añadir'} Build Ideal</DialogTitle>
          <DialogDescription>
            Define los puntos de progresión óptimos para un arquetipo de jugador.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-grow overflow-hidden flex flex-col">
            <ScrollArea className="flex-grow pr-4 -mr-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <p className="font-medium text-sm text-muted-foreground pt-4">Puntos de Progresión Ideales (0-20)</p>
                
                {categories.map(({ key, label, icon: Icon }) => (
                  <Controller
                    key={key}
                    name={`build.${key as any}`}
                    control={form.control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {label}: <span className="font-bold text-primary">{field.value || 0}</span>
                        </Label>
                        <Slider
                          value={[field.value || 0]}
                          onValueChange={(v) => field.onChange(v[0])}
                          max={20}
                          step={1}
                        />
                      </div>
                    )}
                  />
                ))}

              </div>
            </ScrollArea>
            <DialogFooter className="flex-shrink-0 pt-4 mt-4 border-t">
              <Button type="submit">Guardar Build Ideal</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
