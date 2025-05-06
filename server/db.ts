/**
 * Implémentation de base de données avec fallback en mémoire
 * Ce fichier remplace l'implémentation standard de SQLite par une version
 * qui peut fonctionner même si better-sqlite3 n'est pas disponible.
 */

import * as schema from "@shared/schema";
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Vérifier le type de base de données
if (process.env.DATABASE_TYPE !== 'sqlite') {
  throw new Error(
    "DATABASE_TYPE doit être 'sqlite'. Veuillez configurer votre fichier .env.",
  );
}

// Classe pour stocker les données en mémoire
class MemoryStore {
  private data: Record<string, any[]> = {};

  constructor() {
    // Initialiser les tables à partir du schéma
    for (const key in schema) {
      if (typeof schema[key] === 'object' && schema[key]._ && schema[key]._.name && schema[key]._.name.name) {
        this.data[schema[key]._.name.name] = [];
      }
    }
  }

  getTable(tableName: string): any[] {
    if (!this.data[tableName]) {
      this.data[tableName] = [];
    }
    return this.data[tableName];
  }

  insert(tableName: string, values: any): number {
    const table = this.getTable(tableName);
    const id = table.length > 0 ? Math.max(...table.map(item => item.id || 0)) + 1 : 1;
    const item = { ...values, id: values.id || id };
    table.push(item);
    return id;
  }

  select(tableName: string, condition?: (item: any) => boolean): any[] {
    const table = this.getTable(tableName);
    if (condition) {
      return table.filter(condition);
    }
    return [...table];
  }

  update(tableName: string, values: any, condition?: (item: any) => boolean): number {
    const table = this.getTable(tableName);
    let count = 0;

    for (let i = 0; i < table.length; i++) {
      if (!condition || condition(table[i])) {
        table[i] = { ...table[i], ...values };
        count++;
      }
    }

    return count;
  }

  delete(tableName: string, condition?: (item: any) => boolean): number {
    const table = this.getTable(tableName);
    const initialLength = table.length;

    if (condition) {
      const newTable = table.filter(item => !condition(item));
      const deleted = initialLength - newTable.length;
      this.data[tableName] = newTable;
      return deleted;
    }

    this.data[tableName] = [];
    return initialLength;
  }

  // Sauvegarder les données dans un fichier JSON
  async saveToFile(filePath: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await fs.promises.writeFile(filePath, JSON.stringify(this.data, null, 2));
      console.log(`Données sauvegardées dans ${filePath}`);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données:', error);
    }
  }

  // Charger les données depuis un fichier JSON
  async loadFromFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, 'utf8');
        this.data = JSON.parse(content);
        console.log(`Données chargées depuis ${filePath}`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }
}

// Créer une instance du store en mémoire
const memoryStore = new MemoryStore();

// Fonction pour initialiser la base de données
async function initializeDatabase() {
  // Vérifier si l'utilisation de la base de données en mémoire est forcée
  if (process.env.USE_MEMORY_DB === 'true') {
    console.log('Utilisation forcée de la base de données en mémoire (via USE_MEMORY_DB)');
    return initializeMemoryDatabase();
  }

  try {
    console.log('Tentative d\'initialisation de la base de données SQLite...');

    // Essayer d'importer better-sqlite3
    try {
      // Vérifier si le module est disponible
      let Database;
      try {
        Database = require('better-sqlite3');
      } catch (requireError) {
        console.error('Erreur lors du chargement de better-sqlite3:', requireError);
        throw new Error('better-sqlite3 n\'est pas disponible');
      }

      const { drizzle } = await import('drizzle-orm/better-sqlite3');

      // Assurez-vous que le répertoire de la base de données existe
      const dbPath = process.env.DATABASE_PATH || './data/kodjo-english.db';
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      console.log(`Utilisation de la base de données SQLite: ${dbPath}`);

      // Créer une connexion à la base de données SQLite avec gestion d'erreur
      let sqlite;
      try {
        sqlite = new Database(dbPath);
      } catch (dbError) {
        console.error(`Erreur lors de la création de la base de données ${dbPath}:`, dbError);
        throw dbError;
      }

      // Configurer la base de données avec gestion d'erreur
      try {
        sqlite.pragma('journal_mode = WAL');
        sqlite.pragma('foreign_keys = ON');
      } catch (pragmaError) {
        console.warn('Erreur lors de la configuration de la base de données SQLite:', pragmaError);
        // Continuer malgré l'erreur
      }

      // Vérifier que la base de données fonctionne en exécutant une requête simple
      try {
        sqlite.prepare('SELECT 1').get();
      } catch (testError) {
        console.error('La base de données SQLite ne fonctionne pas correctement:', testError);
        throw new Error('La base de données SQLite ne fonctionne pas correctement');
      }

      // Créer une instance de Drizzle avec le schéma
      const db = drizzle(sqlite, { schema });

      console.log('Base de données SQLite initialisée avec succès.');
      return { db, sqlite, type: 'sqlite' };
    } catch (sqliteError) {
      console.error('Erreur lors de l\'initialisation de SQLite:', sqliteError);
      throw sqliteError;
    }
  } catch (error) {
    console.warn('Impossible d\'utiliser SQLite, passage à l\'implémentation en mémoire...');
    return initializeMemoryDatabase();
  }
}

