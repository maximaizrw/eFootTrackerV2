
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { AddFormationFormValues } from "@/lib/types";
import { formationPlayStyles, FormationSlotSchema } from "@/lib/types";
import { VisualFormationEditor } from "./visual-formation-editor";
import { formationPresets } from "@/lib/formation-presets";
import { ScrollArea } from "./ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  creator: z.string().optional(),
  playStyle: z.enum(formationPlayStyles),
  slots: z.array(FormationSlotSchema).length(11, "Debe definir exactamente 11 posiciones."),
  imageUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
  secondaryImageUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
  sourceUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
});

type AddFormationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFormation: (values: AddFormationFormValues) => void;
};

const defaultSlots = formationPresets.find(p => p.name === '4-3-3')?.slots || Array(11).fill({ position: 'DC', styles: [] });

export function AddFormationDialog({ open, onOpenChange, onAddFormation }: AddFormationDialogProps) {
  const [preset, setPreset] = useState('4-3-3 (Clásico)');
  
  const form = useForm<AddFormationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      creator: "",
      playStyle: "Contraataque rápido",
      slots: defaultSlots,
      imageUrl: "",
      secondaryImageUrl: "",
      sourceUrl: "",
    },
  });
  
  const { setValue, getValues, reset } = form;

  useEffect(() => {
      const selectedPreset = formationPresets.find(p => p.name === preset);
      if (selectedPreset) {
          setValue('slots', selectedPreset.slots, { shouldValidate: true });
          if(!getValues('name')) {
            setValue('name', selectedPreset.name);
          }
      }
  }, [preset, setValue, getValues]);

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        creator: "",
        playStyle: "Contraataque rápido",
        slots: defaultSlots,
        imageUrl: "",
        secondaryImageUrl: "",
        sourceUrl: "",
      });
      setPreset('4-3-3 (Clásico)');
    }
  }, [open, reset]);

  function onSubmit(values: AddFormationFormValues) {
    onAddFormation(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Añadir Nueva Formación Táctica</DialogTitle>
          <DialogDescription>
            Elige una plantilla, ajusta las posiciones y estilos de juego en el campo visual.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-hidden flex flex-col">
            <ScrollArea className="flex-grow pr-6">
                <div className="space-y-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre de la Formación</FormLabel>
                            <FormControl>
                            <Input placeholder="Ej: 4-3-3 de Klopp" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="creator"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Creador (Opcional)</FormLabel>
                            <FormControl>
                            <Input placeholder="Ej: Zeitzler" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="playStyle"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estilo de Juego Global</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecciona un estilo de juego" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {formationPlayStyles.map((style) => (
                                <SelectItem key={style} value={style}>{style}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    </div>
                    
                    <FormItem>
                    <FormLabel>Plantilla Táctica</FormLabel>
                    <Select onValueChange={setPreset} value={preset}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecciona una plantilla base" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {formationPresets.map((p) => (
                            <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </FormItem>

                    <FormField 
                        control={form.control}
                        name="slots"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Editor Visual</FormLabel>
                                <FormControl>
                                    <VisualFormationEditor 
                                        value={field.value} 
                                        onChange={field.onChange} 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="imageUrl"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>URL Táctica Principal (Opcional)</FormLabel>
                                <FormControl>
                                <Input placeholder="https://ejemplo.com/tactica.png" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="secondaryImageUrl"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>URL Táctica Secundaria (Opcional)</FormLabel>
                                <FormControl>
                                <Input placeholder="https://ejemplo.com/tactica_sec.png" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sourceUrl"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>URL Fuente (Opcional)</FormLabel>
                                <FormControl>
                                <Input placeholder="https://youtube.com/..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="flex-shrink-0 bg-background/95 py-4 border-t -mx-6 px-6">
                <Button type="submit">Guardar Formación</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
