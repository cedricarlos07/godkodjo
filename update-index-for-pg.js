/**
 * Script pour modifier index.ts pour utiliser PostgreSQL
 * Exécuter avec: node update-index-for-pg.js
 */

const fs = require('fs');
const path = require('path');

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

// Fonction principale
async function main() {
  try {
    colorLog(colors.cyan, "=== Modification de index.ts pour utiliser PostgreSQL ===");
    
    // Vérifier si le fichier server/index.ts existe
    const indexTsPath = path.join(process.cwd(), 'server', 'index.ts');
    if (!fs.existsSync(indexTsPath)) {
      colorLog(colors.red, `Le fichier ${indexTsPath} n'existe pas`);
      return;
    }
    
    // Lire le contenu du fichier
    colorLog(colors.blue, `Lecture du fichier ${indexTsPath}...`);
    const content = fs.readFileSync(indexTsPath, 'utf8');
    
    // Ajouter l'importation de db-postgres
    let modifiedContent = content;
    
    // Ajouter l'importation conditionnelle de db ou db-postgres
    const importStatement = `
// Importer la base de données en fonction du type
let db, runMigrations;
if (process.env.DATABASE_TYPE === 'postgres') {
  try {
    const pgModule = await import('./db-postgres.js');
    db = pgModule.db;
    runMigrations = pgModule.runMigrations;
    console.log('Utilisation de la base de données PostgreSQL');
    
    // Exécuter les migrations si nécessaire
    if (process.env.RUN_MIGRATIONS === 'true') {
      console.log('Exécution des migrations PostgreSQL...');
      await runMigrations();
      console.log('Migrations PostgreSQL exécutées avec succès');
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de PostgreSQL:', error);
    process.exit(1);
  }
} else {
  try {
    const sqliteModule = await import('./db.js');
    db = sqliteModule.db;
    console.log('Utilisation de la base de données SQLite');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de SQLite:', error);
    process.exit(1);
  }
}
`;
    
    // Remplacer l'importation de db
    modifiedContent = modifiedContent.replace(
      /import\s+{\s*db\s*(?:,\s*sqlite\s*)?\s*}\s*from\s*["']\.\/db["'];?/,
      ''
    );
    
    // Ajouter l'importation conditionnelle après les autres importations
    modifiedContent = modifiedContent.replace(
      /(import.*?;(\r?\n)*)+/,
      `$&\n${importStatement}\n`
    );
    
    // Sauvegarder le fichier original
    const backupPath = path.join(process.cwd(), 'server', 'index.ts.bak');
    colorLog(colors.blue, `Sauvegarde du fichier original vers ${backupPath}...`);
    fs.writeFileSync(backupPath, content);
    
    // Écrire le contenu modifié
    colorLog(colors.blue, `Écriture du fichier modifié...`);
    fs.writeFileSync(indexTsPath, modifiedContent);
    
    colorLog(colors.green, "Modification de index.ts terminée avec succès");
    
    // Créer un fichier .env.local pour forcer l'utilisation de PostgreSQL
    const envLocalPath = path.join(process.cwd(), '.env.local');
    const envLocalContent = `# Configuration locale pour forcer l'utilisation de PostgreSQL
DATABASE_TYPE=postgres
DATABASE_URL=postgres://kodjo_user:password@localhost:5432/kodjo_english
`;
    
    fs.writeFileSync(envLocalPath, envLocalContent);
    colorLog(colors.green, "Fichier .env.local créé pour forcer l'utilisation de PostgreSQL");
    
    colorLog(colors.cyan, "=== Modification terminée ===");
    colorLog(colors.yellow, "N'oubliez pas de mettre à jour DATABASE_URL dans .env.local avec l'URL fournie par Render");
  } catch (error) {
    colorLog(colors.red, `Erreur lors de la modification de index.ts: ${error.message}`);
    process.exit(1);
  }
}

// Exécuter la fonction principale
main();
