import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Loader2, Users, MessageSquare, Clock, BarChart3, RefreshCw, Award } from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, LineChart, PieChart } from "@/components/ui/ssr-safe-chart";

// Types pour les statistiques détaillées
interface TopUser {
  userId: number;
  messageCount: number;
  lastActivity?: number;
}

interface DayActivity {
  day: number;
  count: number;
}

interface HourActivity {
  hour: number;
  count: number;
}

interface DailyActivity {
  date: string;
  count: number;
}

interface TelegramGroupDetailedStats {
  groupId: string;
  courseName: string;
  teacherName: string;
  memberCount: number;
  messageCount: number;
  lastActivity: number;
  topUsers: TopUser[];
  dayOfWeekActivity: DayActivity[];
  hourlyActivity: HourActivity[];
  dailyActivity: DailyActivity[];
}

export default function TelegramDetailedStats() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Récupérer les statistiques détaillées de tous les groupes
  const { data: groupsStats, isLoading: isLoadingGroups, refetch: refetchGroups } = useQuery<TelegramGroupDetailedStats[]>({
    queryKey: ["/api/telegram/detailed-stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/telegram/detailed-stats");
      return res.json();
    },
  });

  // Récupérer les statistiques détaillées d'un groupe spécifique
  const { data: groupStats, isLoading: isLoadingGroup, refetch: refetchGroup } = useQuery<TelegramGroupDetailedStats>({
    queryKey: ["/api/telegram/group-stats", selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return null;
      const res = await apiRequest("GET", `/api/telegram/group-stats/${selectedGroupId}`);
      return res.json();
    },
    enabled: !!selectedGroupId,
  });

  // Fonction pour rafraîchir les statistiques
  const refreshStats = async () => {
    try {
      await refetchGroups();
      if (selectedGroupId) {
        await refetchGroup();
      }
      toast({
        title: "Statistiques rafraîchies",
        description: "Les statistiques des groupes Telegram ont été mises à jour.",
      });
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des statistiques:", error);
      toast({
        title: "Erreur",
        description: "Impossible de rafraîchir les statistiques des groupes Telegram.",
        variant: "destructive",
      });
    }
  };

  // Fonction pour formater la date de dernière activité
  const formatLastActivity = (timestamp: number | null | undefined) => {
    if (!timestamp) {
      return "Aucune activité récente";
    }

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Date invalide";
      }

      return formatDistanceToNow(date, { addSuffix: true, locale: fr });
    } catch (error) {
      console.error("Erreur lors du formatage de la date:", error);
      return "Date invalide";
    }
  };

  // Fonction pour obtenir le jour de la semaine en français
  const getDayName = (day: number) => {
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return days[day];
  };

  // Préparation des données pour les graphiques
  const prepareChartData = (stats: TelegramGroupDetailedStats | null | undefined) => {
    if (!stats) return null;

    // Données pour le graphique d'activité par jour de la semaine
    const dayOfWeekData = {
      labels: stats.dayOfWeekActivity.map(d => getDayName(d.day)),
      datasets: [
        {
          label: "Messages",
          data: stats.dayOfWeekActivity.map(d => d.count),
          backgroundColor: "rgba(59, 130, 246, 0.5)",
          borderColor: "rgb(59, 130, 246)",
          borderWidth: 1,
        },
      ],
    };

    // Données pour le graphique d'activité par heure
    const hourlyData = {
      labels: stats.hourlyActivity.map(h => `${h.hour}h`),
      datasets: [
        {
          label: "Messages",
          data: stats.hourlyActivity.map(h => h.count),
          backgroundColor: "rgba(16, 185, 129, 0.5)",
          borderColor: "rgb(16, 185, 129)",
          borderWidth: 1,
        },
      ],
    };

    // Données pour le graphique d'activité quotidienne
    const dailyData = {
      labels: stats.dailyActivity.map(d => d.date),
      datasets: [
        {
          label: "Messages",
          data: stats.dailyActivity.map(d => d.count),
          backgroundColor: "rgba(249, 115, 22, 0.5)",
          borderColor: "rgb(249, 115, 22)",
          borderWidth: 1,
          tension: 0.4,
        },
      ],
    };

    return {
      dayOfWeekData,
      hourlyData,
      dailyData,
    };
  };

  const chartData = prepareChartData(groupStats);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Statistiques Détaillées Telegram</h1>
        <Button
          onClick={refreshStats}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Rafraîchir les statistiques
        </Button>
      </div>

      {/* Sélection du groupe */}
      <div className="mb-8">
        <Select value={selectedGroupId || ""} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionner un groupe Telegram" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingGroups ? (
              <div className="flex justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : groupsStats && groupsStats.length > 0 ? (
              groupsStats.map((group) => (
                <SelectItem key={group.groupId} value={group.groupId}>
                  {group.courseName} - {group.teacherName}
                </SelectItem>
              ))
            ) : (
              <div className="p-2 text-center text-gray-500">Aucun groupe disponible</div>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Affichage des statistiques détaillées */}
      {selectedGroupId ? (
        isLoadingGroup ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : groupStats ? (
          <div className="space-y-8">
            {/* Résumé du groupe */}
            <Card>
              <CardHeader>
                <CardTitle>{groupStats.courseName}</CardTitle>
                <CardDescription>Coach: {groupStats.teacherName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span>{groupStats.memberCount} membres</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    <span>{groupStats.messageCount} messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <span>Dernière activité: {formatLastActivity(groupStats.lastActivity)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Utilisateurs les plus actifs */}
            <Card>
              <CardHeader>
                <CardTitle>Utilisateurs les plus actifs</CardTitle>
                <CardDescription>Top 5 des utilisateurs par nombre de messages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {groupStats.topUsers.map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <Award className={`h-5 w-5 ${
                            index === 0 ? "text-yellow-500" :
                            index === 1 ? "text-gray-400" : "text-amber-700"
                          }`} />
                        )}
                        <span>Utilisateur {user.userId}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>{user.messageCount} messages</span>
                        <Progress
                          value={(user.messageCount / groupStats.topUsers[0].messageCount) * 100}
                          className="h-2 w-32"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Graphiques d'activité */}
            <Tabs defaultValue="daily">
              <TabsList className="mb-4">
                <TabsTrigger value="daily">Activité quotidienne</TabsTrigger>
                <TabsTrigger value="weekly">Activité par jour</TabsTrigger>
                <TabsTrigger value="hourly">Activité par heure</TabsTrigger>
              </TabsList>

              <TabsContent value="daily" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Activité quotidienne (30 derniers jours)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      {chartData && typeof window !== 'undefined' ? (
                        <LineChart data={chartData.dailyData} />
                      ) : (
                        <div className="flex justify-center items-center h-full text-gray-500">
                          Graphique non disponible
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="weekly" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Activité par jour de la semaine</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      {chartData && typeof window !== 'undefined' ? (
                        <BarChart data={chartData.dayOfWeekData} />
                      ) : (
                        <div className="flex justify-center items-center h-full text-gray-500">
                          Graphique non disponible
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hourly" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Activité par heure de la journée</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      {chartData && typeof window !== 'undefined' ? (
                        <BarChart data={chartData.hourlyData} />
                      ) : (
                        <div className="flex justify-center items-center h-full text-gray-500">
                          Graphique non disponible
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Aucune donnée disponible pour ce groupe.</p>
          </div>
        )
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">Sélectionnez un groupe pour voir ses statistiques détaillées.</p>
        </div>
      )}
    </div>
  );
}
