
"use client";

import * as React from "react";
import type { PlayerBuild, PlayerStatsBuild, ProgressionCategory, ProgressionPoints } from "@/lib/types";
import { playerAttributes, progressionCategories } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";

type PlayerStatsEditorProps = {
  playerBuild?: PlayerBuild;
  onBuildChange: (build: PlayerBuild) => void;
};

const statGroups = {
  Attacking: ["offensiveAwareness", "ballControl", "dribbling", "tightPossession", "lowPass", "loftedPass", "finishing", "heading", "setPieceTaking", "curl"],
  Defending: ["defensiveAwareness", "defensiveEngagement", "tackling", "aggression"],
  Goalkeeping: ["gkAwareness", "gkCatching", "gkParrying", "gkReflexes", "gkReach"],
  Athleticism: ["speed", "acceleration", "kickingPower", "jump", "physicalContact", "balance", "stamina"],
};

const statLabels: Record<string, string> = {
  offensiveAwareness: "Off. Awareness", ballControl: "Ball Control", dribbling: "Dribbling",
  tightPossession: "Tight Poss.", lowPass: "Low Pass", loftedPass: "Lofted Pass",
  finishing: "Finishing", heading: "Heading", setPieceTaking: "Place Kicking", curl: "Curl",
  defensiveAwareness: "Def. Awareness", defensiveEngagement: "Def. Engagement", tackling: "Tackling",
  aggression: "Aggression", gkAwareness: "GK Awareness", gkCatching: "GK Catching",
  gkParrying: "GK Parrying", gkReflexes: "GK Reflexes", gkReach: "GK Reach", speed: "Speed",
  acceleration: "Acceleration", kickingPower: "Kicking Power", jump: "Jump",
  physicalContact: "Physical Contact", balance: "Balance", stamina: "Stamina",
};

const progressionLabels: Record<ProgressionCategory, string> = {
    shooting: "Shooting", passing: "Passing", dribbling: "Dribbling", dexterity: "Dexterity",
    lowerBodyStrength: "Lower Body Strength", aerialStrength: "Aerial Strength", defending: "Defending",
    gk1: "GK 1", gk2: "GK 2", gk3: "GK 3"
};

const pasteOrder: (keyof PlayerStatsBuild)[] = [
    "offensiveAwareness", "ballControl", "dribbling", "tightPossession", "lowPass", "loftedPass",
    "finishing", "heading", "setPieceTaking", "curl", "defensiveAwareness", "defensiveEngagement",
    "tackling", "aggression", "gkAwareness", "gkCatching", "gkParrying", "gkReflexes", "gkReach",
    "speed", "acceleration", "kickingPower", "jump", "physicalContact", "balance", "stamina"
];

export function PlayerStatsEditor({ playerBuild, onBuildChange }: PlayerStatsEditorProps) {
  const [pasteText, setPasteText] = React.useState("");
  const [internalBuild, setInternalBuild] = React.useState<PlayerBuild>(playerBuild || { stats: {}, progression: {} });

  React.useEffect(() => {
    setInternalBuild(playerBuild || { stats: {}, progression: {} });
  }, [playerBuild]);

  const handleStatChange = (stat: keyof PlayerStatsBuild, value: string) => {
    const numValue = parseInt(value, 10);
    const newStats = { ...internalBuild.stats };
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 99) {
      newStats[stat] = numValue;
    } else if (value === '') {
      delete newStats[stat];
    }
    const newBuild = { ...internalBuild, stats: newStats };
    setInternalBuild(newBuild);
    onBuildChange(newBuild);
  };
  
  const handleProgressionChange = (category: ProgressionCategory, value: string) => {
    const numValue = parseInt(value, 10);
    const newProgression = { ...internalBuild.progression };
    if (!isNaN(numValue) && numValue >= 0) {
      newProgression[category] = numValue;
    } else if (value === '') {
      delete newProgression[category];
    }
    const newBuild = { ...internalBuild, progression: newProgression };
    setInternalBuild(newBuild);
    onBuildChange(newBuild);
  };

  const handlePasteAndFill = () => {
    const lines = pasteText.trim().split(/\s+/).filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    const newStats: PlayerStatsBuild = { ...internalBuild.stats };
    
    pasteOrder.forEach((stat, index) => {
        if (index < lines.length) {
            const numValue = parseInt(lines[index], 10);
            if (!isNaN(numValue)) {
                newStats[stat] = Math.max(0, Math.min(99, numValue));
            }
        }
    });

    const newBuild = { ...internalBuild, stats: newStats };
    setInternalBuild(newBuild);
    onBuildChange(newBuild);
    setPasteText(""); // Clear after processing
  };

  return (
    <div className="flex-grow overflow-hidden flex flex-col gap-4">
        <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-semibold text-primary">Puntos de Progresión</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {progressionCategories.map(cat => (
                    <div key={cat} className="space-y-1">
                        <Label htmlFor={`prog-${cat}`}>{progressionLabels[cat]}</Label>
                        <Input
                            id={`prog-${cat}`}
                            type="number"
                            value={internalBuild?.progression?.[cat] ?? ''}
                            placeholder="0"
                            onChange={e => handleProgressionChange(cat, e.target.value)}
                            className="h-9"
                        />
                    </div>
                ))}
            </div>
        </div>
        <div>
            <Label htmlFor="quick-paste-stats">Pegado Rápido de Stats</Label>
            <div className="flex gap-2 mt-1">
                <Textarea
                    id="quick-paste-stats"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Pega las 27 estadísticas aquí (separadas por espacios o saltos de línea)..."
                    className="h-24 resize-none"
                />
                <Button type="button" onClick={handlePasteAndFill} className="self-stretch">
                    Rellenar
                </Button>
            </div>
        </div>

        <ScrollArea className="flex-grow border rounded-md p-4">
            <div className="space-y-6">
                {Object.entries(statGroups).map(([groupName, stats]) => (
                    <div key={groupName}>
                    <h3 className="text-lg font-semibold mb-2 text-primary">{groupName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {stats.map(stat => (
                        <div key={stat} className="space-y-1">
                            <Label htmlFor={stat}>{statLabels[stat]}</Label>
                            <Input
                            id={stat}
                            type="number"
                            value={internalBuild?.stats?.[stat as keyof PlayerStatsBuild] ?? ''}
                            placeholder="70"
                            onChange={e => handleStatChange(stat as keyof PlayerStatsBuild, e.target.value)}
                            className="h-9"
                            />
                        </div>
                        ))}
                    </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    </div>
  );
}
