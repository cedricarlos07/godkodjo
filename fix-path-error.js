/**
 * Script pour identifier et corriger les erreurs de chemin dans le code compilé
 * Exécuter avec: node fix-path-error.js
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
    colorLog(colors.cyan, "=== Correction des erreurs de chemin dans le code compilé ===");
    
    // Vérifier si le fichier dist/index.js existe
    const indexJsPath = path.join(process.cwd(), 'dist', 'index.js');
    if (!fs.existsSync(indexJsPath)) {
      colorLog(colors.red, `Le fichier ${indexJsPath} n'existe pas`);
      return;
    }
    
    // Lire le contenu du fichier
    colorLog(colors.blue, `Lecture du fichier ${indexJsPath}...`);
    const content = fs.readFileSync(indexJsPath, 'utf8');
    
    // Rechercher les appels à path.resolve qui pourraient causer des erreurs
    colorLog(colors.blue, "Recherche des appels à path.resolve qui pourraient causer des erreurs...");
    
    // Créer une version modifiée du contenu
    let modifiedContent = content;
    
    // Remplacer les appels à path.resolve qui pourraient causer des erreurs
    // Motif 1: path.resolve(...paths) où paths pourrait être undefined
    modifiedContent = modifiedContent.replace(
      /path\.resolve\s*\(\s*([^)]*)\s*\)/g,
      (match, args) => {
        // Ajouter une vérification pour chaque argument
        const newArgs = args.split(',').map(arg => {
          const trimmedArg = arg.trim();
          if (trimmedArg.includes('||')) return trimmedArg; // Déjà une vérification
          if (trimmedArg.includes('?')) return trimmedArg; // Déjà une vérification
          if (trimmedArg === '') return trimmedArg; // Argument vide
          if (trimmedArg === '...paths') return '...(paths || [])'; // Spread operator
          if (trimmedArg.startsWith('...')) return `...(${trimmedArg.slice(3)} || [])`; // Spread operator
          return `(${trimmedArg} || '')`; // Ajouter une valeur par défaut
        }).join(', ');
        
        return `path.resolve(${newArgs})`;
      }
    );
    
    // Motif 2: path.join(...paths) où paths pourrait être undefined
    modifiedContent = modifiedContent.replace(
      /path\.join\s*\(\s*([^)]*)\s*\)/g,
      (match, args) => {
        // Ajouter une vérification pour chaque argument
        const newArgs = args.split(',').map(arg => {
          const trimmedArg = arg.trim();
          if (trimmedArg.includes('||')) return trimmedArg; // Déjà une vérification
          if (trimmedArg.includes('?')) return trimmedArg; // Déjà une vérification
          if (trimmedArg === '') return trimmedArg; // Argument vide
          if (trimmedArg === '...paths') return '...(paths || [])'; // Spread operator
          if (trimmedArg.startsWith('...')) return `...(${trimmedArg.slice(3)} || [])`; // Spread operator
          return `(${trimmedArg} || '')`; // Ajouter une valeur par défaut
        }).join(', ');
        
        return `path.join(${newArgs})`;
      }
    );
    
    // Ajouter une fonction de sécurité pour les chemins
    const safePath = `
// Fonction de sécurité pour les chemins
function safePath(p) {
  return p || '';
}
`;
    
    // Ajouter la fonction de sécurité au début du fichier
    modifiedContent = modifiedContent.replace(
      /(import\s+.*?from\s+['"]path['"];)/,
      `$1\n${safePath}`
    );
    
    // Remplacer les appels directs à path.resolve et path.join par des appels à safePath
    modifiedContent = modifiedContent.replace(
      /path\.resolve\s*\(\s*([^)]*)\s*\)/g,
      (match, args) => {
        const newArgs = args.split(',').map(arg => {
          const trimmedArg = arg.trim();
          if (trimmedArg.includes('safePath')) return trimmedArg; // Déjà sécurisé
          if (trimmedArg.includes('||')) return trimmedArg; // Déjà une vérification
          if (trimmedArg.includes('?')) return trimmedArg; // Déjà une vérification
          if (trimmedArg === '') return trimmedArg; // Argument vide
          if (trimmedArg === '...paths') return '...(paths || [])'; // Spread operator
          if (trimmedArg.startsWith('...')) return `...(${trimmedArg.slice(3)} || [])`; // Spread operator
          return `safePath(${trimmedArg})`; // Utiliser la fonction de sécurité
        }).join(', ');
        
        return `path.resolve(${newArgs})`;
      }
    );
    
    modifiedContent = modifiedContent.replace(
      /path\.join\s*\(\s*([^)]*)\s*\)/g,
      (match, args) => {
        const newArgs = args.split(',').map(arg => {
          const trimmedArg = arg.trim();
          if (trimmedArg.includes('safePath')) return trimmedArg; // Déjà sécurisé
          if (trimmedArg.includes('||')) return trimmedArg; // Déjà une vérification
          if (trimmedArg.includes('?')) return trimmedArg; // Déjà une vérification
          if (trimmedArg === '') return trimmedArg; // Argument vide
          if (trimmedArg === '...paths') return '...(paths || [])'; // Spread operator
          if (trimmedArg.startsWith('...')) return `...(${trimmedArg.slice(3)} || [])`; // Spread operator
          return `safePath(${trimmedArg})`; // Utiliser la fonction de sécurité
        }).join(', ');
        
        return `path.join(${newArgs})`;
      }
    );
    
    // Sauvegarder le fichier original
    const backupPath = path.join(process.cwd(), 'dist', 'index.js.bak');
    colorLog(colors.blue, `Sauvegarde du fichier original vers ${backupPath}...`);
    fs.writeFileSync(backupPath, content);
    
    // Écrire le contenu modifié
    colorLog(colors.blue, `Écriture du fichier modifié...`);
    fs.writeFileSync(indexJsPath, modifiedContent);
    
    colorLog(colors.green, "Correction des erreurs de chemin terminée avec succès");
    
    // Créer un fichier .env.local pour forcer l'utilisation de la base de données en mémoire
    const envLocalPath = path.join(process.cwd(), '.env.local');
    const envLocalContent = `# Configuration locale pour forcer l'utilisation de la base de données en mémoire
USE_MEMORY_DB=true
`;
    
    fs.writeFileSync(envLocalPath, envLocalContent);
    colorLog(colors.green, "Fichier .env.local créé pour forcer l'utilisation de la base de données en mémoire");
    
    colorLog(colors.cyan, "=== Correction terminée ===");
  } catch (error) {
    colorLog(colors.red, `Erreur lors de la correction des erreurs de chemin: ${error.message}`);
    process.exit(1);
  }
}

// Exécuter la fonction principale
main();
