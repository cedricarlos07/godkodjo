/**
 * Script pour vérifier l'état de la base de données
 * Exécuter avec: node check-db-status.js
 */

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

// Fonction pour vérifier si un module est installé
function isModuleInstalled(moduleName) {
  try {
    require.resolve(moduleName);
    return true;
  } catch (error) {
    return false;
  }
}

// Fonction pour vérifier si better-sqlite3 fonctionne
function checkSqlite() {
  colorLog(colors.blue, "Vérification de better-sqlite3...");
  
  if (!isModuleInstalled('better-sqlite3')) {
    colorLog(colors.red, "better-sqlite3 n'est pas installé");
    return false;
  }
  
  try {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    
    // Vérifier si la base de données fonctionne
    db.prepare('SELECT 1').get();
    
    // Vérifier si les pragmas fonctionnent
    try {
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
    } catch (pragmaError) {
      colorLog(colors.yellow, "Avertissement: Les pragmas SQLite ne fonctionnent pas correctement");
      colorLog(colors.yellow, pragmaError.message);
    }
    
    // Vérifier si les opérations de base fonctionnent
    try {
      db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');
      db.prepare('INSERT INTO test (value) VALUES (?)').run('test');
      const result = db.prepare('SELECT * FROM test').get();
      
      if (result && result.value === 'test') {
        colorLog(colors.green, "Les opérations de base SQLite fonctionnent correctement");
      } else {
        colorLog(colors.yellow, "Avertissement: Les opérations de base SQLite ne fonctionnent pas comme prévu");
      }
    } catch (opError) {
      colorLog(colors.yellow, "Avertissement: Les opérations de base SQLite ne fonctionnent pas correctement");
      colorLog(colors.yellow, opError.message);
    }
    
    // Fermer la base de données
    db.close();
    
    colorLog(colors.green, "better-sqlite3 fonctionne correctement");
    return true;
  } catch (error) {
    colorLog(colors.red, "better-sqlite3 est installé mais ne fonctionne pas correctement");
    colorLog(colors.red, error.message);
    return false;
  }
}

// Fonction pour vérifier l'état du système de fichiers
function checkFileSystem() {
  colorLog(colors.blue, "Vérification du système de fichiers...");
  
  const fs = require('fs');
  const path = require('path');
  
  // Vérifier si le répertoire de données existe
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    colorLog(colors.yellow, `Le répertoire de données ${dataDir} n'existe pas`);
    
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      colorLog(colors.green, `Répertoire de données ${dataDir} créé avec succès`);
    } catch (mkdirError) {
      colorLog(colors.red, `Impossible de créer le répertoire de données ${dataDir}`);
      colorLog(colors.red, mkdirError.message);
      return false;
    }
  } else {
    colorLog(colors.green, `Le répertoire de données ${dataDir} existe`);
  }
  
  // Vérifier les permissions du répertoire de données
  try {
    fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
    colorLog(colors.green, `Le répertoire de données ${dataDir} est accessible en lecture/écriture`);
  } catch (accessError) {
    colorLog(colors.red, `Le répertoire de données ${dataDir} n'est pas accessible en lecture/écriture`);
    colorLog(colors.red, accessError.message);
    
    try {
      fs.chmodSync(dataDir, 0o777);
      colorLog(colors.green, `Permissions du répertoire de données ${dataDir} mises à jour`);
    } catch (chmodError) {
      colorLog(colors.red, `Impossible de modifier les permissions du répertoire de données ${dataDir}`);
      colorLog(colors.red, chmodError.message);
      return false;
    }
  }
  
  // Vérifier si on peut écrire dans le répertoire de données
  const testFile = path.join(dataDir, 'test.txt');
  try {
    fs.writeFileSync(testFile, 'test', { encoding: 'utf8' });
    colorLog(colors.green, `Écriture dans le répertoire de données réussie`);
    
    // Supprimer le fichier de test
    fs.unlinkSync(testFile);
  } catch (writeError) {
    colorLog(colors.red, `Impossible d'écrire dans le répertoire de données`);
    colorLog(colors.red, writeError.message);
    return false;
  }
  
  return true;
}

// Fonction pour vérifier l'état de la mémoire
function checkMemory() {
  colorLog(colors.blue, "Vérification de la mémoire disponible...");
  
  const os = require('os');
  
  // Obtenir la mémoire totale et libre
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  // Convertir en Mo
  const totalMemoryMB = Math.round(totalMemory / 1024 / 1024);
  const freeMemoryMB = Math.round(freeMemory / 1024 / 1024);
  const usedMemoryMB = Math.round(usedMemory / 1024 / 1024);
  
  // Calculer le pourcentage d'utilisation
  const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);
  
  colorLog(colors.blue, `Mémoire totale: ${totalMemoryMB} Mo`);
  colorLog(colors.blue, `Mémoire libre: ${freeMemoryMB} Mo`);
  colorLog(colors.blue, `Mémoire utilisée: ${usedMemoryMB} Mo (${memoryUsagePercent}%)`);
  
  // Vérifier si la mémoire est suffisante
  if (freeMemoryMB < 100) {
    colorLog(colors.red, "Avertissement: Mémoire libre insuffisante (< 100 Mo)");
    return false;
  } else if (freeMemoryMB < 200) {
    colorLog(colors.yellow, "Avertissement: Mémoire libre faible (< 200 Mo)");
    return true;
  } else {
    colorLog(colors.green, "Mémoire libre suffisante");
    return true;
  }
}

// Fonction principale
function main() {
  colorLog(colors.cyan, "=== Vérification de l'état de la base de données ===");
  
  // Vérifier l'environnement
  colorLog(colors.blue, "Environnement:");
  colorLog(colors.blue, `Node.js: ${process.version}`);
  colorLog(colors.blue, `Plateforme: ${process.platform}`);
  colorLog(colors.blue, `Architecture: ${process.arch}`);
  colorLog(colors.blue, `Répertoire courant: ${process.cwd()}`);
  
  // Vérifier le système de fichiers
  const fsOk = checkFileSystem();
  
  // Vérifier la mémoire
  const memoryOk = checkMemory();
  
  // Vérifier SQLite
  const sqliteOk = checkSqlite();
  
  // Afficher le résumé
  colorLog(colors.cyan, "\n=== Résumé ===");
  colorLog(sqliteOk ? colors.green : colors.red, `SQLite: ${sqliteOk ? 'OK' : 'NON'}`);
  colorLog(fsOk ? colors.green : colors.red, `Système de fichiers: ${fsOk ? 'OK' : 'NON'}`);
  colorLog(memoryOk ? colors.green : colors.yellow, `Mémoire: ${memoryOk ? 'OK' : 'Faible'}`);
  
  // Recommandation
  colorLog(colors.cyan, "\n=== Recommandation ===");
  if (sqliteOk && fsOk && memoryOk) {
    colorLog(colors.green, "Tout est OK. Vous pouvez utiliser la base de données SQLite.");
  } else if (fsOk && memoryOk) {
    colorLog(colors.yellow, "SQLite ne fonctionne pas correctement. Utilisez la base de données en mémoire.");
    colorLog(colors.yellow, "Exécutez: node start-memory-db.js");
  } else if (!fsOk) {
    colorLog(colors.red, "Problème avec le système de fichiers. Vérifiez les permissions.");
  } else if (!memoryOk) {
    colorLog(colors.yellow, "Mémoire faible. Surveillez l'utilisation de la mémoire.");
  }
}

// Exécuter la fonction principale
main();
