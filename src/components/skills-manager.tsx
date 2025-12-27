
"use client";

import * as React from "react";
import type { Skill } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Trash2, Edit, Check, X } from "lucide-react";

type SkillsManagerProps = {
  skills: Skill[];
  onAddSkill: (name: string) => Promise<void>;
  onUpdateSkill: (id: string, newName: string) => Promise<void>;
  onDeleteSkill: (id: string) => Promise<void>;
};

export function SkillsManager({ skills, onAddSkill, onUpdateSkill, onDeleteSkill }: SkillsManagerProps) {
  const [newSkillName, setNewSkillName] = React.useState("");
  const [editingSkill, setEditingSkill] = React.useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const handleAddSkill = async () => {
    if (newSkillName.trim() === "") {
      toast({ variant: "destructive", title: "Error", description: "El nombre de la habilidad no puede estar vacío." });
      return;
    }
    await onAddSkill(newSkillName.trim());
    setNewSkillName("");
  };
  
  const handleUpdateSkill = async () => {
    if (!editingSkill || editingSkill.name.trim() === "") {
        toast({ variant: "destructive", title: "Error", description: "El nombre de la habilidad no puede estar vacío." });
        return;
    }
    await onUpdateSkill(editingSkill.id, editingSkill.name.trim());
    setEditingSkill(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-accent">
          <Sparkles />
          Gestor de Habilidades
        </CardTitle>
        <CardDescription>
          Añade, edita o elimina las habilidades de los jugadores disponibles en la aplicación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex w-full max-w-sm items-center space-x-2 mb-6">
          <Input
            type="text"
            placeholder="Nueva habilidad..."
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
          />
          <Button onClick={handleAddSkill}>Añadir Habilidad</Button>
        </div>

        <div className="space-y-2">
            <h3 className="text-lg font-semibold">Habilidades Existentes</h3>
            <div className="max-h-[50vh] overflow-y-auto pr-4 space-y-2">
              {skills.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                  {editingSkill?.id === skill.id ? (
                      <Input 
                        value={editingSkill.name}
                        onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                        className="h-8"
                        autoFocus
                      />
                  ) : (
                    <p className="font-medium">{skill.name}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {editingSkill?.id === skill.id ? (
                        <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={handleUpdateSkill}>
                                <Check />
                            </Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setEditingSkill(null)}>
                                <X />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingSkill({id: skill.id, name: skill.name})}>
                                <Edit />
                            </Button>
                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => onDeleteSkill(skill.id)}>
                                <Trash2 />
                            </Button>
                        </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {skills.length === 0 && (
                <p className="text-muted-foreground text-center p-4">No hay habilidades definidas.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