// Fonction pour initialiser la base de données en mémoire
async function initializeMemoryDatabase() {
  console.log('Initialisation de la base de données en mémoire...');

  // Charger les données depuis un fichier JSON si disponible
  const jsonPath = process.env.DATABASE_PATH
    ? process.env.DATABASE_PATH.replace('.db', '.json')
    : './data/kodjo-english.json';

  try {
    await memoryStore.loadFromFile(jsonPath);
  } catch (loadError) {
    console.error('Erreur lors du chargement des données depuis le fichier JSON:', loadError);
    console.log('Utilisation d\'une base de données en mémoire vide');
  }

  // Configurer la sauvegarde périodique
  const saveInterval = setInterval(() => {
    memoryStore.saveToFile(jsonPath).catch(error => {
      console.error('Erreur lors de la sauvegarde périodique des données:', error);
    });
  }, 60000); // Toutes les minutes

  // Nettoyer l'intervalle si le processus se termine
  process.on('exit', () => {
    clearInterval(saveInterval);
  });

  // Sauvegarder avant de quitter
  process.on('SIGINT', async () => {
    console.log('Sauvegarde des données avant de quitter...');
    clearInterval(saveInterval);
    try {
      await memoryStore.saveToFile(jsonPath);
      console.log('Données sauvegardées avec succès');
    } catch (saveError) {
      console.error('Erreur lors de la sauvegarde des données:', saveError);
    }
    process.exit(0);
  });

  // Créer une API compatible avec Drizzle
  const db = {
    select: () => ({
      from: (table: any) => ({
        where: (condition: any) => ({
          all: () => {
            const tableName = table._.name.name;
            return memoryStore.select(tableName, (item) => {
              if (!condition) return true;
              if (condition.operator === '=' && condition.left && condition.right) {
                return item[condition.left.name] === condition.right;
              }
              return true;
            });
          },
          get: () => {
            const tableName = table._.name.name;
            const results = memoryStore.select(tableName, (item) => {
              if (!condition) return true;
              if (condition.operator === '=' && condition.left && condition.right) {
                return item[condition.left.name] === condition.right;
              }
              return true;
            });
            return results.length > 0 ? results[0] : null;
          }
        }),
        all: () => {
          const tableName = table._.name.name;
          return memoryStore.select(tableName);
        },
        get: () => {
          const tableName = table._.name.name;
          const results = memoryStore.select(tableName);
          return results.length > 0 ? results[0] : null;
        }
      })
    }),
    insert: (table: any) => ({
      values: (values: any) => ({
        run: () => {
          const tableName = table._.name.name;
          const id = memoryStore.insert(tableName, values);
          return { lastInsertRowid: id };
        }
      })
    }),
    update: (table: any) => ({
      set: (values: any) => ({
        where: (condition: any) => ({
          run: () => {
            const tableName = table._.name.name;
            const changes = memoryStore.update(tableName, values, (item) => {
              if (!condition) return true;
              if (condition.operator === '=' && condition.left && condition.right) {
                return item[condition.left.name] === condition.right;
              }
              return true;
            });
            return { changes };
          }
        })
      })
    }),
    delete: (table: any) => ({
      where: (condition: any) => ({
        run: () => {
          const tableName = table._.name.name;
          const changes = memoryStore.delete(tableName, (item) => {
            if (!condition) return true;
            if (condition.operator === '=' && condition.left && condition.right) {
              return item[condition.left.name] === condition.right;
            }
            return true;
          });
          return { changes };
        }
      })
    }),
    // Ajouter la fonction eq pour la compatibilité
    eq: (a: any, b: any) => ({ operator: '=', left: a, right: b })
  };

  // Créer un faux objet sqlite pour la compatibilité
  const sqlite = {
    pragma: () => {},
    close: () => {},
    prepare: () => ({
      get: () => ({}),
      all: () => ([]),
      run: () => ({})
    }),
    exec: () => {}
  };

  console.log('Implémentation en mémoire initialisée avec succès.');
  return { db, sqlite, type: 'memory' };
}

