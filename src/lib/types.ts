
import type { Player as PlayerType, PlayerCard as PlayerCardType, Position as PositionType } from './types';
import * as z from "zod";

export const playerStyles = ['Ninguno', 'Cazagoles', 'Señuelo', 'Hombre de área', 'Hombre objetivo', 'Creador de juego', 'El destructor', 'Portero defensivo', 'Portero ofensivo', 'Atacante extra', 'Lateral defensivo', 'Lateral Ofensivo', 'Lateral finalizador', 'Omnipresente', 'Medio escudo', 'Organizador', 'Jugador de huecos', 'Especialista en centros', 'Extremo móvil', 'Creador de jugadas', 'Diez Clasico', 'Segundo delantero', 'Extremo prolífico'] as const;
export type PlayerStyle = typeof playerStyles[number];

export const positions = ['PT', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MDI', 'MDD', 'MO', 'EXI', 'EXD', 'SD', 'DC'] as const;
export type Position = typeof positions[number];

export const leagues = ['Sin Liga', 'Liga Española', 'English League', 'Italian League', 'Ligue 1', 'Bundesliga', 'Liga Portuguesa', 'Dutch League', 'Internacional', 'J.League', 'American League'] as const;
export type League = typeof leagues[number];

export const nationalities = [
    'Sin Nacionalidad', 'Argentina', 'Brasil', 'Francia', 'Alemania', 'Inglaterra',
    'España', 'Italia', 'Países Bajos', 'Portugal', 'Bélgica', 'Uruguay',
    'Colombia', 'Croacia', 'Japón', 'Corea del Sur', 'Nigeria', 'Senegal',
    'Marruecos', 'México', 'EE. UU.', 'Chile', 'Turquía', 'Polonia', 'Suecia',
    'Noruega', 'Dinamarca', 'Suiza', 'Austria', 'Serbia', 'Costa de Marfil',
    'Ghana', 'Egipto', 'Camerún', 'República Checa', 'Escocia', 'Irlanda',
    'Gales', 'Rumanía', 'Rusia'
] as const;
export type Nationality = typeof nationalities[number];


export const trainingAttributes = [
    'shooting', 'passing', 'dribbling', 'dexterity', 
    'lower_body_strength', 'aerial_strength', 'defending', 
    'gk_1', 'gk_2', 'gk_3'
] as const;
export type TrainingAttribute = typeof trainingAttributes[number];

export type TrainingBuild = {
    [key in TrainingAttribute]?: number;
};

export type PositionGroup = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';

export type PlayerCard = {
  id: string;
  name: string; // e.g., "Highlight", "Player of the Week"
  style: PlayerStyle;
  league?: League;
  imageUrl?: string;
  ratingsByPosition: { [key in Position]?: number[] };
  trainingBuilds?: { [key in Position]?: TrainingBuild };
};

export type Player = {
  id: string;
  name: string;
  nationality: Nationality;
  cards: PlayerCard[];
};

export type AddRatingFormValues = {
    playerId?: string;
    playerName: string;
    nationality: Nationality;
    cardName: string;
    position: Position;
    style: PlayerStyle;
    league?: League;
    rating: number;
}

export type EditCardFormValues = {
    playerId: string;
    cardId: string;
    currentCardName: string;
    currentStyle: PlayerStyle;
    league?: League;
    imageUrl?: string;
};

export type EditPlayerFormValues = {
    playerId: string;
    currentPlayerName: string;
    nationality: Nationality;
};

export type PlayersByPosition = {
  [key in Position]?: number;
};

export type Formation = {
  [key in Position]?: number;
};

export type IdealTeamPlayer = {
  player: Player;
  card: PlayerCard;
  position: Position;
  average: number;
  performance: PlayerPerformance;
};

export type IdealTeamSlot = {
  starter: IdealTeamPlayer | null;
  substitute: IdealTeamPlayer | null;
}

// --- Tipos para Formaciones ---

export const formationPlayStyles = [
  'Contraataque rápido', 
  'Contraataque largo', 
  'Por las bandas', 
  'Balones largos', 
  'Posesión'
] as const;
export type FormationPlayStyle = typeof formationPlayStyles[number];

export type MatchResult = {
  id: string;
  goalsFor: number;
  goalsAgainst: number;
  date: string; // ISO 8601 string
};

export const FormationSlotSchema = z.object({
  position: z.enum(positions),
  styles: z.array(z.enum(playerStyles)).optional().default([]),
  top: z.number().optional(),
  left: z.number().optional(),
});

export type FormationSlot = z.infer<typeof FormationSlotSchema>;

export type FormationStats = {
  id: string;
  name: string;
  creator?: string;
  playStyle: FormationPlayStyle;
  slots: FormationSlot[];
  imageUrl?: string;
  secondaryImageUrl?: string;
  sourceUrl?: string;
  matches: MatchResult[];
};

export type AddFormationFormValues = {
  name: string;
  creator?: string;
  playStyle: FormationPlayStyle;
  slots: FormationSlot[];
  imageUrl?: string;
  secondaryImageUrl?: string;
  sourceUrl?: string;
};

export type EditFormationFormValues = {
  id: string;
  name: string;
  creator?: string;
  playStyle: FormationPlayStyle;
  slots: FormationSlot[];
  imageUrl?: string;
  secondaryImageUrl?: string;
  sourceUrl?: string;
};


export type AddMatchFormValues = {
  formationId: string;
  goalsFor: number;
  goalsAgainst: number;
}

// --- Tipos para componentes refactorizados

export type PlayerStats = {
    average: number;
    matches: number;
    stdDev: number;
};

export type PlayerPerformance = {
    stats: PlayerStats;
    isHotStreak: boolean;
    isConsistent: boolean;
    isPromising: boolean;
    isVersatile: boolean;
};

export type FlatPlayer = {
  player: PlayerType;
  card: PlayerCardType;
  ratingsForPos: number[];
  performance: PlayerPerformance;
  hasTrainingBuild: boolean;
};
