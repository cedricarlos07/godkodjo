import express from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { telegramService } from '../services/telegram-service';
import { UserRole } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Middleware pour vérifier si l'utilisateur est authentifié
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Vous devez être connecté pour accéder à cette ressource.' });
  }
  next();
};

// Middleware pour vérifier si l'utilisateur est administrateur
const isAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Accès refusé. Vous devez être administrateur.' });
  }
  next();
};

// Récupérer les statistiques détaillées des groupes Telegram
router.get('/telegram/detailed-stats', isAuthenticated, async (req, res) => {
  try {
    console.log('Récupération des statistiques détaillées des groupes Telegram...');
    
    // Récupérer tous les groupes Telegram
    const telegramGroups = await telegramService.getAllGroupStats();
    
    // Récupérer les cours associés aux groupes Telegram
    const courses = await db.select()
      .from(schema.fixedSchedules)
      .all();
    
    // Récupérer tous les messages Telegram
    const messages = await db.select()
      .from(schema.telegramMessages)
      .all();
    
    // Calculer les statistiques par groupe
    const groupStats = telegramGroups.map(group => {
      // Trouver le cours associé
      const course = courses.find(c => c.telegram_group === group.telegramGroupId);
      
      // Filtrer les messages pour ce groupe
      const groupMessages = messages.filter(m => m.telegramGroupId === group.telegramGroupId);
      
      // Calculer le nombre de messages par utilisateur
      const userMessageCounts = new Map<number, number>();
      groupMessages.forEach(message => {
        const userId = message.telegramUserId;
        userMessageCounts.set(userId, (userMessageCounts.get(userId) || 0) + 1);
      });
      
      // Trouver les utilisateurs les plus actifs
      const topUsers = Array.from(userMessageCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId, count]) => ({ userId, messageCount: count }));
      
      // Calculer l'activité par jour de la semaine
      const dayOfWeekActivity = new Map<number, number>();
      groupMessages.forEach(message => {
        const date = new Date(message.timestamp);
        const dayOfWeek = date.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
        dayOfWeekActivity.set(dayOfWeek, (dayOfWeekActivity.get(dayOfWeek) || 0) + 1);
      });
      
      // Calculer l'activité par heure de la journée
      const hourlyActivity = new Map<number, number>();
      groupMessages.forEach(message => {
        const date = new Date(message.timestamp);
        const hour = date.getHours();
        hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1);
      });
      
      // Calculer l'activité par jour (30 derniers jours)
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const recentMessages = groupMessages.filter(m => m.timestamp >= thirtyDaysAgo);
      
      const dailyActivity = new Map<string, number>();
      recentMessages.forEach(message => {
        const date = new Date(message.timestamp);
        const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        dailyActivity.set(dateString, (dailyActivity.get(dateString) || 0) + 1);
      });
      
      return {
        groupId: group.telegramGroupId,
        courseName: course?.courseName || 'Cours inconnu',
        teacherName: course?.teacherName || 'Enseignant inconnu',
        memberCount: group.memberCount,
        messageCount: group.messageCount,
        lastActivity: group.lastActivity,
        topUsers,
        dayOfWeekActivity: Array.from(dayOfWeekActivity.entries()).map(([day, count]) => ({ day, count })),
        hourlyActivity: Array.from(hourlyActivity.entries()).map(([hour, count]) => ({ hour, count })),
        dailyActivity: Array.from(dailyActivity.entries()).map(([date, count]) => ({ date, count }))
      };
    });
    
    res.json(groupStats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques détaillées des groupes Telegram:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques détaillées des groupes Telegram' });
  }
});

// Récupérer les statistiques détaillées d'un groupe Telegram spécifique
router.get('/telegram/group-stats/:groupId', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log(`Récupération des statistiques détaillées du groupe Telegram ${groupId}...`);
    
    // Récupérer les messages du groupe
    const messages = await db.select()
      .from(schema.telegramMessages)
      .where(eq(schema.telegramMessages.telegramGroupId, groupId))
      .all();
    
    // Récupérer les informations du groupe
    const groupInfo = await telegramService.getGroupInfo(groupId);
    
    // Récupérer le cours associé
    const course = await db.select()
      .from(schema.fixedSchedules)
      .where(eq(schema.fixedSchedules.telegram_group, groupId))
      .get();
    
    // Calculer les statistiques des utilisateurs
    const userStats = new Map<number, { messageCount: number, lastActivity: number }>();
    messages.forEach(message => {
      const userId = message.telegramUserId;
      const currentStats = userStats.get(userId) || { messageCount: 0, lastActivity: 0 };
      userStats.set(userId, {
        messageCount: currentStats.messageCount + 1,
        lastActivity: Math.max(currentStats.lastActivity, message.timestamp)
      });
    });
    
    // Trier les utilisateurs par nombre de messages
    const topUsers = Array.from(userStats.entries())
      .sort((a, b) => b[1].messageCount - a[1].messageCount)
      .map(([userId, stats]) => ({
        userId,
        messageCount: stats.messageCount,
        lastActivity: stats.lastActivity
      }));
    
    // Calculer l'activité par jour de la semaine
    const dayOfWeekActivity = [0, 0, 0, 0, 0, 0, 0]; // Dimanche à Samedi
    messages.forEach(message => {
      const date = new Date(message.timestamp);
      const dayOfWeek = date.getDay();
      dayOfWeekActivity[dayOfWeek]++;
    });
    
    // Calculer l'activité par heure de la journée
    const hourlyActivity = Array(24).fill(0);
    messages.forEach(message => {
      const date = new Date(message.timestamp);
      const hour = date.getHours();
      hourlyActivity[hour]++;
    });
    
    // Calculer l'activité quotidienne (30 derniers jours)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentMessages = messages.filter(m => m.timestamp >= thirtyDaysAgo);
    
    const dailyActivity = new Map<string, number>();
    recentMessages.forEach(message => {
      const date = new Date(message.timestamp);
      const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      dailyActivity.set(dateString, (dailyActivity.get(dateString) || 0) + 1);
    });
    
    res.json({
      groupId,
      courseName: course?.courseName || 'Cours inconnu',
      teacherName: course?.teacherName || 'Enseignant inconnu',
      memberCount: groupInfo.memberCount,
      messageCount: messages.length,
      lastActivity: groupInfo.lastActivity,
      topUsers,
      dayOfWeekActivity: dayOfWeekActivity.map((count, day) => ({ day, count })),
      hourlyActivity: hourlyActivity.map((count, hour) => ({ hour, count })),
      dailyActivity: Array.from(dailyActivity.entries()).map(([date, count]) => ({ date, count }))
    });
  } catch (error) {
    console.error(`Erreur lors de la récupération des statistiques du groupe Telegram ${req.params.groupId}:`, error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques du groupe Telegram' });
  }
});

export default router;
