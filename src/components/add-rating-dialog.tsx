"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { ThumbsUp, ThumbsDown, Minus } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import type { Player, Position, PlayerStyle, League, Nationality } from "@/lib/types";
import { positions, playerStyles, leagues, nationalities } from "@/lib/types";

const formSchema = z.object({
  playerId: z.string().optional(),
  playerName: z.string().min(2),
  nationality: z.enum(nationalities),
  cardName: z.string().min(2),
  position: z.enum(positions),
  style: z.enum(playerStyles),
  league: z.enum(leagues).optional(),
  rating: z.number().min(1).max(10),
  liked: z.boolean().nullable().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

type AddRatingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddRating: (values: FormValues) => void;
  players: Player[];
  initialData?: Partial<FormValues>;
};

export function AddRatingDialog({ open, onOpenChange, onAddRating, initialData }: AddRatingDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playerId: undefined,
      playerName: "",
      nationality: "Sin Nacionalidad",
      cardName: "Carta Base",
      position: "DC",
      style: "Ninguno",
      league: "Sin Liga",
      rating: 5,
      liked: null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        playerId: undefined,
        playerName: "",
        nationality: "Sin Nacionalidad" as Nationality,
        cardName: "Carta Base",
        position: "DC" as Position,
        style: "Ninguno" as PlayerStyle,
        league: "Sin Liga" as League,
        rating: 5,
        liked: null,
        ...initialData,
      });
    }
  }, [open, initialData, form]);

  function onSubmit(values: FormValues) {
    onAddRating(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Añadir Valoración</DialogTitle>
          {initialData?.playerName && (
            <DialogDescription>
              {initialData.playerName}
              {initialData.cardName ? ` · ${initialData.cardName}` : ""}
              {initialData.position ? ` · ${initialData.position}` : ""}
            </DialogDescription>
          )}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Valoración</FormLabel>
                    <span className="text-2xl font-bold">{field.value.toFixed(1)}</span>
                  </div>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={0.5}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="liked"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Cómo fue el partido?</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={field.value === true ? "default" : "outline"}
                        className={field.value === true ? "flex-1 bg-green-600 hover:bg-green-700 text-white" : "flex-1"}
                        onClick={() => field.onChange(field.value === true ? null : true)}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" /> Me gustó
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === null ? "secondary" : "outline"}
                        className="flex-1"
                        onClick={() => field.onChange(null)}
                      >
                        <Minus className="h-4 w-4 mr-1" /> Neutral
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === false ? "default" : "outline"}
                        className={field.value === false ? "flex-1 bg-red-600 hover:bg-red-700 text-white" : "flex-1"}
                        onClick={() => field.onChange(field.value === false ? null : false)}
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" /> No me gustó
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="w-full">Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
