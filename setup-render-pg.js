/**
 * Script pour configurer la base de données PostgreSQL sur Render
 * Exécuter avec: node setup-render-pg.js
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

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

// Fonction pour lire l'entrée utilisateur
function prompt(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// Charger les variables d'environnement
dotenv.config();

// Fonction principale
async function main() {
  colorLog(colors.cyan, "=== Configuration de la base de données PostgreSQL sur Render ===");
  
  // Demander l'URL de connexion PostgreSQL
  let connectionUrl = process.env.DATABASE_URL;
  
  if (!connectionUrl) {
    colorLog(colors.yellow, "DATABASE_URL n'est pas défini dans les variables d'environnement.");
    connectionUrl = await prompt("Veuillez entrer l'URL de connexion PostgreSQL fournie par Render: ");
    
    if (!connectionUrl) {
      colorLog(colors.red, "Aucune URL de connexion fournie. Impossible de continuer.");
      process.exit(1);
    }
  }
  
  // Masquer l'URL pour la sécurité
  const maskedUrl = connectionUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  colorLog(colors.blue, `URL de connexion: ${maskedUrl}`);
  
  // Créer une connexion à la base de données PostgreSQL
  const sql = postgres(connectionUrl, { 
    max: 1,
    idle_timeout: 10,
    connect_timeout: 10,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Tester la connexion
    colorLog(colors.blue, "Test de la connexion...");
    const result = await sql`SELECT version()`;
    
    // Afficher la version de PostgreSQL
    colorLog(colors.green, "Connexion réussie!");
    colorLog(colors.green, `Version de PostgreSQL: ${result[0].version}`);
    
    // Créer un fichier .env.local avec l'URL de connexion
    const envLocalPath = path.join(__dirname, '.env.local');
    const envLocalContent = `# Configuration pour PostgreSQL sur Render
DATABASE_TYPE=postgres
DATABASE_URL=${connectionUrl}
`;
    
    fs.writeFileSync(envLocalPath, envLocalContent);
    colorLog(colors.green, `Fichier .env.local créé avec l'URL de connexion PostgreSQL: ${envLocalPath}`);
    
    // Créer un fichier .env.postgres avec l'URL de connexion
    const envPgPath = path.join(__dirname, '.env.postgres');
    const envPgContent = `# Configuration pour PostgreSQL sur Render
DATABASE_TYPE=postgres
DATABASE_URL=${connectionUrl}
`;
    
    fs.writeFileSync(envPgPath, envPgContent);
    colorLog(colors.green, `Fichier .env.postgres créé avec l'URL de connexion PostgreSQL: ${envPgPath}`);
    
    // Vérifier si les tables existent déjà
    colorLog(colors.blue, "Vérification des tables existantes...");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    if (tables.length === 0) {
      colorLog(colors.yellow, "Aucune table trouvée. Voulez-vous exécuter les migrations pour créer les tables?");
      const runMigrations = await prompt("Exécuter les migrations? (o/n): ");
      
      if (runMigrations.toLowerCase() === 'o' || runMigrations.toLowerCase() === 'oui') {
        colorLog(colors.blue, "Exécution des migrations...");
        
        // Exécuter les migrations
        try {
          // Générer les migrations
          colorLog(colors.blue, "Génération des migrations...");
          await import('./generate-pg-migrations.js');
          
          // Exécuter les migrations
          colorLog(colors.blue, "Exécution des migrations...");
          await import('./run-migrations.js');
          
          colorLog(colors.green, "Migrations exécutées avec succès!");
        } catch (error) {
          colorLog(colors.red, `Erreur lors de l'exécution des migrations: ${error.message}`);
        }
      }
    } else {
      colorLog(colors.green, "Tables existantes:");
      tables.forEach(table => {
        colorLog(colors.green, `- ${table.table_name}`);
      });
    }
    
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
  
  colorLog(colors.cyan, "=== Configuration terminée ===");
  colorLog(colors.green, "Votre application est maintenant configurée pour utiliser PostgreSQL sur Render!");
  colorLog(colors.green, "Pour démarrer l'application avec PostgreSQL, utilisez la commande:");
  colorLog(colors.green, "  npm run start:pg");
}

// Exécuter la fonction principale
main();
