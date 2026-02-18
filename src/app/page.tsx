
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogDescription,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

import { AddRatingDialog, type FormValues as AddRatingFormValues } from '@/components/add-rating-dialog';
import { EditCardDialog, type FormValues as EditCardFormValues } from '@/components/edit-card-dialog';
import { EditPlayerDialog, type FormValues as EditPlayerFormValues } from '@/components/edit-player-dialog';
import { EditStatsDialog } from '@/components/edit-stats-dialog';
import { AddFormationDialog, type AddFormationFormValues } from '@/components/add-formation-dialog';
import { EditFormationDialog, type EditFormationFormValues } from '@/components/edit-formation-dialog';
import { AddMatchDialog, type AddMatchFormValues } from '@/components/add-match-dialog';
import { PlayerDetailDialog } from '@/components/player-detail-dialog';
import { PlayerBuildViewer } from '@/components/player-build-viewer';
import { IdealBuildEditor } from '@/components/ideal-build-editor';
import { PlayerTester } from '@/components/player-tester';

import { FormationsDisplay } from '@/components/formations-display';
import { IdealTeamDisplay } from '@/components/ideal-team-display';
import { IdealTeamSetup } from '@/components/ideal-team-setup';
import { PlayerTable } from '@/components/player-table';
import { PositionIcon } from '@/components/position-icon';
import { NationalityDistribution } from '@/components/nationality-distribution';

import { usePlayers } from '@/hooks/usePlayers';
import { useFormations } from '@/hooks/useFormations';
import { useIdealBuilds } from '@/hooks/useIdealBuilds';
import { useToast } from "@/hooks/use-toast";

import type { Player, PlayerCard as PlayerCardType, FormationStats, IdealTeamSlot, FlatPlayer, Position, PlayerPerformance, League, Nationality, PlayerBuild, IdealTeamPlayer, PlayerAttributeStats, IdealBuild, IdealBuildType } from '@/lib/types';
import { positions, leagues, nationalities, formationPlayStyles } from '@/lib/types';
import { PlusCircle, Star, Download, Trophy, RotateCcw, Globe, Dna, RefreshCw, Beaker, Wand2, Copy, Trash2, CopyPlus } from 'lucide-react';
import { normalizeText } from '@/lib/utils';
import { generateIdealTeam } from '@/lib/team-generator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 10;

