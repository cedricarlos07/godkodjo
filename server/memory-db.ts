// Implémentation d'une base de données en mémoire sans dépendance à SQLite
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from 'fs';
import path from 'path';

// Type pour les tables
type Table = {
  [key: string]: any[];
};

// Type pour la base de données
type MemoryDatabase = {
  tables: {
    [key: string]: Table;
  };
  saveToFile: (filePath: string) => Promise<void>;
  loadFromFile: (filePath: string) => Promise<void>;
};

// Créer une base de données en mémoire
function createMemoryDatabase(): MemoryDatabase {
  const tables: { [key: string]: Table } = {};

  // Initialiser les tables à partir du schéma
  for (const key in schema) {
    if (key.startsWith('telegram') || key.startsWith('users') || key.startsWith('sessions')) {
      tables[key] = [];
    }
  }

  // Sauvegarder la base de données dans un fichier JSON
  const saveToFile = async (filePath: string): Promise<void> => {
    try {
      // Créer le répertoire si nécessaire
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Écrire les données dans un fichier
      await fs.promises.writeFile(filePath, JSON.stringify(tables, null, 2));
      console.log(`Base de données sauvegardée dans ${filePath}`);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la base de données:', error);
    }
  };

  // Charger la base de données depuis un fichier JSON
  const loadFromFile = async (filePath: string): Promise<void> => {
    try {
      if (fs.existsSync(filePath)) {
        const data = await fs.promises.readFile(filePath, 'utf-8');
        const loadedTables = JSON.parse(data);
        
        // Fusionner les données chargées avec les tables existantes
        for (const tableName in loadedTables) {
          if (tables[tableName]) {
            tables[tableName] = loadedTables[tableName];
          }
        }
        
        console.log(`Base de données chargée depuis ${filePath}`);
      } else {
        console.log(`Fichier ${filePath} non trouvé, utilisation d'une base de données vide`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la base de données:', error);
    }
  };

  return {
    tables,
    saveToFile,
    loadFromFile
  };
}

// Créer une instance de la base de données en mémoire
const memoryDb = createMemoryDatabase();

// Charger les données depuis un fichier si disponible
const dbPath = process.env.DATABASE_PATH || './data/kodjo-english.json';
memoryDb.loadFromFile(dbPath).catch(console.error);

// Sauvegarder périodiquement les données
setInterval(() => {
  memoryDb.saveToFile(dbPath).catch(console.error);
}, 60000); // Toutes les minutes

// Sauvegarder les données avant de quitter
process.on('SIGINT', async () => {
  console.log('Sauvegarde de la base de données avant de quitter...');
  await memoryDb.saveToFile(dbPath);
  process.exit(0);
});

// API compatible avec Drizzle ORM
export const db = {
  select: () => ({
    from: (table: any) => ({
      where: (condition: any) => ({
        all: () => {
          const tableName = table._.name.name;
          if (!memoryDb.tables[tableName]) return [];
          
          // Filtrer les résultats en fonction de la condition
          if (condition) {
            return memoryDb.tables[tableName].filter((row) => {
              // Gérer les conditions eq
              if (condition.left && condition.right && condition.operator === '=') {
                return row[condition.left.name] === condition.right;
              }
              return true;
            });
          }
          
          return memoryDb.tables[tableName];
        },
        get: () => {
          const tableName = table._.name.name;
          if (!memoryDb.tables[tableName]) return null;
          
          // Filtrer les résultats en fonction de la condition
          if (condition) {
            const filtered = memoryDb.tables[tableName].filter((row) => {
              // Gérer les conditions eq
              if (condition.left && condition.right && condition.operator === '=') {
                return row[condition.left.name] === condition.right;
              }
              return true;
            });
            
            return filtered.length > 0 ? filtered[0] : null;
          }
          
          return memoryDb.tables[tableName].length > 0 ? memoryDb.tables[tableName][0] : null;
        }
      }),
      all: () => {
        const tableName = table._.name.name;
        return memoryDb.tables[tableName] || [];
      },
      get: () => {
        const tableName = table._.name.name;
        const rows = memoryDb.tables[tableName] || [];
        return rows.length > 0 ? rows[0] : null;
      }
    })
  }),
  insert: (table: any) => ({
    values: (values: any) => ({
      run: () => {
        const tableName = table._.name.name;
        if (!memoryDb.tables[tableName]) {
          memoryDb.tables[tableName] = [];
        }
        
        // Générer un ID si nécessaire
        if (!values.id) {
          values.id = Date.now().toString();
        }
        
        // Ajouter un timestamp si nécessaire
        if (!values.createdAt) {
          values.createdAt = new Date().toISOString();
        }
        
        memoryDb.tables[tableName].push(values);
        return { lastInsertRowid: values.id };
      }
    })
  }),
  update: (table: any) => ({
    set: (values: any) => ({
      where: (condition: any) => ({
        run: () => {
          const tableName = table._.name.name;
          if (!memoryDb.tables[tableName]) return { changes: 0 };
          
          let changes = 0;
          
          // Mettre à jour les lignes qui correspondent à la condition
          memoryDb.tables[tableName] = memoryDb.tables[tableName].map((row) => {
            // Vérifier si la ligne correspond à la condition
            let matches = true;
            if (condition) {
              // Gérer les conditions eq
              if (condition.left && condition.right && condition.operator === '=') {
                matches = row[condition.left.name] === condition.right;
              }
            }
            
            // Mettre à jour la ligne si elle correspond
            if (matches) {
              changes++;
              return { ...row, ...values };
            }
            
            return row;
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
        if (!memoryDb.tables[tableName]) return { changes: 0 };
        
        const initialLength = memoryDb.tables[tableName].length;
        
        // Supprimer les lignes qui correspondent à la condition
        memoryDb.tables[tableName] = memoryDb.tables[tableName].filter((row) => {
          // Vérifier si la ligne correspond à la condition
          if (condition) {
            // Gérer les conditions eq
            if (condition.left && condition.right && condition.operator === '=') {
              return row[condition.left.name] !== condition.right;
            }
          }
          
          return true;
        });
        
        const changes = initialLength - memoryDb.tables[tableName].length;
        return { changes };
      }
    })
  }),
  // Fonctions utilitaires
  eq
};

// Exporter une fausse instance sqlite pour la compatibilité
export const sqlite = {
  pragma: () => {},
  close: () => {}
};
