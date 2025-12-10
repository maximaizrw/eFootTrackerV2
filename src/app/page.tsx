
"use client";

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel
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

import type { Player, PlayerCard as PlayerCardType, FormationStats, IdealTeamSlot, FlatPlayer, Position, PlayerPerformance, League, Nationality, PlayerBuild, IdealTeamPlayer, PlayerAttributeStats, IdealBuild } from '@/lib/types';
import { positions, leagues, nationalities } from '@/lib/types';
import { PlusCircle, Star, Download, Trophy, RotateCcw, Globe, Wrench, Dna } from 'lucide-react';
import { calculateStats, normalizeText, calculateGeneralScore } from '@/lib/utils';
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

  const { 
    players, 
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
    toggleSelectablePosition,
  } = usePlayers(idealBuilds);

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
  const [sortBy, setSortBy] = useState<'average' | 'general'>('general');
  
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

  useEffect(() => {
    if (idealTeam.length > 0) {
      handleGenerateTeam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discardedCardIds]);


  const handleOpenAddRating = (initialData?: Partial<AddRatingFormValues>) => {
    setAddDialogInitialData(initialData);
    setAddRatingDialogOpen(true);
  };
  
  const handleOpenEditCard = (player: Player, card: PlayerCardType) => {
    setEditCardDialogInitialData({
        playerId: player.id,
        cardId: card.id,
        currentCardName: card.name,
        currentStyle: card.style,
        league: card.league || 'Sin Liga',
        imageUrl: card.imageUrl || '',
    });
    setEditCardDialogOpen(true);
  };

  const handleOpenEditPlayer = (player: Player) => {
    setEditPlayerDialogInitialData({
      playerId: player.id,
      currentPlayerName: player.name,
      nationality: player.nationality || 'Sin Nacionalidad',
    });
    setEditPlayerDialogOpen(true);
  };

  const handleOpenEditStats = (player: Player, card: PlayerCardType) => {
    setEditStatsDialogInitialData({ player, card });
    setEditStatsDialogOpen(true);
  };

  const handleOpenPlayerDetail = (flatPlayer: FlatPlayer) => {
    setSelectedFlatPlayer(flatPlayer);
    setPlayerDetailDialogOpen(true);
  };
  
  const handleOpenEditFormation = (formation: FormationStats) => {
    setEditFormationDialogInitialData(formation);
    setEditFormationDialogOpen(true);
  };

  const handleViewImage = (url: string, name: string) => {
    setViewingImageUrl(url);
    setViewingImageName(name);
    setImageViewerOpen(true);
  };

  const handleOpenAddMatch = (formationId: string, formationName: string) => {
    setAddMatchInitialData({ formationId, formationName });
    setAddMatchDialogOpen(true);
  };

  const handleGenerateTeam = () => {
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
    
    const newTeam = generateIdealTeam(players, formation, discardedCardIds, selectedLeague, selectedNationality, sortBy);

    setIdealTeam(newTeam);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    toast({
      title: "11 Ideal Generado",
      description: `Se ha generado un equipo para la formación "${formation.name}".`,
    });
  };
  
  const handleFormationSelectionChange = (id: string) => {
    setSelectedFormationId(id);
  };

  const handleLeagueChange = (league: League | 'all') => {
    setSelectedLeague(league);
  };

  const handleNationalityChange = (nationality: Nationality | 'all') => {
    setSelectedNationality(nationality);
  };
  
  const handleGoToIdealTeam = (formationId: string) => {
    setActiveTab('ideal-11');
    handleFormationSelectionChange(formationId);
  }

  const handleDiscardPlayer = (cardId: string) => {
    setDiscardedCardIds(prev => new Set(prev).add(cardId));
  };
  
  const handleResetDiscards = () => {
    setDiscardedCardIds(new Set());
    toast({
        title: "Lista de Descartados Reiniciada",
        description: "Se volverán a considerar todos los jugadores.",
    });
  };
  
  const handleDownloadBackup = async () => {
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
      description: "El backup de la base de datos se está descargando.",
    });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchTerm('');
    setStyleFilter('all');
    setCardFilter('all');
  };

  const handleViewPlayerBuild = (player: IdealTeamPlayer) => {
    setViewingPlayerBuild(player);
    setIsBuildViewerOpen(true);
  };

  const handleOpenIdealBuildEditor = (build?: IdealBuild) => {
    setEditingIdealBuild(build);
    setIsIdealBuildEditorOpen(true);
  };


  const getHeaderButtons = () => {
    const isPositionTab = positions.includes(activeTab as Position);

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
  
  const handlePageChange = (position: Position, direction: 'next' | 'prev') => {
    setPagination(prev => {
      const currentPage = prev[position] || 0;
      const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
      return { ...prev, [position]: Math.max(0, newPage) };
    });
  };


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
      />
      <PlayerBuildViewer
        open={isBuildViewerOpen}
        onOpenChange={setIsBuildViewerOpen}
        player={viewingPlayerBuild}
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
            const flatPlayerList: FlatPlayer[] = allPlayers.flatMap(player => 
                (player.cards || []).flatMap(card => {
                    return (Object.keys(card.ratingsByPosition || {}) as Position[]).map(ratedPos => {
                        const ratingsForPos = card.ratingsByPosition?.[ratedPos] || [];
                        if (ratingsForPos.length === 0) return null;
                        if (ratedPos !== pos) return null;

                        const stats = calculateStats(ratingsForPos);
                        const recentRatings = ratingsForPos.slice(-3);
                        const recentStats = calculateStats(recentRatings);

                        const highPerfPositions = new Set<Position>();
                        for (const p in card.ratingsByPosition) {
                            const positionKey = p as Position;
                            const posRatings = card.ratingsByPosition[positionKey];
                            if (posRatings && posRatings.length > 0) {
                               const posAvg = calculateStats(posRatings).average;
                               if (posAvg >= 7.0) highPerfPositions.add(positionKey);
                            }
                        }
                        
                        const performance: PlayerPerformance = {
                            stats,
                            isHotStreak: stats.matches >= 3 && recentStats.average > stats.average + 0.5,
                            isConsistent: stats.matches >= 5 && stats.stdDev < 0.5,
                            isPromising: stats.matches > 0 && stats.matches < 10 && stats.average >= 7.0,
                            isVersatile: highPerfPositions.size >= 3,
                        };
                        
                        const affinityScore = card.buildsByPosition?.[ratedPos]?.manualAffinity || 0;
                        const generalScore = calculateGeneralScore(affinityScore, stats.average);

                        return { player, card, ratingsForPos, performance, affinityScore, generalScore, position: ratedPos };
                    }).filter((p): p is FlatPlayer => p !== null);
                })
            );
            
            const filteredPlayerList = flatPlayerList.filter(({ player, card }) => {
                const searchMatch = normalizeText(player.name).includes(normalizeText(searchTerm));
                const styleMatch = styleFilter === 'all' || card.style === styleFilter;
                const cardMatch = cardFilter === 'all' || card.name === cardFilter;
                return searchMatch && styleMatch && cardMatch;
            
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

            const currentPage = pagination[pos] || 0;
            const paginatedPlayers = filteredPlayerList.slice(
              currentPage * ITEMS_PER_PAGE,
              (currentPage + 1) * ITEMS_PER_PAGE
            );
            const totalPages = Math.ceil(filteredPlayerList.length / ITEMS_PER_PAGE);
            
            const allPositionalStyles = new Set<string>();
            flatPlayerList.forEach(p => {
                allPositionalStyles.add(p.card.style)
            });
            const uniqueStyles = ['all', ...Array.from(allPositionalStyles)];
            
            const allPositionalCards = new Set<string>();
            flatPlayerList.forEach(p => {
                allPositionalCards.add(p.card.name)
            });
            const uniqueCardNames = ['all', ...Array.from(allPositionalCards)];

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
                      onToggleSelectable={toggleSelectablePosition}
                      onDeleteRating={deleteRating}
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
                  />
                  <div className="flex items-center gap-4 mt-6">
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
                  </div>
               </CardContent>
             </Card>
            <IdealTeamDisplay 
                teamSlots={idealTeam} 
                formation={selectedFormation} 
                onDiscardPlayer={handleDiscardPlayer}
                onViewBuild={handleViewPlayerBuild}
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
                  Define la distribución de puntos de progresión ideal para cada arquetipo de jugador (combinación de posición y estilo de juego).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {idealBuilds.map((build) => (
                    <div key={build.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div>
                        <p className="font-semibold">{build.position} - <span className="text-primary">{build.style}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenIdealBuildEditor(build)}>Editar</Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteIdealBuild(build.id!)}>Eliminar</Button>
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
          
        </Tabs>
      </main>
    </div>
  );
}

    
