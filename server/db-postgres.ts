/**
 * Configuration de la base de données PostgreSQL
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Charger les variables d'environnement
dotenv.config();

// Charger les variables d'environnement locales si elles existent
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log(`Chargement des variables d'environnement locales depuis ${envLocalPath}`);
  const envLocal = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const key in envLocal) {
    process.env[key] = envLocal[key];
  }
}

// Vérifier si l'URL de la base de données est définie
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL n'est pas défini. Veuillez configurer votre fichier .env ou .env.local.",
  );
}

// Vérifier le type de base de données
if (process.env.DATABASE_TYPE !== 'postgres') {
  throw new Error(
    "DATABASE_TYPE doit être 'postgres'. Veuillez configurer votre fichier .env.",
  );
}

console.log(`Connexion à la base de données PostgreSQL...`);

// Créer une connexion à la base de données PostgreSQL
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, { 
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Créer une instance de Drizzle avec le schéma
export const db = drizzle(client, { schema });

// Fonction pour exécuter les migrations
export async function runMigrations() {
  console.log('Exécution des migrations...');
  try {
    // Vérifier si le répertoire de migrations existe
    const migrationsDir = path.join(process.cwd(), 'drizzle');
    if (!fs.existsSync(migrationsDir)) {
      console.log(`Création du répertoire de migrations: ${migrationsDir}`);
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    // Exécuter les migrations
    await migrate(db, { migrationsFolder: migrationsDir });
    console.log('Migrations exécutées avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'exécution des migrations:', error);
    throw error;
  }
}

// Fonction pour fermer la connexion à la base de données
export async function closeConnection() {
  console.log('Fermeture de la connexion à la base de données...');
  try {
    await client.end();
    console.log('Connexion à la base de données fermée avec succès.');
  } catch (error) {
    console.error('Erreur lors de la fermeture de la connexion à la base de données:', error);
  }
}

// Exporter le client pour une utilisation directe si nécessaire
export { client as pgClient };
