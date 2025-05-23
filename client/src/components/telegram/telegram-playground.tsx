import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequestXHR } from "@/lib/api-xhr";
import {
  Loader2,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  MessageSquare,
  Users,
  Clock,
  Medal,
  ArrowRightLeft,
  Send,
  AlertCircle,
  Zap,
  BarChart3,
  Award
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { BarChart, LineChart } from "@/components/ui/ssr-safe-chart";

// Types
interface TestFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "idle" | "pending" | "success" | "error";
  message: string;
  timestamp: number;
}

interface PlaygroundProps {
  groupId: string;
  onGroupIdChange: (groupId: string) => void;
  isConnected: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

export function TelegramPlayground({
  groupId,
  onGroupIdChange,
  isConnected,
  isLoading,
  onRefresh
}: PlaygroundProps) {
  const [activeTab, setActiveTab] = useState("messages");
  const [customMessage, setCustomMessage] = useState("");
  const [channelId, setChannelId] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [channelForwardId, setChannelForwardId] = useState("@kodjoenglish");
  const [channelForwardName, setChannelForwardName] = useState("KODJO ENGLISH");
  const [targetGroups, setTargetGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupStats, setGroupStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [features, setFeatures] = useState<TestFeature[]>([
    {
      id: "countMembers",
      name: "Comptage des membres",
      description: "Teste la capacité à récupérer et compter les membres du groupe",
      icon: <Users className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    },
    {
      id: "sendMessage",
      name: "Envoi de message",
      description: "Teste l'envoi d'un message dans le groupe",
      icon: <Send className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    },
    {
      id: "sendZoomLink",
      name: "Envoi de lien Zoom",
      description: "Teste la génération et l'envoi d'un lien Zoom dans le groupe",
      icon: <MessageSquare className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    },
    {
      id: "countMessages",
      name: "Comptage des messages",
      description: "Teste la capacité à récupérer et compter les messages du groupe",
      icon: <MessageSquare className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    },
    {
      id: "assignBadges",
      name: "Attribution de badges",
      description: "Teste l'analyse d'activité et l'attribution de badges aux membres les plus actifs",
      icon: <Medal className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    },
    {
      id: "forwardMessage",
      name: "Transfert de message",
      description: "Teste le transfert d'un message depuis une chaîne vers le groupe",
      icon: <ArrowRightLeft className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    },
    {
      id: "sendReminder",
      name: "Envoi de rappel",
      description: "Teste l'envoi d'un rappel programmé dans le groupe",
      icon: <Clock className="h-5 w-5" />,
      status: "idle",
      message: "",
      timestamp: 0
    }
  ]);

  // Mutation pour exécuter un test
  const testMutation = useMutation({
    mutationFn: async ({ testId }: { testId: string }) => {
      if (!groupId) {
        throw new Error("Veuillez entrer un ID de groupe Telegram");
      }

      // Mettre à jour le statut du test
      updateFeatureStatus(testId, "pending", "Test en cours...");
      addLog(`Exécution du test: ${getFeatureName(testId)}`);

      return await apiRequestXHR("POST", `/api/telegram/test/run-test`, {
        testId,
        groupId
      });
    },
    onSuccess: (data, variables) => {
      const { testId } = variables;
      updateFeatureStatus(testId, data.success ? "success" : "error", data.message);
      addLog(`Résultat du test ${getFeatureName(testId)}: ${data.message}`);

      toast({
        title: data.success ? "Test réussi" : "Test échoué",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });

      // Rafraîchir les données si nécessaire
      if (data.success) {
        onRefresh();
      }
    },
    onError: (error, variables) => {
      const { testId } = variables;
      updateFeatureStatus(testId, "error", error.message);
      addLog(`Erreur lors du test ${getFeatureName(testId)}: ${error.message}`);

      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour envoyer un message personnalisé
  const sendCustomMessageMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !customMessage) {
        throw new Error("Veuillez entrer un ID de groupe et un message");
      }

      addLog(`Envoi d'un message personnalisé dans le groupe ${groupId}`);

      return await apiRequestXHR("POST", `/api/telegram/test/send-message`, {
        groupId,
        message: customMessage,
        parseMode: "HTML"
      });
    },
    onSuccess: () => {
      addLog(`Message personnalisé envoyé avec succès dans le groupe ${groupId}`);

      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé avec succès dans le groupe.",
      });

      // Réinitialiser le message
      setCustomMessage("");
    },
    onError: (error) => {
      addLog(`Erreur lors de l'envoi du message personnalisé: ${error.message}`);

      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour transférer un message depuis une chaîne
  const forwardMessageMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !channelId) {
        throw new Error("Veuillez entrer un ID de groupe et un ID de chaîne");
      }

      addLog(`Transfert d'un message depuis la chaîne ${channelId} vers le groupe ${groupId}`);

      return await apiRequestXHR("POST", `/api/telegram/test/forward-message`, {
        sourceChannelId: channelId,
        targetGroupId: groupId
      });
    },
    onSuccess: () => {
      addLog(`Message transféré avec succès depuis la chaîne ${channelId} vers le groupe ${groupId}`);

      toast({
        title: "Message transféré",
        description: "Le message a été transféré avec succès.",
      });
    },
    onError: (error) => {
      addLog(`Erreur lors du transfert du message: ${error.message}`);

      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour configurer le transfert automatique
  const configureChannelForwardMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !channelForwardId) {
        throw new Error("Veuillez entrer un ID de groupe et un ID de chaîne");
      }