export default function Home() {
  const {
    idealBuilds,
    loading: idealBuildsLoading,
    error: idealBuildsError,
    saveIdealBuild,
    deleteIdealBuild,
  } = useIdealBuilds();

  // ONLY Contraataque largo is supported as the base tactic
  const idealBuildType: IdealBuildType = 'Contraataque largo';

  const [sortBy, setSortBy] = useState<'average' | 'general'>('general');

  const { 
    players, 
    flatPlayers,
    loading: playersLoading, 
    error: playersError,
    addRating,
    editCard,
    editPlayer,
    deleteRating,
    downloadBackup: downloadPlayersBackup,
    savePlayerBuild,
    saveAttributeStats,
    deletePositionRatings,
    recalculateAllAffinities,
    suggestAllBuilds,
    updateLiveUpdateRating,
    resetAllLiveUpdateRatings,
  } = usePlayers(idealBuilds, idealBuildType, sortBy);

  const {
    formations,
    loading: formationsLoading,
    error: formationsError,
    addFormation,
    editFormation,
    addMatchResult,
    deleteFormation: deleteFormationFromDb,
    deleteMatchResult,
    downloadBackup: downloadFormationsBackup,
  } = useFormations();
  

  const allPlayers = players || [];

  const [activeTab, setActiveTab] = useState<string>('DC');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddRatingDialogOpen, setAddRatingDialogOpen] = useState(false);
  const [isAddFormationDialogOpen, setAddFormationDialogOpen] = useState(false);
  const [isEditFormationDialogOpen, setEditFormationDialogOpen] = useState(false);
  const [isAddMatchDialogOpen, setAddMatchDialogOpen] = useState(false);
  const [isEditCardDialogOpen, setEditCardDialogOpen] = useState(false);
  const [isEditPlayerDialogOpen, setEditPlayerDialogOpen] = useState(false);
  const [isEditStatsDialogOpen, setEditStatsDialogOpen] = useState(false);
  const [isPlayerDetailDialogOpen, setPlayerDetailDialogOpen] = useState(false);
  const [isImageViewerOpen, setImageViewerOpen] = useState(false);
  const [isIdealBuildEditorOpen, setIsIdealBuildEditorOpen] = useState(false);
  const [editingIdealBuild, setEditingIdealBuild] = useState<IdealBuild | undefined>(undefined);

  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [viewingImageName, setViewingImageName] = useState<string | null>(null);
  const [addDialogInitialData, setAddDialogInitialData] = useState<Partial<AddRatingFormValues> | undefined>(undefined);
  const [addMatchInitialData, setAddMatchInitialData] = useState<{ formationId: string; formationName: string } | undefined>(undefined);
  const [editCardDialogInitialData, setEditCardDialogInitialData] = useState<EditCardFormValues | undefined>(undefined);
  const [editPlayerDialogInitialData, setEditPlayerDialogInitialData] = useState<Partial<EditPlayerFormValues> | undefined>(undefined);
  const [editFormationDialogInitialData, setEditFormationDialogInitialData] = useState<FormationStats | undefined>(undefined);
  const [editStatsDialogInitialData, setEditStatsDialogInitialData] = useState<{ player: Player, card: PlayerCardType } | undefined>(undefined);
  const [selectedFlatPlayer, setSelectedFlatPlayer] = useState<FlatPlayer | null>(null);
  const [isBuildViewerOpen, setIsBuildViewerOpen] = useState(false);
  const [viewingPlayerBuild, setViewingPlayerBuild] = useState<IdealTeamPlayer | null>(null);
  
  const [selectedFormationId, setSelectedFormationId] = useState<string | undefined>(undefined);
  const [selectedLeague, setSelectedLeague] = useState<League | 'all'>('all');
  const [selectedNationality, setSelectedNationality] = useState<Nationality | 'all'>('all');
  const [idealTeam, setIdealTeam] = useState<IdealTeamSlot[]>([]);
  const [discardedCardIds, setDiscardedCardIds] = useState<Set<string>>(new Set());
  const [isFlexibleLaterals, setFlexibleLaterals] = useState(false);
  const [isFlexibleWingers, setFlexibleWingers] = useState(false);
  
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [cardFilter, setCardFilter] = useState<string>('all');
  const [pagination, setPagination] = useState<Record<string, number>>({});
  
  const { toast } = useToast();

  const selectedFormation = useMemo(() => {
    return formations.find(f => f.id === selectedFormationId);
  }, [formations, selectedFormationId]);
  
  useEffect(() => {
    if (!selectedFormationId && formations && formations.length > 0) {
      setSelectedFormationId(formations[0].id);
    }
  }, [formations, selectedFormationId]);

  const handleGenerateTeam = useCallback(() => {
    if (!players || !selectedFormationId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor, selecciona jugadores y una formación primero.',
      });
      return;
    }

    const formation = formations.find(f => f.id === selectedFormationId);
    if (!formation || !formation.slots) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La formación seleccionada no es válida.',
      });
      return;
    }
    
    const newTeam = players.length > 0 ? generateIdealTeam(players, formation, idealBuilds, discardedCardIds, selectedLeague, selectedNationality, sortBy, isFlexibleLaterals, isFlexibleWingers, idealBuildType) : [];

    setIdealTeam(newTeam);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    toast({
      title: "11 Ideal Generado",
      description: `Se ha generado un equipo para la formación "${formation.name}" usando la build de "${idealBuildType}".`,
    });
  }, [players, selectedFormationId, formations, idealBuilds, discardedCardIds, selectedLeague, selectedNationality, sortBy, isFlexibleLaterals, isFlexibleWingers, idealBuildType, toast]);

  useEffect(() => {
    if (idealTeam.length > 0) {
      handleGenerateTeam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discardedCardIds]);


  const handleOpenAddRating = useCallback((initialData?: Partial<AddRatingFormValues>) => {
    setAddDialogInitialData(initialData);
    setAddRatingDialogOpen(true);
  }, []);
  
  const handleOpenEditCard = useCallback((player: Player, card: PlayerCardType) => {
    setEditCardDialogInitialData({
        playerId: player.id,
        cardId: card.id,
        currentCardName: card.name,
        currentStyle: card.style,
        league: card.league || 'Sin Liga',
        imageUrl: card.imageUrl || '',
    });
    setEditCardDialogOpen(true);
  }, []);

  const handleOpenEditPlayer = useCallback((player: Player) => {
    setEditPlayerDialogInitialData({
      playerId: player.id,
      currentPlayerName: player.name,
      nationality: player.nationality || 'Sin Nacionalidad',
      permanentLiveUpdateRating: player.permanentLiveUpdateRating,
    });
    setEditPlayerDialogOpen(true);
  }, []);

  const handleOpenEditStats = useCallback((player: Player, card: PlayerCardType) => {
    setEditStatsDialogInitialData({ player, card });
    setEditStatsDialogOpen(true);
  }, []);

  const handleOpenPlayerDetail = useCallback((flatPlayer: FlatPlayer) => {
    setSelectedFlatPlayer(flatPlayer);
    setPlayerDetailDialogOpen(true);
  }, []);
  
  const handleOpenEditFormation = useCallback((formation: FormationStats) => {
    setEditFormationDialogInitialData(formation);
    setEditFormationDialogOpen(true);
  }, []);

  const handleViewImage = useCallback((url: string, name: string) => {
    setViewingImageUrl(url);
    setViewingImageName(name);
    setImageViewerOpen(true);
  }, []);

  const handleOpenAddMatch = useCallback((formationId: string, formationName: string) => {
    setAddMatchInitialData({ formationId, formationName });
    setAddMatchDialogOpen(true);
  }, []);

  
  const handleFormationSelectionChange = useCallback((id: string) => {
    setSelectedFormationId(id);
  }, []);

  const handleLeagueChange = useCallback((league: League | 'all') => {
    setSelectedLeague(league);
  }, []);

  const handleNationalityChange = useCallback((nationality: Nationality | 'all') => {
    setSelectedNationality(nationality);
  }, []);
  
  const handleGoToIdealTeam = useCallback((formationId: string) => {
    setActiveTab('ideal-11');
    handleFormationSelectionChange(formationId);
  }, [handleFormationSelectionChange]);

  const handleDiscardPlayer = useCallback((cardId: string) => {
    setDiscardedCardIds(prev => {
        const newSet = new Set(prev);
        newSet.add(cardId);
        return newSet;
    });
  }, []);
  
  const handleResetDiscards = useCallback(() => {
    setDiscardedCardIds(new Set());
    toast({
        title: "Lista de Descartados Reiniciada",
        description: "Se volverán a considerar todos los jugadores.",
    });
  }, [toast]);
  
  const handleDownloadBackup = useCallback(async () => {
    const playersData = await downloadPlayersBackup();
    const formationsData = await downloadFormationsBackup();
    
    if (!playersData || !formationsData) {
       toast({
        variant: "destructive",
        title: "Error en la Descarga",
        description: "No se pudo generar el archivo de backup.",
      });
      return;
    }
    
    const backupData = {
      players: playersData,
      formations: formationsData,
    };

    const jsonData = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eFootTracker_backup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Descarga Iniciada",
      description: "El backup de la base de datos se está degradando.",
    });
  }, [downloadPlayersBackup, downloadFormationsBackup, toast]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setSearchTerm('');
    setStyleFilter('all');
    setCardFilter('all');
  }, []);

  const handleViewPlayerBuild = useCallback((player: IdealTeamPlayer) => {
    setViewingPlayerBuild(player);
    setIsBuildViewerOpen(true);
  }, []);

  const handleOpenIdealBuildEditor = useCallback((build?: IdealBuild) => {
    if (!build) {
        setEditingIdealBuild({
            playStyle: idealBuildType,
            position: 'DC',
            style: 'Cazagoles',
            build: {},
        } as IdealBuild);
    } else {
        setEditingIdealBuild(build);
    }
    setIsIdealBuildEditorOpen(true);
  }, [idealBuildType]);

  const handleDuplicateIdealBuild = useCallback((build: IdealBuild) => {
    // We pass the build data but without ID to indicate it's a new entry
    const duplicate = {
        ...build,
        id: undefined,
        // Keep the original name, but the editor will force a change because it lacks an ID
    };
    setEditingIdealBuild(duplicate);
    setIsIdealBuildEditorOpen(true);
  }, []);

  const handleCopyIdealBuild = useCallback((build: IdealBuild) => {
    const json = JSON.stringify(build.build, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      toast({
        title: "Copiado al portapapeles",
        description: `Las estadísticas de ${build.position} - ${build.style} se han copiado como JSON.`,
      });
    }).catch(err => {
      console.error('Error al copiar: ', err);
      toast({
        variant: "destructive",
        title: "Error al copiar",
        description: "No se pudo copiar al portapapeles.",
      });
    });
  }, [toast]);


  const getHeaderButtons = () => {
    const isPositionTab = positions.some(p => p === activeTab);

    return (
        <div className="flex items-center gap-2">
            {isPositionTab ? (
                <Button onClick={() => handleOpenAddRating({ position: activeTab as Position })} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Añadir Valoración</span>
                    <span className="inline sm:hidden">Valorar</span>
                </Button>
            ) : activeTab === 'formations' ? (
                <Button onClick={() => setAddFormationDialogOpen(true)} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Añadir Formación</span>
                    <span className="inline sm:hidden">Formación</span>
                </Button>
            ) : activeTab === 'ideal-builds' ? (
                <Button onClick={() => handleOpenIdealBuildEditor()} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Añadir Build Ideal</span>
                    <span className="inline sm:hidden">Build</span>
                </Button>
            ) : null}
        </div>
    );
  };
  
  const handlePageChange = useCallback((position: Position, direction: 'next' | 'prev') => {
    setPagination(prev => {
      const currentPage = prev[position] || 0;
      const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
      return { ...prev, [position]: Math.max(0, newPage) };
    });
  }, []);

  const filteredPlayersByPosition = useMemo(() => {
    const grouped: Record<string, FlatPlayer[]> = {};
    for (const pos of positions) {
        const positionPlayers = flatPlayers.filter(p => p.position === pos);
        grouped[pos] = positionPlayers.filter(({ player, card }) => {
            const searchMatch = normalizeText(player.name).includes(normalizeText(searchTerm));
            const styleMatch = styleFilter === 'all' || card.style === styleFilter;
            const cardMatch = cardFilter === 'all' || card.name === cardFilter;
            const leagueMatch = selectedLeague === 'all' || card.league === selectedLeague;
            const nationalityMatch = selectedNationality === 'all' || player.nationality === selectedNationality;
            return searchMatch && styleMatch && cardMatch && leagueMatch && nationalityMatch;
        
        }).sort((a, b) => {
          if (sortBy === 'general') {
            const generalA = a.generalScore;
            const generalB = b.generalScore;
            if (generalB !== generalA) return generalB - generalA;
          }
          
          const avgA = a.performance.stats.average;
          const avgB = b.performance.stats.average;
          if (avgB !== avgA) return avgB - avgA;
          
          const matchesA = a.performance.stats.matches;
          const matchesB = b.performance.stats.matches;
          return matchesB - matchesA;
        });
    }
    return grouped;
  }, [flatPlayers, searchTerm, styleFilter, cardFilter, selectedLeague, selectedNationality, sortBy]);

  const uniqueFiltersByPosition = useMemo(() => {
    const filters: Record<string, { uniqueStyles: string[], uniqueCardNames: string[] }> = {};
    for (const pos of positions) {
      const allPositionalStyles = new Set<string>();
      const allPositionalCards = new Set<string>();
      
      flatPlayers.filter(p => p.position === pos).forEach(p => {
        allPositionalStyles.add(p.card.style);
        allPositionalCards.add(p.card.name);
      });
      
      filters[pos] = {
        uniqueStyles: ['all', ...Array.from(allPositionalStyles)],
        uniqueCardNames: ['all', ...Array.from(allPositionalCards)],
      };
    }
    return filters;
  }, [flatPlayers]);


  const error = playersError || formationsError || idealBuildsError;
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-center p-4">
        <div className="bg-destructive/10 border border-destructive text-destructive p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-2">Error de Conexión</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (playersLoading || formationsLoading || idealBuildsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Conectando a la base de datos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
       <AddRatingDialog
        open={isAddRatingDialogOpen}
        onOpenChange={setAddRatingDialogOpen}
        onAddRating={addRating}
        players={allPlayers}
        initialData={addDialogInitialData}
      />
      <AddFormationDialog
        open={isAddFormationDialogOpen}
        onOpenChange={setAddFormationDialogOpen}
        onAddFormation={addFormation}
      />
      <EditFormationDialog
        open={isEditFormationDialogOpen}
        onOpenChange={setEditFormationDialogOpen}
        onEditFormation={editFormation}
        initialData={editFormationDialogInitialData}
      />
      <AddMatchDialog
        open={isAddMatchDialogOpen}
        onOpenChange={setAddMatchDialogOpen}
        onAddMatch={addMatchResult}
        initialData={addMatchInitialData}
      />
      <EditCardDialog
        open={isEditCardDialogOpen}
        onOpenChange={setEditCardDialogOpen}
        onEditCard={editCard}
        initialData={editCardDialogInitialData}
      />
      <EditPlayerDialog
        open={isEditPlayerDialogOpen}
        onOpenChange={setEditPlayerDialogOpen}
        onEditPlayer={editPlayer}
        initialData={editPlayerDialogInitialData}
      />
      <EditStatsDialog
        open={isEditStatsDialogOpen}
        onOpenChange={setEditStatsDialogOpen}
        onSaveStats={saveAttributeStats}
        initialData={editStatsDialogInitialData}
      />
      <PlayerDetailDialog
        open={isPlayerDetailDialogOpen}
        onOpenChange={setPlayerDetailDialogOpen}
        flatPlayer={selectedFlatPlayer}
        onSavePlayerBuild={savePlayerBuild}
        idealBuilds={idealBuilds}
        idealBuildType={idealBuildType}
        initialSortBy={sortBy}
      />
      <PlayerBuildViewer
        open={isBuildViewerOpen}
        onOpenChange={setIsBuildViewerOpen}
        player={viewingPlayerBuild}
        buildType={sortBy === 'average' ? 'average' : 'tactical'}
      />
      <IdealBuildEditor
        open={isIdealBuildEditorOpen}
        onOpenChange={setIsIdealBuildEditorOpen}
        onSave={saveIdealBuild}
        initialBuild={editingIdealBuild}
        existingBuilds={idealBuilds}
      />
      <AlertDialog open={isImageViewerOpen} onOpenChange={setImageViewerOpen}>
        <AlertDialogContent className="max-w-xl p-0">
          <AlertDialogHeader className="p-4 border-b">
            <AlertDialogTitle>{viewingImageName}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="p-4 flex justify-center items-center">
            {viewingImageUrl && (
              <Image
                src={viewingImageUrl}
                alt={viewingImageName || 'Tactic Image'}
                width={500}
                height={500}
                className="object-contain max-h-[80vh]"
              />
            )}
          </div>
          <AlertDialogFooter className="p-4 border-t">
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <header className="sticky top-0 z-10 bg-background/70 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl sm:text-3xl font-bold font-headline text-primary">
            eFootTracker
          </h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleDownloadBackup} variant="outline" size="sm">
                <Download className="mr-0 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Descargar Backup</span>
            </Button>
            {getHeaderButtons()}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <Tabs defaultValue="DC" className="w-full" onValueChange={handleTabChange} value={activeTab}>
           <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <TabsList className="inline-flex h-auto p-1">
              {positions.map((pos) => (
                <TabsTrigger key={pos} value={pos} className="py-2 px-3 text-sm">
                  <PositionIcon position={pos} className="mr-2 h-5 w-5"/>
                  {pos}
                </TabsTrigger>
              ))}
              <TabsTrigger value="formations" className="py-2 px-3 text-sm data-[state=active]:text-accent-foreground data-[state=active]:bg-accent">
                  <Trophy className="mr-2 h-5 w-5"/>
                  Formaciones
              </TabsTrigger>
              <TabsTrigger value="ideal-11" className="py-2 px-3 text-sm data-[state=active]:text-accent-foreground data-[state=active]:bg-accent">
                  <Star className="mr-2 h-5 w-5"/>
                  11 Ideal
              </TabsTrigger>
               <TabsTrigger value="nationalities" className="py-2 px-3 text-sm data-[state=active]:text-accent-foreground data-[state=active]:bg-accent">
                  <Globe className="mr-2 h-5 w-5"/>
                  Nacionalidades
              </TabsTrigger>
               <TabsTrigger value="ideal-builds" className="py-2 px-3 text-sm data-[state=active]:text-accent-foreground data-[state=active]:bg-accent">
                  <Dna className="mr-2 h-5 w-5"/>
                  Builds Ideales
              </TabsTrigger>
              <TabsTrigger value="tester" className="py-2 px-3 text-sm data-[state=active]:text-accent-foreground data-[state=active]:bg-accent">
                  <Beaker className="mr-2 h-5 w-5"/>
                  Probador
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          <TabsContent value="formations" className="mt-6">
            <FormationsDisplay
              formations={formations}
              onAddMatch={handleOpenAddMatch}
              onDeleteFormation={deleteFormationFromDb}
              onEdit={handleOpenEditFormation}
              onViewImage={handleViewImage}
              onDeleteMatchResult={deleteMatchResult}
              onGenerateIdealTeam={handleGoToIdealTeam}
            />
          </TabsContent>

          {positions.map((pos) => {
            const filteredPlayerList = filteredPlayersByPosition[pos] || [];
            
            const currentPage = pagination[pos] || 0;
            const paginatedPlayers = filteredPlayerList.slice(
              currentPage * ITEMS_PER_PAGE,
              (currentPage + 1) * ITEMS_PER_PAGE
            );
            const totalPages = Math.ceil(filteredPlayerList.length / ITEMS_PER_PAGE);
            
            const { uniqueStyles, uniqueCardNames } = uniqueFiltersByPosition[pos] || { uniqueStyles: ['all'], uniqueCardNames: ['all'] };

            return (
              <TabsContent key={pos} value={pos} className="mt-6">
                <Card>
                    <CardHeader>
                       <PlayerTable.Filters
                          searchTerm={searchTerm}
                          onSearchTermChange={setSearchTerm}
                          styleFilter={styleFilter}
                          onStyleFilterChange={setStyleFilter}
                          cardFilter={cardFilter}
                          onCardFilterChange={setCardFilter}
                          uniqueStyles={uniqueStyles}
                          uniqueCardNames={uniqueCardNames}
                          sortBy={sortBy}
                          onSortByChange={setSortBy}
                        />
                    </CardHeader>
                    <PlayerTable
                      players={paginatedPlayers}
                      position={pos}
                      onOpenAddRating={handleOpenAddRating}
                      onOpenEditCard={handleOpenEditCard}
                      onOpenEditPlayer={handleOpenEditPlayer}
                      onOpenEditStats={handleOpenEditStats}
                      onOpenPlayerDetail={handleOpenPlayerDetail}
                      onViewImage={handleViewImage}
                      onDeletePositionRatings={deletePositionRatings}
                      onDeleteRating={deleteRating}
                      onUpdateLiveUpdateRating={updateLiveUpdateRating}
                      currentIdealBuildType={idealBuildType}
                    />
                    <PlayerTable.Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={(direction) => handlePageChange(pos, direction)}
                    />
                  </Card>
              </TabsContent>
            );
          })}
          
          <TabsContent value="ideal-11" className="mt-6">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-accent">
                   <Star />
                   Generador de 11 Ideal
                 </CardTitle>
                 <CardDescription>
                   Selecciona una formación, define tus filtros y elige si ordenar por promedio o por una valoración "General" (afinidad + promedio) para crear tu equipo.
                 </CardDescription>
               </CardHeader>
               <CardContent>
                  <IdealTeamSetup 
                    formations={formations}
                    selectedFormationId={selectedFormationId}
                    onFormationChange={handleFormationSelectionChange} 
                    leagues={['all', ...leagues]}
                    selectedLeague={selectedLeague}
                    onLeagueChange={handleLeagueChange}
                    nationalities={['all', ...nationalities]}
                    selectedNationality={selectedNationality}
                    onNationalityChange={handleNationalityChange}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    isFlexibleLaterals={isFlexibleLaterals}
                    onFlexibleLateralsChange={setFlexibleLaterals}
                    isFlexibleWingers={isFlexibleWingers}
                    onFlexibleWingersChange={setFlexibleWingers}
                  />
                  <div className="flex flex-wrap items-center gap-4 mt-6">
                    <Button onClick={handleGenerateTeam} disabled={!selectedFormationId}>
                      <Star className="mr-2 h-4 w-4" />
                      Generar 11 Ideal
                    </Button>
                    <Button
                        onClick={handleResetDiscards}
                        variant="outline"
                        disabled={discardedCardIds.size === 0}
                        >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reiniciar Descartados ({discardedCardIds.size})
                    </Button>
                     <Button
                        onClick={() => recalculateAllAffinities()}
                        variant="secondary"
                        >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Actualizar Afinidades
                    </Button>
                    <Button
                        onClick={() => suggestAllBuilds()}
                        variant="secondary"
                        >
                        <Wand2 className="mr-2 h-4 w-4" />
                        Sugerir Todas las Builds
                    </Button>
                     <Button
                        onClick={() => resetAllLiveUpdateRatings()}
                        variant="outline"
                        >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Resetear Letras
                    </Button>
                  </div>
               </CardContent>
             </Card>
            <IdealTeamDisplay 
                teamSlots={idealTeam} 
                formation={selectedFormation} 
                onDiscardPlayer={handleDiscardPlayer}
                onViewBuild={handleViewPlayerBuild}
                onUpdateLiveUpdateRating={updateLiveUpdateRating}
            />
          </TabsContent>
          
          <TabsContent value="nationalities" className="mt-6">
            <NationalityDistribution players={allPlayers} />
          </TabsContent>

          <TabsContent value="ideal-builds" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent">
                  <Dna />
                  Builds Ideales
                </CardTitle>
                <CardDescription>
                  Define la distribución de puntos de progresión ideal para cada arquetipo de jugador en la táctica de Contraataque largo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {idealBuilds.map((build) => (
                    <div key={build.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div>
                        <p className="font-semibold">
                            {build.position} - <span className="text-primary">{build.style}</span>
                            {build.profileName && <span className="text-muted-foreground ml-1">({build.profileName})</span>}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleCopyIdealBuild(build)}>
                          <Copy className="h-4 w-4 mr-2" />
                          JSON
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleDuplicateIdealBuild(build)}>
                          <CopyPlus className="h-4 w-4 mr-2" />
                          Generar Copia
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenIdealBuildEditor(build)}>Editar</Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">Eliminar</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar Build Ideal?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción eliminará permanentemente la configuración ideal para {build.position} - {build.style}.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteIdealBuild(build.id!)}>Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                  {idealBuilds.length === 0 && (
                    <p className="text-muted-foreground text-center p-4">No has definido ninguna build ideal todavía.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="tester" className="mt-6">
            <PlayerTester idealBuilds={idealBuilds} />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}
