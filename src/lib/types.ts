
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
  'Portero': ['PT'] as const,
  'Defensa Central': ['DFC'] as const,
  'Laterales': ['LI', 'LD'] as const,
  'Pivote Defensivo': ['MCD'] as const,
  'Mediocentro': ['MC'] as const,
  'Interiores': ['MDI', 'MDD'] as const,
  'Mediapunta': ['MO'] as const,
  'Extremos': ['EXI', 'EXD'] as const,
  'Segundo Delantero': ['SD'] as const,
  'Delantero Centro': ['DC'] as const,
} as const;

export type PositionGroupName = keyof typeof positionGroups;

export type DbIdealBuilds = {
    [key in PositionGroupName]?: {
        [key in PlayerStyle]?: PlayerStatsBuild;
    };
};

export type IdealBuilds = {
    [key in Position]: {
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
  assignedPosition: Position | Position[]; // The slot they were assigned to in the formation
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
  position: z.union([z.enum(positions), z.array(z.enum(positions))]),
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

// --- Funciones de utilidad movidas aquí para evitar importaciones circulares ---

export function getAvailableStylesForPosition(position: Position, includeNinguno = false): PlayerStyle[] {
    const baseStyles: PlayerStyle[] = includeNinguno ? ['Ninguno'] : [];

    const gkStyles: PlayerStyle[] = ['Portero defensivo', 'Portero ofensivo'];
    const fbStyles: PlayerStyle[] = ['Lateral defensivo', 'Lateral ofensivo', 'Lateral finalizador'];
    const dfcStyles: PlayerStyle[] = ['El destructor', 'Creador de juego', 'Atacante extra'];
    const mcdStyles: PlayerStyle[] = ['Omnipresente', 'Medio escudo', 'Organizador', 'El destructor'];
    const mcStyles: PlayerStyle[] = ['Jugador de huecos', 'Omnipresente', 'Medio escudo', 'El destructor', 'Organizador', 'Creador de jugadas'];
    const mdiMddStyles: PlayerStyle[] = ['Omnipresente', 'Jugador de huecos', 'Especialista en centros', 'Extremo móvil', 'Creador de jugadas'];
    const moStyles: PlayerStyle[] = ['Creador de jugadas', 'Diez Clasico', 'Jugador de huecos', 'Señuelo'];
    const sdStyles: PlayerStyle[] = ['Segundo delantero', 'Creador de jugadas', 'Diez Clasico', 'Jugador de huecos', 'Señuelo'];
    const wingerStyles: PlayerStyle[] = ['Creador de jugadas', 'Extremo prolífico', 'Extremo móvil', 'Especialista en centros'];
    const dcStyles: PlayerStyle[] = ['Cazagoles', 'Hombre de área', 'Señuelo', 'Hombre objetivo', 'Segundo delantero'];

    switch (position) {
        case 'PT': return [...baseStyles, ...gkStyles];
        case 'LI': case 'LD': return [...baseStyles, ...fbStyles];
        case 'DFC': return [...baseStyles, ...dfcStyles];
        case 'MCD': return [...baseStyles, ...mcdStyles];
        case 'MC': return [...baseStyles, ...mcStyles];
        case 'MDI': case 'MDD': return [...baseStyles, ...mdiMddStyles];
        case 'MO': return [...baseStyles, ...moStyles];
        case 'SD': return [...baseStyles, ...sdStyles];
        case 'EXI': case 'EXD': return [...baseStyles, ...wingerStyles];
        case 'DC': return [...baseStyles, ...dcStyles];
        default: return baseStyles;
    }
}
