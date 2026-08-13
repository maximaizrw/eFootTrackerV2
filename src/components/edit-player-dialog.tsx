
"use client";

import { useEffect } from "react";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { nationalities } from "@/lib/types";
import { Switch } from "./ui/switch";

const formSchema = z.object({
  playerId: z.string().min(1, "Se requiere el ID del jugador."),
  currentPlayerName: z.string().min(2, "El nombre del jugador debe tener al menos 2 caracteres."),
  nationality: z.enum(nationalities),
  permanentLiveUpdateRating: z.boolean().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

type EditPlayerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditPlayer: (values: FormValues) => void;
  initialData?: Partial<FormValues>;
};

export function EditPlayerDialog({ open, onOpenChange, onEditPlayer, initialData }: EditPlayerDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        playerId: '',
        currentPlayerName: '',
        nationality: 'Sin Nacionalidad',
        permanentLiveUpdateRating: false,
    }
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        ...initialData,
        playerId: initialData.playerId || '',
        currentPlayerName: initialData.currentPlayerName || '',
        nationality: initialData.nationality || 'Sin Nacionalidad',
        permanentLiveUpdateRating: initialData.permanentLiveUpdateRating || false,
      });
    }
  }, [open, initialData, form]);

  function onSubmit(values: FormValues) {
    onEditPlayer(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Jugador</DialogTitle>
          <DialogDescription>
            Modifica los detalles del jugador. Estos cambios se aplicarán a todas sus cartas.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPlayerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Jugador</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: L. Messi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nationality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nacionalidad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una nacionalidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {nationalities.map((nat) => (
                        <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="permanentLiveUpdateRating"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Letra Permanente</FormLabel>
                    <FormDescription>
                      Si se activa, la letra de este jugador no se reiniciará.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