      addLog(`Configuration du transfert automatique depuis la chaîne ${channelForwardId} vers le groupe ${groupId}`);

      return await apiRequestXHR("POST", `/api/telegram/channel-forwards`, {
        sourceChannelId: channelForwardId,
        sourceChannelName: channelForwardName,
        targetGroupId: groupId,
        targetGroupName: `Groupe ${groupId}`
      });
    },
    onSuccess: () => {
      addLog(`Transfert automatique configuré avec succès depuis la chaîne ${channelForwardId} vers le groupe ${groupId}`);

      // Ajouter le groupe à la liste des groupes cibles
      if (!targetGroups.some(g => g.id === groupId)) {
        setTargetGroups(prev => [...prev, { id: groupId, name: `Groupe ${groupId}` }]);
      }

      toast({
        title: "Configuration réussie",
        description: "Le transfert automatique a été configuré avec succès.",
      });
    },
    onError: (error) => {
      addLog(`Erreur lors de la configuration du transfert automatique: ${error.message}`);

      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour exécuter tous les transferts automatiques
  const executeAllForwardsMutation = useMutation({
    mutationFn: async () => {
      addLog(`Exécution de tous les transferts automatiques configurés`);

      return await apiRequestXHR("POST", `/api/telegram/channel-forwards/execute`, {});
    },
    onSuccess: (data) => {
      addLog(`Transferts automatiques exécutés avec succès: ${data.transferCount || 0} messages transférés`);

      toast({
        title: "Transferts exécutés",
        description: `${data.transferCount || 0} messages ont été transférés avec succès.`,
      });
    },
    onError: (error) => {
      addLog(`Erreur lors de l'exécution des transferts automatiques: ${error.message}`);

      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fonction pour mettre à jour le statut d'une fonctionnalité
  const updateFeatureStatus = (id: string, status: TestFeature["status"], message: string) => {
    setFeatures(prev => prev.map(feature =>
      feature.id === id
        ? { ...feature, status, message, timestamp: Date.now() }
        : feature
    ));
  };

  // Fonction pour obtenir le nom d'une fonctionnalité par son ID
  const getFeatureName = (id: string): string => {
    const feature = features.find(f => f.id === id);
    return feature ? feature.name : id;
  };

  // Fonction pour ajouter un log
  const addLog = (message: string) => {
    const timestamp = format(new Date(), 'HH:mm:ss');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  };

  // Fonction pour exécuter un test
  const runTest = (testId: string) => {
    testMutation.mutate({ testId });
  };

  // Fonction pour envoyer un message personnalisé
  const sendCustomMessage = () => {
    if (!customMessage) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un message à envoyer.",
        variant: "destructive",
      });
      return;
    }

    sendCustomMessageMutation.mutate();
  };

  // Fonction pour transférer un message depuis une chaîne
  const forwardMessage = () => {
    if (!channelId) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un ID de chaîne source.",
        variant: "destructive",
      });
      return;
    }

    forwardMessageMutation.mutate();
  };

  // Fonction pour configurer le transfert automatique
  const configureChannelForward = () => {
    if (!channelForwardId) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un ID de chaîne source.",
        variant: "destructive",
      });
      return;
    }

    configureChannelForwardMutation.mutate();
  };

  // Fonction pour exécuter tous les transferts automatiques
  const executeAllForwards = () => {
    executeAllForwardsMutation.mutate();
  };

  // Fonction pour charger les statistiques du groupe
  const fetchGroupStats = async () => {
    if (!groupId || !isConnected) return;

    try {
      setIsLoadingStats(true);
      addLog(`Chargement des statistiques pour le groupe ${groupId}...`);

      const response = await apiRequestXHR("GET", `/api/telegram/group-stats/${groupId}`);
      setGroupStats(response);

      addLog(`Statistiques chargées avec succès pour le groupe ${groupId}`);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
      addLog(`Erreur lors du chargement des statistiques: ${error.message}`);

      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques du groupe.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Charger les groupes cibles et les statistiques au chargement du composant
  useEffect(() => {
    const fetchTargetGroups = async () => {
      try {
        const response = await apiRequestXHR("GET", "/api/telegram/channel-forwards");
        if (response && Array.isArray(response)) {
          const groups = response.map(config => ({
            id: config.targetGroupId,
            name: config.targetGroupName
          }));
          setTargetGroups(groups);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des configurations de transfert:", error);
      }
    };

    if (isConnected) {
      fetchTargetGroups();
      fetchGroupStats();
    }
  }, [isConnected, groupId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="mr-2 h-5 w-5 text-yellow-500" />
            Playground Telegram
          </CardTitle>
          <CardDescription>
            Testez toutes les fonctionnalités de l'intégration Telegram dans un environnement contrôlé
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="channel">Transfert Canal</TabsTrigger>
              <TabsTrigger value="features">Fonctionnalités</TabsTrigger>
              <TabsTrigger value="stats">Statistiques</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="messages" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Envoyer un message personnalisé</h3>
                  <Textarea
                    placeholder="Écrivez votre message ici... (supporte le format HTML)"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={sendCustomMessage}
                      disabled={!isConnected || !customMessage || sendCustomMessageMutation.isPending}
                    >
                      {sendCustomMessageMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Envoyer
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Transférer un message depuis une chaîne</h3>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="ID de la chaîne source (ex: @channel ou -100...)"
                      value={channelId}
                      onChange={(e) => setChannelId(e.target.value)}
                    />
                    <Button
                      onClick={forwardMessage}
                      disabled={!isConnected || !channelId || forwardMessageMutation.isPending}
                    >
                      {forwardMessageMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                      )}
                      Transférer
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="channel" className="space-y-4">
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">Transfert automatique des publications</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Cette fonctionnalité permet de transférer automatiquement toutes les publications du canal
                        <strong> {channelForwardId}</strong> vers les groupes Telegram dédiés.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Configurer le transfert automatique</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">ID du canal source</label>
                      <Input
                        placeholder="ID du canal (ex: @kodjoenglish)"
                        value={channelForwardId}
                        onChange={(e) => setChannelForwardId(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nom du canal</label>
                      <Input
                        placeholder="Nom du canal"
                        value={channelForwardName}
                        onChange={(e) => setChannelForwardName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      Groupe cible: <strong>{groupId || "Non défini"}</strong>
                    </p>
                    <Button
                      onClick={configureChannelForward}
                      disabled={!isConnected || !channelForwardId || !groupId || configureChannelForwardMutation.isPending}
                    >
                      {configureChannelForwardMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                      )}
                      Configurer
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Groupes configurés pour le transfert automatique</h3>
                  {targetGroups.length > 0 ? (
                    <div className="bg-white border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Groupe</TableHead>
                            <TableHead>ID</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {targetGroups.map((group) => (
                            <TableRow key={group.id}>
                              <TableCell>{group.name}</TableCell>
                              <TableCell>{group.id}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-md border border-gray-200">
                      <p className="text-gray-500">Aucun groupe configuré pour le transfert automatique</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={executeAllForwards}
                    disabled={!isConnected || targetGroups.length === 0 || executeAllForwardsMutation.isPending}
                    variant="default"
                  >
                    {executeAllForwardsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Exécuter tous les transferts maintenant
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature) => (
                  <Card key={feature.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 rounded-full bg-gray-100">
                            {feature.icon}
                          </div>
                          <div>
                            <h3 className="font-medium">{feature.name}</h3>
                            <p className="text-sm text-gray-500">{feature.description}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => runTest(feature.id)}
                          disabled={!isConnected || feature.status === "pending" || testMutation.isPending}
                        >
                          {feature.status === "pending" || (testMutation.isPending && testMutation.variables?.testId === feature.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {feature.status !== "idle" && (
                        <div className="mt-4">
                          <div className="flex items-center space-x-2">
                            {feature.status === "pending" && <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />}
                            {feature.status === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {feature.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                            <span className={`text-sm ${
                              feature.status === "success" ? "text-green-500" :
                              feature.status === "error" ? "text-red-500" :
                              "text-yellow-500"
                            }`}>
                              {feature.status === "pending" ? "En cours..." :
                               feature.status === "success" ? "Succès" :
                               "Échec"}
                            </span>
                          </div>
                          {feature.message && (
                            <p className="text-sm mt-1">{feature.message}</p>
                          )}
                          {feature.timestamp > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(feature.timestamp), 'HH:mm:ss')}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              {isLoadingStats ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : groupStats ? (
                <div className="space-y-6">
                  {/* Résumé du groupe */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-lg">Statistiques du groupe</CardTitle>
                          <CardDescription>
                            {groupStats.courseName || "Groupe Telegram"}
                            {groupStats.teacherName && ` - Coach: ${groupStats.teacherName}`}
                          </CardDescription>
                        </div>
                        <Button
                          onClick={fetchGroupStats}
                          variant="outline"
                          size="sm"
                          disabled={isLoadingStats}
                        >
                          {isLoadingStats ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-500" />
                          <span>{groupStats.memberCount || 0} membres</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-green-500" />
                          <span>{groupStats.messageCount || 0} messages</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-orange-500" />
                          <span>
                            Dernière activité: {
                              groupStats.lastActivity
                                ? formatDistanceToNow(new Date(groupStats.lastActivity), { addSuffix: true, locale: fr })
                                : "Aucune activité récente"
                            }
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Utilisateurs les plus actifs */}
                  {groupStats.topUsers && groupStats.topUsers.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Utilisateurs les plus actifs</CardTitle>
                        <CardDescription>Top 5 des utilisateurs par nombre de messages</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {groupStats.topUsers.map((user: any, index: number) => (
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
                                  value={(user.messageCount / (groupStats.topUsers[0]?.messageCount || 1)) * 100}
                                  className="h-2 w-32"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Graphiques d'activité */}
                  {groupStats.dayOfWeekActivity && groupStats.dayOfWeekActivity.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Activité par jour de la semaine</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          {typeof window !== 'undefined' ? (
                            <BarChart
                              data={{
                                labels: groupStats.dayOfWeekActivity.map((d: any) => {
                                  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
                                  return days[d.day];
                                }),
                                datasets: [
                                  {
                                    label: "Messages",
                                    data: groupStats.dayOfWeekActivity.map((d: any) => d.count),
                                    backgroundColor: "rgba(59, 130, 246, 0.5)",
                                    borderColor: "rgb(59, 130, 246)",
                                    borderWidth: 1,
                                  },
                                ],
                              }}
                            />
                          ) : (
                            <div className="flex justify-center items-center h-full text-gray-500">
                              Graphique non disponible
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Activité par heure */}
                  {groupStats.hourlyActivity && groupStats.hourlyActivity.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Activité par heure de la journée</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          {typeof window !== 'undefined' ? (
                            <BarChart
                              data={{
                                labels: groupStats.hourlyActivity.map((h: any) => `${h.hour}h`),
                                datasets: [
                                  {
                                    label: "Messages",
                                    data: groupStats.hourlyActivity.map((h: any) => h.count),
                                    backgroundColor: "rgba(16, 185, 129, 0.5)",
                                    borderColor: "rgb(16, 185, 129)",
                                    borderWidth: 1,
                                  },
                                ],
                              }}
                            />
                          ) : (
                            <div className="flex justify-center items-center h-full text-gray-500">
                              Graphique non disponible
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Activité quotidienne */}
                  {groupStats.dailyActivity && groupStats.dailyActivity.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Activité quotidienne (30 derniers jours)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          {typeof window !== 'undefined' ? (
                            <LineChart
                              data={{
                                labels: groupStats.dailyActivity.map((d: any) => d.date),
                                datasets: [
                                  {
                                    label: "Messages",
                                    data: groupStats.dailyActivity.map((d: any) => d.count),
                                    backgroundColor: "rgba(249, 115, 22, 0.5)",
                                    borderColor: "rgb(249, 115, 22)",
                                    borderWidth: 1,
                                    tension: 0.4,
                                  },
                                ],
                              }}
                            />
                          ) : (
                            <div className="flex justify-center items-center h-full text-gray-500">
                              Graphique non disponible
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune donnée statistique disponible pour ce groupe.</p>
                  <Button
                    onClick={fetchGroupStats}
                    variant="outline"
                    className="mt-4"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Charger les statistiques
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-md h-[400px] overflow-y-auto font-mono text-sm">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="py-1 border-b border-gray-200 last:border-0">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-4">
                    Aucun log disponible. Exécutez des tests pour générer des logs.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
