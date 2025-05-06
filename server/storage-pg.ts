/**
 * Implémentation du stockage avec PostgreSQL
 */

import {
  User, InsertUser,
  Course, InsertCourse,
  Session, InsertSession,
  Attendance, InsertAttendance,
  TelegramActivity, InsertTelegramActivity,
  Badge, InsertBadge,
  UserBadge, InsertUserBadge,
  AutomationRule, InsertAutomationRule,
  TemplateMessage, InsertTemplateMessage,
  ActivityLog, InsertActivityLog,
  MessageLog, InsertMessageLog,
  users, courses, sessions, attendance, telegramActivity,
  badges, userBadges, automationRules, templateMessages, activityLogs, messageLogs
} from "@shared/schema-sqlite";
import { db, pgClient } from "./db-postgres";
import { eq, and, desc, sql } from "drizzle-orm";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import MemoryStore from "memorystore";

const scryptAsync = promisify(scrypt);
const MemoryStoreFactory = MemoryStore(session);

/**
 * Classe pour gérer le stockage des données
 */
export class Storage {
  private sessionStore: any;

  constructor() {
    // Initialiser le store de session en mémoire
    console.log("Utilisation du session store en mémoire");
    this.initMemoryStore();
  }
  
  // Initialiser un store de session en mémoire
  private initMemoryStore() {
    this.sessionStore = new MemoryStoreFactory({
      checkPeriod: 86400000, // 24h en millisecondes
      max: 1000, // Nombre maximum de sessions en mémoire
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 jours en millisecondes
    });
    console.log("Session store en mémoire initialisé avec succès");
  }

  /**
   * Récupérer le store de session
   */
  getSessionStore() {
    return this.sessionStore;
  }

  /**
   * Créer un utilisateur
   */
  async createUser(userData: InsertUser): Promise<User> {
    // Générer un sel et hacher le mot de passe
    const salt = randomBytes(16).toString('hex');
    const hashedPassword = await this.hashPassword(userData.password, salt);

    // Insérer l'utilisateur dans la base de données
    const result = await db.insert(users)
      .values({
        ...userData,
        password: `${salt}:${hashedPassword}`,
      })
      .returning();

    return result[0];
  }

  /**
   * Récupérer un utilisateur par son email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await db.select()
      .from(users)
      .where(eq(users.email, email))
      .get();
  }

  /**
   * Récupérer un utilisateur par son ID
   */
  async getUserById(id: number): Promise<User | null> {
    return await db.select()
      .from(users)
      .where(eq(users.id, id))
      .get();
  }

  /**
   * Vérifier les identifiants d'un utilisateur
   */
  async verifyCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const [salt, storedHash] = user.password.split(':');
    const hashedPassword = await this.hashPassword(password, salt);

    if (storedHash === hashedPassword) {
      return user;
    }

