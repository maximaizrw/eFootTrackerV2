
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
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

import { AddRatingDialog, type FormValues as AddRatingFormValues } from '@/components/add-rating-dialog';
import { EditCardDialog, type FormValues as EditCardFormValues } from '@/components/edit-card-dialog';
import { EditPlayerDialog, type FormValues as EditPlayerFormValues } from '@/components/edit-player-dialog';
import { EditStatsDialog } from '@/components/edit-stats-dialog';
import { AddFormationDialog } from '@/components/add-formation-dialog';
import { EditFormationDialog } from '@/components/edit-formation-dialog';
import { AddMatchDialog, type AddMatchFormValues } from '@/components/add-match-dialog';
import { PlayerDetailDialog } from '@/components/player-detail-dialog';

import { FormationsDisplay } from '@/components/formations-display';
import { IdealTeamDisplay } from '@/components/ideal-team-display';
import { IdealTeamSetup } from '@/components/ideal-team-setup';
import { PlayerTable } from '@/components/player-table';
import { PositionIcon } from '@/components/position-icon';
import { NationalityDistribution } from '@/components/nationality-distribution';

import { usePlayers } from '@/hooks/usePlayers';
import { useFormations } from '@/hooks/useFormations';
import { useToast } from "@/hooks/use-toast";

