// Base de données de secours en cas d'échec de better-sqlite3
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

// Fonction pour initialiser la base de données
export function initializeDatabase() {
  console.log('Initialisation de la base de données...');
  
  try {
    // Essayer d'utiliser better-sqlite3 avec un fichier
    const dbPath = process.env.DATABASE_PATH || './data/kodjo-english-v2.db';
    console.log(`Utilisation de la base de données SQLite: ${dbPath}`);
    
    // S'assurer que le répertoire existe
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      console.log(`Création du répertoire ${dbDir}...`);
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Créer la connexion à la base de données
    const sqlite = new Database(dbPath);
    
    // Configurer la base de données
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    
    // Créer l'instance drizzle
    const db = drizzle(sqlite, { schema });
    
    console.log('Base de données SQLite initialisée avec succès.');
    return { db, sqlite };
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données SQLite:', error);
    console.log('Tentative d\'utilisation d\'une base de données en mémoire...');
    
    try {
      // Utiliser une base de données en mémoire comme solution de secours
      const sqlite = new Database(':memory:');
      
      // Configurer la base de données
      sqlite.pragma('journal_mode = WAL');
      sqlite.pragma('foreign_keys = ON');
      
      // Créer l'instance drizzle
      const db = drizzle(sqlite, { schema });
      
      console.log('Base de données SQLite en mémoire initialisée avec succès.');
      return { db, sqlite };
    } catch (fallbackError) {
      console.error('Erreur critique lors de l\'initialisation de la base de données en mémoire:', fallbackError);
      throw new Error('Impossible d\'initialiser la base de données SQLite');
    }
  }
}

// Exporter une instance de la base de données
export const { db, sqlite } = initializeDatabase();