    return null;
  }

  /**
   * Hacher un mot de passe avec un sel
   */
  private async hashPassword(password: string, salt: string): Promise<string> {
    return (await scryptAsync(password, salt, 64)).toString('hex');
  }

  /**
   * Récupérer tous les utilisateurs
   */
  async getAllUsers(): Promise<User[]> {
    return await db.select()
      .from(users)
      .all();
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | null> {
    // Si le mot de passe est fourni, le hacher
    if (userData.password) {
      const salt = randomBytes(16).toString('hex');
      const hashedPassword = await this.hashPassword(userData.password, salt);
      userData.password = `${salt}:${hashedPassword}`;
    }

    // Mettre à jour l'utilisateur
    await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .run();

    // Récupérer l'utilisateur mis à jour
    return await this.getUserById(id);
  }

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users)
      .where(eq(users.id, id))
      .run();

    return result.changes > 0;
  }

  /**
   * Créer un cours
   */
  async createCourse(courseData: InsertCourse): Promise<Course> {
    const result = await db.insert(courses)
      .values(courseData)
      .returning();

    return result[0];
  }

  /**
   * Récupérer un cours par son ID
   */
  async getCourseById(id: number): Promise<Course | null> {
    return await db.select()
      .from(courses)
      .where(eq(courses.id, id))
      .get();
  }

  /**
   * Récupérer tous les cours
   */
  async getAllCourses(): Promise<Course[]> {
    return await db.select()
      .from(courses)
      .all();
  }

  /**
   * Mettre à jour un cours
   */
  async updateCourse(id: number, courseData: Partial<InsertCourse>): Promise<Course | null> {
    await db.update(courses)
      .set(courseData)
      .where(eq(courses.id, id))
      .run();

    return await this.getCourseById(id);
  }

  /**
   * Supprimer un cours
   */
  async deleteCourse(id: number): Promise<boolean> {
    const result = await db.delete(courses)
      .where(eq(courses.id, id))
      .run();

    return result.changes > 0;
  }

  /**
   * Créer une session
   */
  async createSession(sessionData: InsertSession): Promise<Session> {
    const result = await db.insert(sessions)
      .values(sessionData)
      .returning();

    return result[0];
  }

  /**
   * Récupérer une session par son ID
   */
  async getSessionById(id: number): Promise<Session | null> {
    return await db.select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .get();
  }

  /**
   * Récupérer toutes les sessions d'un cours
   */
  async getSessionsByCourseId(courseId: number): Promise<Session[]> {
    return await db.select()
      .from(sessions)
      .where(eq(sessions.courseId, courseId))
      .all();
  }

  /**
   * Mettre à jour une session
   */
  async updateSession(id: number, sessionData: Partial<InsertSession>): Promise<Session | null> {
    await db.update(sessions)
      .set(sessionData)
      .where(eq(sessions.id, id))
      .run();

    return await this.getSessionById(id);
  }

  /**
   * Supprimer une session
   */
  async deleteSession(id: number): Promise<boolean> {
    const result = await db.delete(sessions)
      .where(eq(sessions.id, id))
      .run();

    return result.changes > 0;
  }

  /**
   * Créer une présence
   */
  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const result = await db.insert(attendance)
      .values(attendanceData)
      .returning();

    return result[0];
  }

  /**
   * Récupérer les présences d'une session
   */
  async getAttendanceBySessionId(sessionId: number): Promise<Attendance[]> {
    return await db.select()
      .from(attendance)
      .where(eq(attendance.sessionId, sessionId))
      .all();
  }

  /**
   * Récupérer les présences d'un utilisateur
   */
  async getAttendanceByUserId(userId: number): Promise<Attendance[]> {
    return await db.select()
      .from(attendance)
      .where(eq(attendance.userId, userId))
      .all();
  }

  /**
   * Supprimer une présence
   */
  async deleteAttendance(sessionId: number, userId: number): Promise<boolean> {
    const result = await db.delete(attendance)
      .where(and(
        eq(attendance.sessionId, sessionId),
        eq(attendance.userId, userId)
      ))
      .run();

    return result.changes > 0;
  }

  /**
   * Créer une activité Telegram
   */
  async createTelegramActivity(activityData: InsertTelegramActivity): Promise<TelegramActivity> {
    const result = await db.insert(telegramActivity)
      .values(activityData)
      .returning();

    return result[0];
  }

  /**
   * Récupérer les activités Telegram d'un groupe
   */
  async getTelegramActivityByGroupId(groupId: string): Promise<TelegramActivity[]> {
    return await db.select()
      .from(telegramActivity)
      .where(eq(telegramActivity.telegramGroupId, groupId))
      .all();
  }

  /**
   * Récupérer les activités Telegram d'un utilisateur
   */
  async getTelegramActivityByUserId(userId: string): Promise<TelegramActivity[]> {
    return await db.select()
      .from(telegramActivity)
      .where(eq(telegramActivity.telegramUserId, userId))
      .all();
  }

  /**
   * Supprimer une activité Telegram
   */
  async deleteTelegramActivity(id: number): Promise<boolean> {
    const result = await db.delete(telegramActivity)
      .where(eq(telegramActivity.id, id))
      .run();

    return result.changes > 0;
  }
}

// Exporter une instance de la classe Storage
export const storage = new Storage();
