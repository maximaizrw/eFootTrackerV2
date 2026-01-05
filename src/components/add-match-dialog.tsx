
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

const formSchema = z.object({
  formationId: z.string(),
  goalsFor: z.coerce.number().min(0, "Debe ser un número positivo."),
  goalsAgainst: z.coerce.number().min(0, "Debe ser un número positivo."),
  shotsOnGoal: z.coerce.number().min(0, "Debe ser un número positivo.").optional(),
});

export type AddMatchFormValues = z.infer<typeof formSchema>;

type AddMatchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMatch: (values: AddMatchFormValues) => void;
  initialData?: {
    formationId: string;
    formationName: string;
  };
};

export function AddMatchDialog({ open, onOpenChange, onAddMatch, initialData }: AddMatchDialogProps) {
  const form = useForm<AddMatchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      formationId: "",
      goalsFor: 0,
      goalsAgainst: 0,
      shotsOnGoal: 0,
    },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        formationId: initialData.formationId,
        goalsFor: 0,
        goalsAgainst: 0,
        shotsOnGoal: 0,
      });
    }
  }, [open, initialData, form]);

  function onSubmit(values: AddMatchFormValues) {
    onAddMatch(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir Resultado de Partido</DialogTitle>
          <DialogDescription>
            Registra el marcador para la formación "{initialData?.formationName}".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="goalsFor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goles a Favor</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="goalsAgainst"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goles en Contra</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="shotsOnGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remates al Arco</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <DialogFooter>
              <Button type="submit">Guardar Resultado</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