import type { Player, PlayerCard as PlayerCardType, FormationStats, IdealTeamSlot, FlatPlayer, Position, League, Nationality } from '@/lib/types';
import { positions, leagues, nationalities } from '@/lib/types';
import { normalizeText } from '@/lib/utils';
import { generateIdealTeam } from '@/lib/team-generator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PlusCircle, Star, Download, Trophy, RotateCcw, Globe } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function Home() {
  const [prioritizeRecentForm, setPrioritizeRecentForm] = useState(false);

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
    updateLiveUpdateRating,
    resetAllLiveUpdateRatings,
    updateManualTier,
  } = usePlayers(prioritizeRecentForm);

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
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [cardFilter, setCardFilter] = useState<string>('all');
  const [listSortCriteria, setListSortCriteria] = useState<'general' | 'average'>('general');
  
  const [isAddRatingDialogOpen, setAddRatingDialogOpen] = useState(false);
  const [isAddFormationDialogOpen, setAddFormationDialogOpen] = useState(false);
  const [isEditFormationDialogOpen, setEditFormationDialogOpen] = useState(false);
  const [isAddMatchDialogOpen, setAddMatchDialogOpen] = useState(false);
  const [isEditCardDialogOpen, setEditCardDialogOpen] = useState(false);
  const [isEditPlayerDialogOpen, setEditPlayerDialogOpen] = useState(false);
  const [isEditStatsDialogOpen, setEditStatsDialogOpen] = useState(false);
  const [isPlayerDetailDialogOpen, setPlayerDetailDialogOpen] = useState(false);
  const [isImageViewerOpen, setImageViewerOpen] = useState(false);

  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [viewingImageName, setViewingImageName] = useState<string | null>(null);
  const [addDialogInitialData, setAddDialogInitialData] = useState<Partial<AddRatingFormValues> | undefined>(undefined);
  const [addMatchInitialData, setAddMatchInitialData] = useState<{ formationId: string; formationName: string } | undefined>(undefined);
  const [editCardDialogInitialData, setEditCardDialogInitialData] = useState<EditCardFormValues | undefined>(undefined);
  const [editPlayerDialogInitialData, setEditPlayerDialogInitialData] = useState<Partial<EditPlayerFormValues> | undefined>(undefined);
  const [editFormationDialogInitialData, setEditFormationDialogInitialData] = useState<FormationStats | undefined>(undefined);
  const [editStatsDialogInitialData, setEditStatsDialogInitialData] = useState<{ player: Player, card: PlayerCardType } | undefined>(undefined);
  const [selectedFlatPlayer, setSelectedFlatPlayer] = useState<FlatPlayer | null>(null);
  
  const [selectedFormationId, setSelectedFormationId] = useState<string | undefined>(undefined);
  const [selectedLeague, setSelectedLeague] = useState<League | 'all'>('all');
  const [selectedNationality, setSelectedNationality] = useState<Nationality | 'all'>('all');
  const [idealTeam, setIdealTeam] = useState<IdealTeamSlot[]>([]);
  const [discardedCardIds, setDiscardedCardIds] = useState<Set<string>>(new Set());
  const [isFlexibleLaterals, setFlexibleLaterals] = useState(false);
  const [isFlexibleWingers, setFlexibleWingers] = useState(false);
  const [selectionCriteria, setSelectionCriteria] = useState<'general' | 'average'>('general');
  
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
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona una formación.' });
      return;
    }

    const formation = formations.find(f => f.id === selectedFormationId);
    if (!formation) return;
    
    const newTeam = generateIdealTeam(
        players, 
        formation, 
        discardedCardIds, 
        selectedLeague, 
        selectedNationality, 
        isFlexibleLaterals, 
        isFlexibleWingers, 
        selectionCriteria,
        prioritizeRecentForm
    );

    setIdealTeam(newTeam);
    toast({ title: "Equipo Generado", description: `Se ha generado una convocatoria para "${formation.name}".` });
  }, [players, selectedFormationId, formations, discardedCardIds, selectedLeague, selectedNationality, isFlexibleLaterals, isFlexibleWingers, selectionCriteria, prioritizeRecentForm, toast]);

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
    toast({ title: "Lista de Descartados Reiniciada" });
  }, [toast]);
  
  const handleDownloadBackup = useCallback(async () => {
    const playersData = await downloadPlayersBackup();
    const formationsData = await downloadFormationsBackup();
    if (!playersData || !formationsData) return;
    
    const backupData = { players: playersData, formations: formationsData };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eFootTracker_backup.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [downloadPlayersBackup, downloadFormationsBackup]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setSearchTerm('');
    setStyleFilter('all');
    setCardFilter('all');
  }, []);

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
            return searchMatch && styleMatch && cardMatch;
        }).sort((a, b) => {
          if (listSortCriteria === 'average') {
            if (Math.abs(b.performance.stats.average - a.performance.stats.average) > 0.01) return b.performance.stats.average - a.performance.stats.average;
            return b.performance.stats.matches - a.performance.stats.matches;
          }
          // Sort by defining score (Manual Tier + Average)
          return b.score - a.score;
        });
    }
    return grouped;
  }, [flatPlayers, searchTerm, styleFilter, cardFilter, listSortCriteria]);

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


  if (playersError || formationsError) {
    return <div className="flex items-center justify-center min-h-screen p-4"><div className="text-destructive font-bold">{playersError || formationsError}</div></div>;
  }

  if (playersLoading || formationsLoading) {
    return <div className="flex items-center justify-center min-h-screen text-xl font-semibold">Conectando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
       <AddRatingDialog
        open={isAddRatingDialogOpen}
        onAddRating={addRating}
        players={allPlayers}
        initialData={addDialogInitialData}
        onOpenChange={setAddRatingDialogOpen}
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
      />
      <AlertDialog open={isImageViewerOpen} onOpenChange={setImageViewerOpen}>
        <AlertDialogContent className="max-w-xl p-0">
          <AlertDialogHeader className="p-4 border-b">
            <AlertDialogTitle>{viewingImageName}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="p-4 flex justify-center items-center">
            {viewingImageUrl && (
              <Image src={viewingImageUrl} alt="Tactic" width={500} height={500} className="object-contain max-h-[80vh]" unoptimized />
            )}
          </div>
          <AlertDialogFooter className="p-4 border-t"><AlertDialogCancel>Cerrar</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="sticky top-0 z-10 bg-background/70 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl sm:text-3xl font-bold font-headline text-primary">eFootTracker</h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleDownloadBackup} variant="outline" size="sm"><Download className="mr-0 sm:mr-2 h-4 w-4" /><span className="hidden sm:inline">Backup</span></Button>
            {activeTab === 'formations' ? (
                <Button onClick={() => setAddFormationDialogOpen(true)} size="sm"><PlusCircle className="mr-2 h-4 w-4" />Formación</Button>
            ) : positions.some(p => p === activeTab) && (
                <Button onClick={() => handleOpenAddRating({ position: activeTab as Position })} size="sm"><PlusCircle className="mr-2 h-4 w-4" />Valorar</Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <Tabs defaultValue="DC" className="w-full" onValueChange={handleTabChange} value={activeTab}>
           <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <TabsList className="inline-flex h-auto p-1">
              {positions.map((pos) => (
                <TabsTrigger key={pos} value={pos} className="py-2 px-3 text-sm">
                  <PositionIcon position={pos} className="mr-2 h-5 w-5"/>{pos}
                </TabsTrigger>
              ))}
              <TabsTrigger value="formations" className="py-2 px-3 text-sm"><Trophy className="mr-2 h-5 w-5"/>Formaciones</TabsTrigger>
              <TabsTrigger value="ideal-11" className="py-2 px-3 text-sm"><Star className="mr-2 h-5 w-5"/>11 Ideal</TabsTrigger>
              <TabsTrigger value="nationalities" className="py-2 px-3 text-sm"><Globe className="mr-2 h-5 w-5"/>Nacionalidades</TabsTrigger>
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
            const paginatedPlayers = filteredPlayerList.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
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
                          sortCriteria={listSortCriteria}
                          onSortCriteriaChange={setListSortCriteria}
                          filteredPlayers={filteredPlayerList}
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
                      onUpdateManualTier={updateManualTier}
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
                 <CardTitle className="flex items-center gap-2 text-accent"><Star />Generador de 11 Ideal</CardTitle>
                 <CardDescription>Selecciona a los mejores jugadores según su Tier manual y promedio.</CardDescription>
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
                    isFlexibleLaterals={isFlexibleLaterals}
                    onFlexibleLateralsChange={setFlexibleLaterals}
                    isFlexibleWingers={isFlexibleWingers}
                    onFlexibleWingersChange={setFlexibleWingers}
                    selectionCriteria={selectionCriteria}
                    onSelectionCriteriaChange={setSelectionCriteria}
                    prioritizeRecentForm={prioritizeRecentForm}
                    onPrioritizeRecentFormChange={setPrioritizeRecentForm}
                  />
                  <div className="flex flex-wrap items-center gap-4 mt-6">
                    <Button onClick={handleGenerateTeam} disabled={!selectedFormationId}><Star className="mr-2 h-4 w-4" />Generar 11 Ideal</Button>
                    <Button onClick={handleResetDiscards} variant="outline" disabled={discardedCardIds.size === 0}><RotateCcw className="mr-2 h-4 w-4" />Reiniciar Descartados</Button>
                    <Button onClick={() => resetAllLiveUpdateRatings()} variant="outline"><RotateCcw className="mr-2 h-4 w-4" />Resetear Letras</Button>
                  </div>
               </CardContent>
             </Card>
            <IdealTeamDisplay 
                teamSlots={idealTeam} 
                formation={selectedFormation} 
                onDiscardPlayer={handleDiscardPlayer}
                onUpdateLiveUpdateRating={updateLiveUpdateRating}
            />
          </TabsContent>
          
          <TabsContent value="nationalities" className="mt-6">
            <NationalityDistribution players={allPlayers} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
