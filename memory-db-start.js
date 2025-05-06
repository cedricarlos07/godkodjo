/**
 * Script de démarrage alternatif qui n'utilise pas SQLite
 * Exécuter avec: node memory-db-start.js
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

// Fonction pour afficher un message avec une couleur
function colorLog(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Fonction pour exécuter une commande shell
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    colorLog(colors.blue, `Exécution de la commande: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      ...options,
      stdio: 'inherit',
      shell: true
    });
    
    child.on('error', (error) => {
      colorLog(colors.red, `Erreur lors de l'exécution de la commande: ${error.message}`);
      reject(error);
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        colorLog(colors.green, `Commande exécutée avec succès`);
        resolve();
      } else {
        colorLog(colors.red, `La commande a échoué avec le code ${code}`);
        reject(new Error(`La commande a échoué avec le code ${code}`));
      }
    });
  });
}

// Fonction principale
async function main() {
  try {
    colorLog(colors.cyan, "=== Démarrage de l'application avec une base de données en mémoire ===");
    
    // Créer le répertoire de données s'il n'existe pas
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      colorLog(colors.yellow, `Création du répertoire de données: ${dataDir}`);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Définir les permissions du répertoire de données
    try {
      fs.chmodSync(dataDir, 0o777);
      colorLog(colors.green, `Permissions du répertoire de données mises à jour`);
    } catch (error) {
      colorLog(colors.yellow, `Impossible de modifier les permissions du répertoire de données: ${error.message}`);
    }
    
    // Désactiver better-sqlite3
    colorLog(colors.blue, "Désactivation de better-sqlite3...");
    
    // Vérifier si le module better-sqlite3 est installé
    const betterSqlitePath = path.join(process.cwd(), 'node_modules', 'better-sqlite3');
    if (fs.existsSync(betterSqlitePath)) {
      // Créer un répertoire de sauvegarde
      const backupDir = path.join(process.cwd(), 'backup-modules');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Sauvegarder le module original
      const backupPath = path.join(backupDir, 'better-sqlite3-backup');
      if (!fs.existsSync(backupPath)) {
        colorLog(colors.yellow, "Sauvegarde du module original...");
        fs.cpSync(betterSqlitePath, backupPath, { recursive: true });
      }
      
      // Supprimer le module existant
      fs.rmSync(betterSqlitePath, { recursive: true, force: true });
      
      // Créer un nouveau répertoire pour le module factice
      fs.mkdirSync(betterSqlitePath, { recursive: true });
      
      // Créer un fichier package.json factice
      const packageJson = {
        name: 'better-sqlite3',
        version: '8.0.0',
        description: 'Fake implementation of better-sqlite3',
        main: 'index.js',
        license: 'MIT'
      };
      
      fs.writeFileSync(
        path.join(betterSqlitePath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
      
      // Créer un fichier index.js factice
      const indexJs = `
module.exports = function() {
  return {
    prepare: () => ({
      get: () => ({}),
      all: () => ([]),
      run: () => ({ changes: 0, lastInsertRowid: 0 })
    }),
    pragma: () => {},
    close: () => {},
    exec: () => {}
  };
};
module.exports.Database = function() {};
module.exports.verbose = function() { return module.exports; };
`;
      
      fs.writeFileSync(path.join(betterSqlitePath, 'index.js'), indexJs);
      
      colorLog(colors.green, "Implémentation factice de better-sqlite3 créée avec succès");
    } else {
      colorLog(colors.yellow, "better-sqlite3 n'est pas installé");
    }
    
    // Créer un fichier .env.local pour forcer l'utilisation de la base de données en mémoire
    const envLocalPath = path.join(process.cwd(), '.env.local');
    const envLocalContent = `# Configuration locale pour forcer l'utilisation de la base de données en mémoire
USE_MEMORY_DB=true
`;
    
    fs.writeFileSync(envLocalPath, envLocalContent);
    colorLog(colors.green, "Fichier .env.local créé pour forcer l'utilisation de la base de données en mémoire");
    
    // Démarrer l'application
    colorLog(colors.cyan, "Démarrage de l'application...");
    
    // Définir les variables d'environnement
    process.env.NODE_ENV = 'production';
    process.env.USE_MEMORY_DB = 'true';
    
    // Exécuter l'application
    await runCommand('node', ['dist/index.js'], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        USE_MEMORY_DB: 'true'
      }
    });
  } catch (error) {
    colorLog(colors.red, `Erreur lors du démarrage de l'application: ${error.message}`);
    process.exit(1);
  }
}

// Exécuter la fonction principale
main();
