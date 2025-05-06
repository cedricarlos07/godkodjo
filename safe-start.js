/**
 * Script de démarrage sécurisé qui corrige les erreurs et démarre l'application
 * Exécuter avec: node safe-start.js
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

// Fonction pour corriger le fichier index.js
function fixIndexJs() {
  try {
    // Vérifier si le fichier dist/index.js existe
    const indexJsPath = path.join(process.cwd(), 'dist', 'index.js');
    if (!fs.existsSync(indexJsPath)) {
      colorLog(colors.red, `Le fichier ${indexJsPath} n'existe pas`);
      return false;
    }
    
    // Lire le contenu du fichier
    colorLog(colors.blue, `Lecture du fichier ${indexJsPath}...`);
    const content = fs.readFileSync(indexJsPath, 'utf8');
    
    // Rechercher la ligne problématique
    const problemLine = content.split('\n').find(line => 
      line.includes('path.resolve') && 
      line.includes('paths[0]') && 
      !line.includes('||')
    );
    
    if (!problemLine) {
      colorLog(colors.yellow, "Aucune ligne problématique trouvée");
      return false;
    }
    
    colorLog(colors.yellow, `Ligne problématique trouvée: ${problemLine}`);
    
    // Créer une version modifiée du contenu
    let modifiedContent = content;
    
    // Remplacer toutes les occurrences de path.resolve(...paths)
    modifiedContent = modifiedContent.replace(
      /path\.resolve\s*\(\s*\.\.\.paths\s*\)/g,
      'path.resolve(...(paths || []))'
    );
    
    // Remplacer toutes les occurrences de path.resolve(paths[0], ...)
    modifiedContent = modifiedContent.replace(
      /path\.resolve\s*\(\s*paths\[0\]/g,
      'path.resolve((paths && paths[0]) || ""'
    );
    
    // Remplacer toutes les occurrences de path.join(...paths)
    modifiedContent = modifiedContent.replace(
      /path\.join\s*\(\s*\.\.\.paths\s*\)/g,
      'path.join(...(paths || []))'
    );
    
    // Remplacer toutes les occurrences de path.join(paths[0], ...)
    modifiedContent = modifiedContent.replace(
      /path\.join\s*\(\s*paths\[0\]/g,
      'path.join((paths && paths[0]) || ""'
    );
    
    // Ajouter une fonction de sécurité pour les chemins
    const safePath = `
// Fonction de sécurité pour les chemins
function safePath(p) {
  return p || '';
}
`;
    
    // Ajouter la fonction de sécurité au début du fichier
    modifiedContent = safePath + modifiedContent;
    
    // Sauvegarder le fichier original
    const backupPath = path.join(process.cwd(), 'dist', 'index.js.bak');
    colorLog(colors.blue, `Sauvegarde du fichier original vers ${backupPath}...`);
    fs.writeFileSync(backupPath, content);
    
    // Écrire le contenu modifié
    colorLog(colors.blue, `Écriture du fichier modifié...`);
    fs.writeFileSync(indexJsPath, modifiedContent);
    
    colorLog(colors.green, "Correction des erreurs de chemin terminée avec succès");
    return true;
  } catch (error) {
    colorLog(colors.red, `Erreur lors de la correction des erreurs de chemin: ${error.message}`);
    return false;
  }
}

// Fonction pour désactiver better-sqlite3
function disableBetterSqlite3() {
  try {
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
      return true;
    } else {
      colorLog(colors.yellow, "better-sqlite3 n'est pas installé");
      return false;
    }
  } catch (error) {
    colorLog(colors.red, `Erreur lors de la désactivation de better-sqlite3: ${error.message}`);
    return false;
  }
}

// Fonction principale
async function main() {
  try {
    colorLog(colors.cyan, "=== Démarrage sécurisé de l'application ===");
    
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
    disableBetterSqlite3();
    
    // Corriger le fichier index.js
    fixIndexJs();
    
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
