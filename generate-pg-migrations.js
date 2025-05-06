/**
 * Script pour générer les migrations PostgreSQL
 * Exécuter avec: node generate-pg-migrations.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Charger les variables d'environnement PostgreSQL
const envPgPath = path.join(process.cwd(), '.env.postgres');
if (fs.existsSync(envPgPath)) {
  console.log(`Chargement des variables d'environnement PostgreSQL depuis ${envPgPath}`);
  const envPg = dotenv.parse(fs.readFileSync(envPgPath));
  for (const key in envPg) {
    process.env[key] = envPg[key];
  }
}

// Vérifier si l'URL de la base de données est définie
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL n'est pas défini. Veuillez configurer votre fichier .env ou .env.postgres.");
  process.exit(1);
}

// Vérifier si le type de base de données est défini
if (process.env.DATABASE_TYPE !== 'postgres') {
  console.error("DATABASE_TYPE doit être 'postgres'. Veuillez configurer votre fichier .env ou .env.postgres.");
  process.exit(1);
}

// Créer le fichier de configuration Drizzle pour PostgreSQL
const drizzleConfig = {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }
};

// Écrire le fichier de configuration
const drizzleConfigPath = path.join(process.cwd(), 'drizzle.config.json');
fs.writeFileSync(drizzleConfigPath, JSON.stringify(drizzleConfig, null, 2));
console.log(`Fichier de configuration Drizzle créé: ${drizzleConfigPath}`);

// Créer le répertoire de migrations s'il n'existe pas
const migrationsDir = path.join(process.cwd(), 'drizzle');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
  console.log(`Répertoire de migrations créé: ${migrationsDir}`);
}

// Générer les migrations
try {
  console.log('Génération des migrations...');
  execSync('npx drizzle-kit generate:pg', { stdio: 'inherit' });
  console.log('Migrations générées avec succès.');
} catch (error) {
  console.error('Erreur lors de la génération des migrations:', error.message);
  process.exit(1);
}

// Créer un script pour exécuter les migrations
const migrationScript = `/**
 * Script pour exécuter les migrations PostgreSQL
 * Exécuter avec: node run-migrations.js
 */

const { db, runMigrations, closeConnection } = require('./dist/db-postgres');

async function main() {
  try {
    console.log('Exécution des migrations...');
    await runMigrations();
    console.log('Migrations exécutées avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'exécution des migrations:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

main();
`;

const migrationScriptPath = path.join(process.cwd(), 'run-migrations.js');
fs.writeFileSync(migrationScriptPath, migrationScript);
console.log(`Script d'exécution des migrations créé: ${migrationScriptPath}`);

// Mettre à jour le fichier package.json pour ajouter les scripts PostgreSQL
try {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Ajouter les scripts PostgreSQL
  packageJson.scripts = {
    ...packageJson.scripts,
    'db:pg:generate': 'node generate-pg-migrations.js',
    'db:pg:migrate': 'node run-migrations.js',
    'db:pg:studio': 'npx drizzle-kit studio',
    'start:pg': 'cross-env DATABASE_TYPE=postgres NODE_ENV=production node dist/index.js'
  };
  
  // Écrire le fichier package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Fichier package.json mis à jour avec les scripts PostgreSQL.');
} catch (error) {
  console.error('Erreur lors de la mise à jour du fichier package.json:', error.message);
}

console.log('\nConfiguration PostgreSQL terminée avec succès.');
console.log('\nPour exécuter les migrations, utilisez la commande:');
console.log('  npm run db:pg:migrate');
console.log('\nPour démarrer l\'application avec PostgreSQL, utilisez la commande:');
console.log('  npm run start:pg');
