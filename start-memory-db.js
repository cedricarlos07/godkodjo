/**
 * Script de secours pour démarrer l'application avec une base de données en mémoire
 * Exécuter avec: node start-memory-db.js
 */

const { spawn } = require('child_process');
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

console.log(`${colors.blue}Démarrage de l'application avec une base de données en mémoire${colors.reset}`);

// Créer le répertoire de données s'il n'existe pas
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  console.log(`${colors.yellow}Création du répertoire de données: ${dataDir}${colors.reset}`);
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`${colors.green}Répertoire de données créé avec succès${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Erreur lors de la création du répertoire de données:${colors.reset}`, error.message);
  }
}

// Créer un fichier .env.local pour forcer l'utilisation de la base de données en mémoire
try {
  fs.writeFileSync('.env.local', 'USE_MEMORY_DB=true\n', { encoding: 'utf8' });
  console.log(`${colors.green}Configuration mise à jour pour utiliser la base de données en mémoire${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Erreur lors de la mise à jour de la configuration:${colors.reset}`, error.message);
}

// Démarrer l'application
console.log(`${colors.blue}Démarrage de l'application...${colors.reset}`);

// Définir les variables d'environnement
const env = {
  ...process.env,
  NODE_ENV: 'production',
  USE_MEMORY_DB: 'true'
};

// Démarrer le processus Node.js
const child = spawn('node', ['dist/index.js'], {
  env,
  stdio: 'inherit',
  shell: true
});

// Gérer les événements du processus
child.on('error', (error) => {
  console.error(`${colors.red}Erreur lors du démarrage de l'application:${colors.reset}`, error.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`${colors.red}L'application s'est arrêtée avec le code ${code}${colors.reset}`);
    process.exit(code);
  }
});

// Transmettre les signaux au processus enfant
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
  process.on(signal, () => {
    console.log(`${colors.yellow}Signal ${signal} reçu, arrêt de l'application...${colors.reset}`);
    child.kill(signal);
  });
});