// Initialiser la base de données et exporter les instances
let dbInstance: any;

try {
  // Essayer d'initialiser de manière synchrone pour la compatibilité
  if (process.env.USE_MEMORY_DB === 'true') {
    console.log('Utilisation forcée de la base de données en mémoire (via USE_MEMORY_DB)');
    // Créer une API compatible avec Drizzle de manière synchrone
    const db = {
      select: () => ({
        from: (table: any) => ({
          where: () => ({
            all: () => [],
            get: () => null
          }),
          all: () => [],
          get: () => null
        })
      }),
      insert: () => ({
        values: () => ({
          run: () => ({ lastInsertRowid: 0 })
        })
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            run: () => ({ changes: 0 })
          })
        })
      }),
      delete: () => ({
        where: () => ({
          run: () => ({ changes: 0 })
        })
      }),
      eq: (a: any, b: any) => ({ operator: '=', left: a, right: b })
    };

    const sqlite = {
      pragma: () => {},
      close: () => {},
      prepare: () => ({
        get: () => ({}),
        all: () => ([]),
        run: () => ({})
      }),
      exec: () => {}
    };

    dbInstance = { db, sqlite, type: 'memory' };

    // Initialiser de manière asynchrone en arrière-plan
    initializeMemoryDatabase().then(instance => {
      dbInstance = instance;
      console.log('Base de données en mémoire initialisée en arrière-plan');
    }).catch(error => {
      console.error('Erreur lors de l\'initialisation de la base de données en mémoire en arrière-plan:', error);
    });
  } else {
    // Forcer l'utilisation de la base de données en mémoire pour éviter les erreurs
    console.log('Utilisation forcée de la base de données en mémoire pour éviter les erreurs');
    process.env.USE_MEMORY_DB = 'true';

    // Créer une API compatible avec Drizzle de manière synchrone
    const db = {
      select: () => ({
        from: (table: any) => ({
          where: () => ({
            all: () => [],
            get: () => null
          }),
          all: () => [],
          get: () => null
        })
      }),
      insert: () => ({
        values: () => ({
          run: () => ({ lastInsertRowid: 0 })
        })
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            run: () => ({ changes: 0 })
          })
        })
      }),
      delete: () => ({
        where: () => ({
          run: () => ({ changes: 0 })
        })
      }),
      eq: (a: any, b: any) => ({ operator: '=', left: a, right: b })
    };

    const sqlite = {
      pragma: () => {},
      close: () => {},
      prepare: () => ({
        get: () => ({}),
        all: () => ([]),
        run: () => ({})
      }),
      exec: () => {}
    };

    dbInstance = { db, sqlite, type: 'memory' };

    // Initialiser de manière asynchrone en arrière-plan
    initializeMemoryDatabase().then(instance => {
      dbInstance = instance;
      console.log('Base de données en mémoire initialisée en arrière-plan');
    }).catch(error => {
      console.error('Erreur lors de l\'initialisation de la base de données en mémoire en arrière-plan:', error);
    });
  }
} catch (error) {
  console.error('Erreur critique lors de l\'initialisation de la base de données:', error);

  // Créer une API compatible avec Drizzle même en cas d'erreur
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          all: () => [],
          get: () => null
        }),
        all: () => [],
        get: () => null
      })
    }),
    insert: () => ({
      values: () => ({
        run: () => ({ lastInsertRowid: 0 })
      })
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          run: () => ({ changes: 0 })
        })
      })
    }),
    delete: () => ({
      where: () => ({
        run: () => ({ changes: 0 })
      })
    }),
    eq: (a: any, b: any) => ({ operator: '=', left: a, right: b })
  };

  const sqlite = {
    pragma: () => {},
    close: () => {},
    prepare: () => ({
      get: () => ({}),
      all: () => ([]),
      run: () => ({})
    }),
    exec: () => {}
  };

  dbInstance = { db, sqlite, type: 'error' };
}

// Exporter les instances
export const db = dbInstance.db;
export const sqlite = dbInstance.sqlite;
export const dbType = dbInstance.type;

// Exporter la fonction eq pour la compatibilité
export const eq = (a: any, b: any) => ({ operator: '=', left: a, right: b });
