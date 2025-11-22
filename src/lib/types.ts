
import * as z from "zod";

export const playerStyles = ['Ninguno', 'Cazagoles', 'Hombre de área', 'Señuelo', 'Hombre objetivo', 'Creador de juego', 'El destructor', 'Portero defensivo', 'Portero ofensivo', 'Atacante extra', 'Lateral defensivo', 'Lateral ofensivo', 'Lateral finalizador', 'Omnipresente', 'Medio escudo', 'Organizador', 'Jugador de huecos', 'Especialista en centros', 'Extremo móvil', 'Creador de jugadas', 'Diez Clasico', 'Segundo delantero', 'Extremo prolífico'] as const;
export type PlayerStyle = typeof playerStyles[number];

export const positions = ['PT', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MDI', 'MDD', 'MO', 'EXI', 'EXD', 'SD', 'DC'] as const;
export type Position = typeof positions[number];

export const leagues = [
    "Sin Liga", "Premier League", "Ligue 1 Uber Eats", "Serie A TIM", "LaLiga EA SPORTS",
    "Eredivisie", "Liga Portugal Betclic", "Credit Suisse Super League", "Super Lig",
    "Scottish Premiership", "3F Superliga", "Jupiler Pro League", "Championship",
    "Serie BKT", "Ligue 2 BKT", "LaLiga Hypermotion", "BELGIAN LEAGUE",
    "SWISS LEAGUE", "BRASILEIRAO ASSAI", "BRASILEIRAO SERIE B",
    "Liga BBVA MX", "Major League Soccer", "Liga Profesional de Futbol",
    "Campeonato PlanVital", "K LEAGUE 1", "Hilux Revo Thai League 1",
    "J. League Div.1", 'Internacional'
] as const;
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

export const playerAttributes = [
    "offensiveAwareness", "ballControl", "dribbling", "tightPossession",
    "lowPass", "loftedPass", "finishing", "heading", "setPieceTaking", "curl",
    "speed", "acceleration", "kickingPower", "jump", "physicalContact",
    "balance", "stamina", "defensiveAwareness", "defensiveEngagement", "tackling", "aggression",
    "gkAwareness", "gkCatching", "gkParrying",
    "gkReflexes", "gkReach"
] as const;
export type PlayerAttribute = typeof playerAttributes[number];

export type PlayerStatsBuild = {
  [key in PlayerAttribute]?: number;
};

export const progressionCategories = [
    "shooting", "passing", "dribbling", "dexterity",
    "lowerBodyStrength", "aerialStrength", "defending",
    "gk1", "gk2", "gk3"
] as const;
export type ProgressionCategory = typeof progressionCategories[number];

export type ProgressionPoints = {
  [key in ProgressionCategory]?: number;
};

export type PlayerBuild = {
  progression?: ProgressionPoints;
  stats: PlayerStatsBuild;
  updatedAt?: string;
};

export const positionGroups = {
  'Portero': 'PT',
  'Defensa Central': 'DFC',
  'Lateral Izquierdo': 'LI',
  'Lateral Derecho': 'LD',
  'Pivote Defensivo': 'MCD',
  'Mediocentro': 'MC',
  'Interior Izquierdo': 'MDI',
  'Interior Derecho': 'MDD',
  'Mediapunta': 'MO',
  'Extremo Izquierdo': 'EXI',
  'Extremo Derecho': 'EXD',
  'Segundo Delantero': 'SD',
  'Delantero Centro': 'DC',
} as const;

export const positionLabels: Record<Position, string> = {
    PT: 'Portero',
    DFC: 'Defensa Central',
    LI: 'Lateral Izquierdo',
    LD: 'Lateral Derecho',
    MCD: 'Pivote Defensivo',
    MC: 'Mediocentro',
    MDI: 'Interior Izquierdo',
    MDD: 'Interior Derecho',
    MO: 'Mediapunta',
    EXI: 'Extremo Izquierdo',
    EXD: 'Extremo Derecho',
    SD: 'Segundo Delantero',
    DC: 'Delantero Centro',
};


export type PositionLabel = typeof positionLabels[Position];


// Data model stored in Firestore for ideal builds.
// The key is now the PositionLabel, e.g., "Lateral Izquierdo"
export type DbIdealBuilds = {
    [key in PositionLabel]?: {
        [key in PlayerStyle]?: PlayerStatsBuild;
    };
};

export type PlayerCard = {
  id: string;
  name: string; // e.g., "Highlight", "Player of the Week"
  style: PlayerStyle;
  league?: League;
  imageUrl?: string;
  ratingsByPosition: { [key in Position]?: number[] };
  selectablePositions?: { [key in Position]?: boolean };
  build?: PlayerBuild;
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
  position: Position; // The actual position of the player's rating
  assignedPosition: Position; // The slot they were assigned to in the formation
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

export type PlayerRatingStats = {
    average: number;
    matches: number;
    stdDev: number;
};

export type PlayerPerformance = {
    stats: PlayerRatingStats;
    isHotStreak: boolean;
    isConsistent: boolean;
    isPromising: boolean;
    isVersatile: boolean;
};

export type FlatPlayer = {
  player: Player;
  card: PlayerCard;
  ratingsForPos: number[];
  performance: PlayerPerformance;
  affinityScore: number;
  generalScore: number;
  position: Position;
};

export function getAvailableStylesForPosition(position: Position, includeNone: boolean = false): PlayerStyle[] {
    const baseStyles: PlayerStyle[] = includeNone ? ['Ninguno'] : [];

    switch (position) {
        case 'PT':
            return [...baseStyles, 'Portero defensivo', 'Portero ofensivo'];
        case 'DFC':
            return [...baseStyles, 'El destructor', 'Atacante extra', 'Creación'];
        case 'LI':
        case 'LD':
            return [...baseStyles, 'Lateral defensivo', 'Lateral ofensivo', 'Lateral finalizador', 'Especialista en centros'];
        case 'MCD':
            return [...baseStyles, 'El destructor', 'Medio escudo', 'Omnipresente', 'Atacante extra', 'Organizador'];
        case 'MC':
            return [...baseStyles, 'Jugador de huecos', 'Omnipresente', 'Creador de jugadas', 'Organizador', 'El destructor', 'Medio escudo'];
        case 'MDI':
        case 'MDD':
            return [...baseStyles, 'Omnipresente', 'Especialista en centros', 'Creador de jugadas', 'Jugador de huecos'];
        case 'MO':
            return [...baseStyles, 'Jugador de huecos', 'Creador de jugadas', 'Diez Clasico', 'Extremo móvil'];
        case 'EXI':
        case 'EXD':
            return [...baseStyles, 'Extremo móvil', 'Extremo prolífico', 'Especialista en centros', 'Creador de jugadas'];
        case 'SD':
            return [...baseStyles, 'Cazagoles', 'Jugador de huecos', 'Señuelo', 'Hombre objetivo', 'Diez Clasico', 'Extremo móvil'];
        case 'DC':
            return [...baseStyles, 'Cazagoles', 'Hombre de área', 'Señuelo', 'Hombre objetivo', 'Jugador de huecos', 'Extremo móvil'];
        default:
            return playerStyles;
    }
}
