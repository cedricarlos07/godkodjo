/**
 * Ce script remplace better-sqlite3 par une implémentation factice
 * pour éviter les erreurs de compilation sur Render.
 * 
 * Exécuter avec: node no-sqlite.js
 */

const fs = require('fs');
const path = require('path');

// Chemin vers le répertoire node_modules
const nodeModulesDir = path.join(process.cwd(), 'node_modules');

// Vérifier si better-sqlite3 est installé
const betterSqlitePath = path.join(nodeModulesDir, 'better-sqlite3');
if (fs.existsSync(betterSqlitePath)) {
  console.log('better-sqlite3 trouvé, création d\'une implémentation factice...');
  
  // Créer un répertoire de sauvegarde si nécessaire
  const backupDir = path.join(process.cwd(), 'backup-modules');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Sauvegarder le module original
  const backupPath = path.join(backupDir, 'better-sqlite3-backup');
  if (!fs.existsSync(backupPath)) {
    console.log('Sauvegarde du module original...');
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
  const indexJs = `/**
 * Implémentation factice de better-sqlite3
 */

class Database {
  constructor(filename, options) {
    this.filename = filename;
    this.options = options || {};
    this.open = true;
    console.log(\`[FAKE SQLite] Ouverture de la base de données: \${filename}\`);
  }

  prepare(sql) {
    console.log(\`[FAKE SQLite] Préparation de la requête: \${sql}\`);
    return {
      get: (...params) => {
        console.log(\`[FAKE SQLite] Exécution de get avec params: \${JSON.stringify(params)}\`);
        return {};
      },
      all: (...params) => {
        console.log(\`[FAKE SQLite] Exécution de all avec params: \${JSON.stringify(params)}\`);
        return [];
      },
      run: (...params) => {
        console.log(\`[FAKE SQLite] Exécution de run avec params: \${JSON.stringify(params)}\`);
        return { changes: 0, lastInsertRowid: 0 };
      },
      finalize: () => {
        console.log('[FAKE SQLite] Finalisation de la requête');
      }
    };
  }

  exec(sql) {
    console.log(\`[FAKE SQLite] Exécution de la requête: \${sql}\`);
    return this;
  }

  pragma(pragma) {
    console.log(\`[FAKE SQLite] Configuration du pragma: \${pragma}\`);
    return this;
  }

  function(name, fn) {
    console.log(\`[FAKE SQLite] Définition de la fonction: \${name}\`);
    return this;
  }

  aggregate(name, options) {
    console.log(\`[FAKE SQLite] Définition de l'agrégat: \${name}\`);
    return this;
  }

  loadExtension(path) {
    console.log(\`[FAKE SQLite] Chargement de l'extension: \${path}\`);
    return this;
  }

  close() {
    console.log('[FAKE SQLite] Fermeture de la base de données');
    this.open = false;
    return this;
  }

  defaultSafeIntegers(safe = true) {
    console.log(\`[FAKE SQLite] Configuration des entiers sécurisés: \${safe}\`);
    return this;
  }

  backup(destination, options) {
    console.log(\`[FAKE SQLite] Sauvegarde vers: \${destination}\`);
    return {
      step: (pages) => true,
      finish: () => {}
    };
  }
}

// Exporter la classe Database
module.exports = function(filename, options) {
  return new Database(filename, options);
};

// Exporter les propriétés et méthodes statiques
module.exports.Database = Database;
module.exports.verbose = function() {
  console.log('[FAKE SQLite] Mode verbose activé');
  return module.exports;
};
`;
  
  fs.writeFileSync(path.join(betterSqlitePath, 'index.js'), indexJs);
  
  console.log('Implémentation factice de better-sqlite3 créée avec succès.');
} else {
  console.log('better-sqlite3 n\'est pas installé, rien à faire.');
}

// Créer un fichier .env.local pour forcer l'utilisation de la base de données en mémoire
const envLocalPath = path.join(process.cwd(), '.env.local');
const envLocalContent = `# Configuration locale pour forcer l'utilisation de la base de données en mémoire
USE_MEMORY_DB=true
`;

fs.writeFileSync(envLocalPath, envLocalContent);
console.log('Fichier .env.local créé pour forcer l\'utilisation de la base de données en mémoire.');

console.log('Configuration terminée. L\'application utilisera maintenant une base de données en mémoire.');
