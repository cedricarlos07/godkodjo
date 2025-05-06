/**
 * Script pour vérifier la connexion à la base de données PostgreSQL
 * Exécuter avec: node check-pg-connection.js
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Fonction pour afficher un message avec une couleur
function colorLog(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Charger les variables d'environnement
dotenv.config();

// Charger les variables d'environnement PostgreSQL
const envPgPath = path.join(__dirname, '.env.postgres');
if (fs.existsSync(envPgPath)) {
  colorLog(colors.blue, `Chargement des variables d'environnement PostgreSQL depuis ${envPgPath}`);
  const envPg = dotenv.parse(fs.readFileSync(envPgPath));
  for (const key in envPg) {
    process.env[key] = envPg[key];
  }
}

// Vérifier si l'URL de la base de données est définie
if (!process.env.DATABASE_URL) {
  colorLog(colors.red, "DATABASE_URL n'est pas défini. Veuillez configurer votre fichier .env ou .env.postgres.");
  process.exit(1);
}

// Fonction principale
async function main() {
  colorLog(colors.cyan, "=== Vérification de la connexion à la base de données PostgreSQL ===");
  
  // Afficher l'URL de connexion (masquée pour la sécurité)
  const connectionUrl = process.env.DATABASE_URL;
  const maskedUrl = connectionUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  colorLog(colors.blue, `URL de connexion: ${maskedUrl}`);
  
  // Créer une connexion à la base de données PostgreSQL
  const sql = postgres(connectionUrl, { 
    max: 1,
    idle_timeout: 10,
    connect_timeout: 10,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    // Tester la connexion
    colorLog(colors.blue, "Test de la connexion...");
    const result = await sql`SELECT version()`;
    
    // Afficher la version de PostgreSQL
    colorLog(colors.green, "Connexion réussie!");
    colorLog(colors.green, `Version de PostgreSQL: ${result[0].version}`);
    
    // Lister les tables
    colorLog(colors.blue, "Liste des tables...");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    if (tables.length === 0) {
      colorLog(colors.yellow, "Aucune table trouvée. Vous devrez exécuter les migrations.");
    } else {
      colorLog(colors.green, "Tables trouvées:");
      tables.forEach(table => {
        colorLog(colors.green, `- ${table.table_name}`);
      });
    }
    
    // Vérifier l'espace disque
    colorLog(colors.blue, "Vérification de l'espace disque...");
    const dbSize = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    
    colorLog(colors.green, `Taille de la base de données: ${dbSize[0].size}`);
    
    // Vérifier les connexions actives
    colorLog(colors.blue, "Vérification des connexions actives...");
    const connections = await sql`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    
    colorLog(colors.green, `Nombre de connexions actives: ${connections[0].count}`);
    
  } catch (error) {
    colorLog(colors.red, `Erreur lors de la connexion à la base de données: ${error.message}`);
    
    // Afficher des conseils de dépannage
    colorLog(colors.yellow, "\nConseils de dépannage:");
    colorLog(colors.yellow, "1. Vérifiez que l'URL de connexion est correcte");
    colorLog(colors.yellow, "2. Vérifiez que la base de données est en cours d'exécution");
    colorLog(colors.yellow, "3. Vérifiez que les informations d'identification sont correctes");
    colorLog(colors.yellow, "4. Vérifiez que le pare-feu autorise les connexions");
    colorLog(colors.yellow, "5. Sur Render, vérifiez que la base de données est liée au service web");
    
    process.exit(1);
  } finally {
    // Fermer la connexion
    await sql.end();
  }
  
  colorLog(colors.cyan, "=== Vérification terminée ===");
}

// Exécuter la fonction principale
main();
