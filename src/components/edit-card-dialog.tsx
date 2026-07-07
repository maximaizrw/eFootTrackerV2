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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { leagues, playerStyles, playerTiers, positions, type Position } from "@/lib/types";
import { normalizeTierPlacements } from "@/lib/utils";

const formSchema = z.object({
  playerId: z.string(),
  cardId: z.string(),
  editMode: z.enum(["full", "tierlist"]).optional(),
  position: z.enum(positions).optional(),
  currentCardName: z.string().min(2, "El nombre de la carta debe tener al menos 2 caracteres."),
  efhubUrl: z.string().optional(),
  currentStyle: z.enum(playerStyles),
  tier: z.enum(playerTiers).optional(),
  tierPlacements: z.coerce.number().int().min(0).optional(),
  league: z.enum(leagues).optional(),
  imageUrl: z.string().optional(),
  tierlistUrl: z.string().optional(),
  availableTrainingPoints: z.number().min(0, "Debe ser al menos 0.").optional(),
}).superRefine((values, ctx) => {
  if (values.tier && values.tier !== "SIN TIER" && (!values.tierPlacements || values.tierPlacements < 1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tierPlacements"],
      message: "Debe ser al menos 1 para un tier asignado.",
    });
  }
});

export type FormValues = z.infer<typeof formSchema>;

type EditCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditCard: (values: FormValues) => void;
  initialData?: FormValues;
};

export function EditCardDialog({ open, onOpenChange, onEditCard, initialData }: EditCardDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  const watchedTier = form.watch("tier") || "SIN TIER";
  const isTierlistEdit = initialData?.editMode === "tierlist";

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        ...initialData,
        editMode: initialData.editMode || "full",
        position: initialData.position,
        efhubUrl: initialData.efhubUrl || "",
        league: initialData.league || "Sin Liga",
        tierlistUrl: initialData.tierlistUrl || "",
        tier: initialData.tier || "SIN TIER",
        tierPlacements: normalizeTierPlacements(initialData.tier || "SIN TIER", initialData.tierPlacements),
        availableTrainingPoints: initialData.availableTrainingPoints ?? undefined,
      });
    }
  }, [open, initialData, form]);

  function onSubmit(values: FormValues) {
    onEditCard(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isTierlistEdit ? "Actualizar Tierlist" : "Editar Carta"}
            {initialData?.position ? ` (${initialData.position})` : ""}
          </DialogTitle>
          <DialogDescription>
            {isTierlistEdit
              ? "Actualiza el tier de esta posicion."
              : "Modifica el estilo de juego y el tier. El resto se edita desde la ficha del jugador."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isTierlistEdit && (
              <FormField
                control={form.control}
                name="currentStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estilo de Juego</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estilo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {playerStyles.map((style) => (
                          <SelectItem key={style} value={style}>{style}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {isTierlistEdit && (
              <FormField
                control={form.control}
                name="tierlistUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link de Tierlist de esta carta</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier{initialData?.position ? ` en ${initialData.position as Position}` : " de Carta"}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue(
                        "tierPlacements",
                        value === "SIN TIER" ? 0 : Math.max(1, form.getValues("tierPlacements") || 1),
                        { shouldValidate: true },
                      );
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {playerTiers.map((tier) => (
                        <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tierPlacements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placements que validan el tier</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={watchedTier === "SIN TIER" ? 0 : 1}
                      step={1}
                      disabled={watchedTier === "SIN TIER"}
                      {...field}
                      value={field.value ?? 0}
                    />
                  </FormControl>
                  <FormMessage />
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
