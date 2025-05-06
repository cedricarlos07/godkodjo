#!/usr/bin/env node

/**
 * Script pour vérifier et installer les dépendances nécessaires
 * Exécuter avec: node check-deps.js
 */

const { execSync } = require('child_process');
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

// Fonction pour exécuter une commande shell
function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    return null;
  }
}

// Fonction pour vérifier si un module est installé
function isModuleInstalled(moduleName) {
  try {
    require.resolve(moduleName);
    return true;
  } catch (error) {
    return false;
  }
}

// Fonction pour installer un module
function installModule(moduleName, buildFromSource = false) {
  console.log(`${colors.yellow}Installation de ${moduleName}...${colors.reset}`);
  
  try {
    const command = buildFromSource 
      ? `npm install ${moduleName} --build-from-source` 
      : `npm install ${moduleName}`;
    
    execSync(command, { stdio: 'inherit' });
    console.log(`${colors.green}${moduleName} installé avec succès.${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Erreur lors de l'installation de ${moduleName}:${colors.reset}`, error.message);
    return false;
  }
}

// Fonction pour vérifier les dépendances SQLite
function checkSqliteDependencies() {
  console.log(`${colors.blue}Vérification des dépendances SQLite...${colors.reset}`);
  
  // Vérifier si better-sqlite3 est installé
  const betterSqliteInstalled = isModuleInstalled('better-sqlite3');
  
  if (betterSqliteInstalled) {
    console.log(`${colors.green}better-sqlite3 est déjà installé.${colors.reset}`);
    
    // Vérifier si better-sqlite3 fonctionne correctement
    try {
      const Database = require('better-sqlite3');
      const db = new Database(':memory:');
      db.pragma('journal_mode = WAL');
      db.close();
      console.log(`${colors.green}better-sqlite3 fonctionne correctement.${colors.reset}`);
      return true;
    } catch (error) {
      console.error(`${colors.red}better-sqlite3 est installé mais ne fonctionne pas correctement:${colors.reset}`, error.message);
      
      // Essayer de reconstruire better-sqlite3
      console.log(`${colors.yellow}Tentative de reconstruction de better-sqlite3...${colors.reset}`);
      
      try {
        execSync('npm rebuild better-sqlite3 --build-from-source', { stdio: 'inherit' });
        
        // Vérifier à nouveau
        try {
          const Database = require('better-sqlite3');
          const db = new Database(':memory:');
          db.pragma('journal_mode = WAL');
          db.close();
          console.log(`${colors.green}better-sqlite3 reconstruit avec succès.${colors.reset}`);
          return true;
        } catch (rebuildError) {
          console.error(`${colors.red}La reconstruction a échoué:${colors.reset}`, rebuildError.message);
        }
      } catch (rebuildError) {
        console.error(`${colors.red}Erreur lors de la reconstruction:${colors.reset}`, rebuildError.message);
      }
    }
  }
  
  // Si better-sqlite3 n'est pas installé ou ne fonctionne pas, essayer de l'installer
  console.log(`${colors.yellow}Tentative d'installation de better-sqlite3...${colors.reset}`);
  const installed = installModule('better-sqlite3', true);
  
  if (installed) {
    // Vérifier si l'installation a réussi
    try {
      const Database = require('better-sqlite3');
      const db = new Database(':memory:');
      db.pragma('journal_mode = WAL');
      db.close();
      console.log(`${colors.green}better-sqlite3 installé et fonctionne correctement.${colors.reset}`);
      return true;
    } catch (error) {
      console.error(`${colors.red}better-sqlite3 installé mais ne fonctionne toujours pas:${colors.reset}`, error.message);
    }
  }
  
  // Si better-sqlite3 ne fonctionne toujours pas, utiliser l'implémentation en mémoire
  console.log(`${colors.yellow}Impossible d'utiliser better-sqlite3, l'application utilisera une implémentation en mémoire.${colors.reset}`);
  
  // Créer un fichier .env.local pour désactiver SQLite
  try {
    fs.writeFileSync('.env.local', 'USE_MEMORY_DB=true\n', { encoding: 'utf8' });
    console.log(`${colors.green}Configuration mise à jour pour utiliser la base de données en mémoire.${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Erreur lors de la mise à jour de la configuration:${colors.reset}`, error.message);
  }
  
  return false;
}

// Fonction principale
function main() {
  console.log(`${colors.cyan}Vérification des dépendances...${colors.reset}`);
  
  // Vérifier la version de Node.js
  const nodeVersion = process.version;
  console.log(`${colors.blue}Version de Node.js: ${nodeVersion}${colors.reset}`);
  
  // Vérifier les dépendances SQLite
  const sqliteOk = checkSqliteDependencies();
  
  // Créer le répertoire de données s'il n'existe pas
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    console.log(`${colors.yellow}Création du répertoire de données: ${dataDir}${colors.reset}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Résumé
  console.log('\n' + '-'.repeat(50));
  console.log(`${colors.cyan}Résumé de la vérification des dépendances:${colors.reset}`);
  console.log(`${colors.blue}Node.js: ${nodeVersion}${colors.reset}`);
  console.log(`${colors.blue}SQLite: ${sqliteOk ? colors.green + 'OK' : colors.yellow + 'Utilisation de l\'implémentation en mémoire'}${colors.reset}`);
  console.log(`${colors.blue}Répertoire de données: ${fs.existsSync(dataDir) ? colors.green + 'OK' : colors.red + 'NON'}${colors.reset}`);
  console.log('-'.repeat(50) + '\n');
  
  console.log(`${colors.green}Vérification des dépendances terminée.${colors.reset}`);
}

// Exécuter la fonction principale
main();
