"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { ThumbsUp, ThumbsDown, Minus, Star, Dumbbell } from "lucide-react";
import { isSpecialCard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
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
  // trained position context (passed via initialData, not rendered as inputs)
  cardPositionCount: z.number().optional(),
  currentTrainedPosition: z.enum(positions).nullable().optional(),
  trainedPosition: z.enum(positions).nullable().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

type AddRatingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddRating: (values: FormValues) => void;
  players: Player[];
  initialData?: Partial<FormValues>;
};

function getRatingColor(rating: number): string {
  if (rating >= 8) return "text-emerald-500";
  if (rating >= 6) return "text-yellow-500";
  if (rating >= 4) return "text-orange-500";
  return "text-red-500";
}

function getRatingLabel(rating: number): string {
  if (rating >= 9) return "Sobresaliente";
  if (rating >= 8) return "Excelente";
  if (rating >= 7) return "Muy bueno";
  if (rating >= 6) return "Bueno";
  if (rating >= 5) return "Regular";
  if (rating >= 4) return "Flojo";
  if (rating >= 3) return "Malo";
  return "Pésimo";
}

function getRatingBg(rating: number): string {
  if (rating >= 8) return "bg-emerald-500/10 border-emerald-500/30";
  if (rating >= 6) return "bg-yellow-500/10 border-yellow-500/30";
  if (rating >= 4) return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
}

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
      const base = {
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
      };
      // Pre-select trained position if this position is already the trained one
      const merged = {
        ...base,
        trainedPosition: base.currentTrainedPosition === base.position ? base.position : null,
      };
      form.reset(merged);
    }
  }, [open, initialData, form]);

  function onSubmit(values: FormValues) {
    onAddRating(values);
    onOpenChange(false);
  }

  const rating = form.watch("rating");
  const cardName = form.watch("cardName");
  const position = form.watch("position");
  const cardPositionCount = form.watch("cardPositionCount");
  const trainedPosition = form.watch("trainedPosition");

  const showTrainedToggle = useMemo(
    () => (cardPositionCount ?? 0) > 1 && !isSpecialCard(cardName ?? ""),
    [cardPositionCount, cardName]
  );
  const isCurrentlyTrained = trainedPosition === position;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="bg-primary/5 border-b px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold truncate">
                  {initialData?.playerName || "Jugador"}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {initialData?.position && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {initialData.position}
                    </span>
                  )}
                  {initialData?.cardName && (
                    <span className="text-xs text-muted-foreground">
                      {initialData.cardName}
                    </span>
                  )}
                </div>
              </div>
              <Star className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            </div>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-5 space-y-6">

            {/* Rating */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <div className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${getRatingBg(field.value)}`}>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valoración</p>
                      <p className={`text-4xl font-black mt-0.5 leading-none ${getRatingColor(field.value)}`}>
                        {field.value.toFixed(1)}
                      </p>
                      <p className={`text-xs font-semibold mt-1 ${getRatingColor(field.value)}`}>
                        {getRatingLabel(field.value)}
                      </p>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5,6,7,8,9,10].map((i) => (
                        <div
                          key={i}
                          className={`w-1.5 rounded-full transition-all ${
                            i <= Math.round(field.value)
                              ? field.value >= 8 ? "bg-emerald-500" : field.value >= 6 ? "bg-yellow-500" : field.value >= 4 ? "bg-orange-500" : "bg-red-500"
                              : "bg-border"
                          }`}
                          style={{ height: `${8 + i * 2.5}px` }}
                        />
                      ))}
                    </div>
                  </div>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={0.5}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Liked */}
            <FormField
              control={form.control}
              name="liked"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">¿Cómo fue el partido?</p>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => field.onChange(field.value === true ? null : true)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-xs font-semibold transition-all ${
                          field.value === true
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                            : "border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-muted-foreground"
                        }`}
                      >
                        <ThumbsUp className="h-5 w-5" />
                        Me gustó
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange(null)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-xs font-semibold transition-all ${
                          field.value === null
                            ? "bg-secondary border-border text-foreground shadow-sm"
                            : "border-border hover:bg-secondary/60 text-muted-foreground"
                        }`}
                      >
                        <Minus className="h-5 w-5" />
                        Neutral
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange(field.value === false ? null : false)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-xs font-semibold transition-all ${
                          field.value === false
                            ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20"
                            : "border-border hover:border-red-500/50 hover:bg-red-500/5 text-muted-foreground"
                        }`}
                      >
                        <ThumbsDown className="h-5 w-5" />
                        No me gustó
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showTrainedToggle && (
              <button
                type="button"
                onClick={() => form.setValue("trainedPosition", isCurrentlyTrained ? null : position)}
                className={`w-full flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                  isCurrentlyTrained
                    ? "bg-amber-500/10 border-amber-500/50 text-amber-600"
                    : "border-border hover:border-amber-500/40 hover:bg-amber-500/5 text-muted-foreground"
                }`}
              >
                <Dumbbell className="h-4 w-4 shrink-0" />
                <span>{isCurrentlyTrained ? "Posición entrenada en el juego" : "Marcar como posición entrenada"}</span>
                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-bold ${isCurrentlyTrained ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>
                  {position}
                </span>
              </button>
            )}

            <Button type="submit" className="w-full font-semibold h-11">
              Guardar valoración
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
