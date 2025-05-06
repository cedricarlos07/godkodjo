/**
 * Script pour corriger directement le fichier index.js compilé
 * Exécuter avec: node direct-fix.cjs
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
function main() {
  try {
    colorLog(colors.cyan, "=== Correction directe du fichier index.js compilé ===");
    
    // Vérifier si le fichier index.js existe
    const indexJsPath = path.join(process.cwd(), 'dist', 'index.js');
    if (!fs.existsSync(indexJsPath)) {
      colorLog(colors.red, `Le fichier ${indexJsPath} n'existe pas`);
      process.exit(1);
    }
    
    // Lire le contenu du fichier
    colorLog(colors.blue, `Lecture du fichier ${indexJsPath}...`);
    const content = fs.readFileSync(indexJsPath, 'utf8');
    
    // Sauvegarder le fichier original
    const backupPath = path.join(process.cwd(), 'dist', 'index.js.bak');
    colorLog(colors.blue, `Sauvegarde du fichier original vers ${backupPath}...`);
    fs.writeFileSync(backupPath, content);
    
    // Ajouter une fonction de sécurité pour les chemins
    const safePath = `
// Fonction de sécurité pour les chemins
function safePath(p) {
  return p || '';
}
`;
    
    // Créer une version modifiée du contenu
    let modifiedContent = safePath + content;
    
    // Remplacer les appels à path.resolve
    colorLog(colors.blue, "Remplacement des appels à path.resolve...");
    modifiedContent = modifiedContent.replace(
      /path\.resolve\s*\(\s*([^)]*)\s*\)/g,
      (match, args) => {
        if (args.includes('safePath')) return match; // Déjà sécurisé
        
        // Sécuriser chaque argument
        const securedArgs = args.split(',').map(arg => {
          const trimmedArg = arg.trim();
          if (trimmedArg === '') return trimmedArg;
          if (trimmedArg.includes('||')) return trimmedArg;
          if (trimmedArg.includes('?')) return trimmedArg;
          if (trimmedArg.includes('safePath')) return trimmedArg;
          return `safePath(${trimmedArg})`;
        }).join(', ');
        
        return `path.resolve(${securedArgs})`;
      }
    );
    
    // Remplacer les appels à path.join
    colorLog(colors.blue, "Remplacement des appels à path.join...");
    modifiedContent = modifiedContent.replace(
      /path\.join\s*\(\s*([^)]*)\s*\)/g,
      (match, args) => {
        if (args.includes('safePath')) return match; // Déjà sécurisé
        
        // Sécuriser chaque argument
        const securedArgs = args.split(',').map(arg => {
          const trimmedArg = arg.trim();
          if (trimmedArg === '') return trimmedArg;
          if (trimmedArg.includes('||')) return trimmedArg;
          if (trimmedArg.includes('?')) return trimmedArg;
          if (trimmedArg.includes('safePath')) return trimmedArg;
          return `safePath(${trimmedArg})`;
        }).join(', ');
        
        return `path.join(${securedArgs})`;
      }
    );
    
    // Remplacer spécifiquement les appels à path.resolve avec paths[0]
    colorLog(colors.blue, "Remplacement spécifique des appels à path.resolve avec paths[0]...");
    modifiedContent = modifiedContent.replace(
      /path\.resolve\s*\(\s*paths\[0\]/g,
      'path.resolve((paths && paths[0]) || ""'
    );
    
    // Remplacer spécifiquement les appels à path.join avec paths[0]
    colorLog(colors.blue, "Remplacement spécifique des appels à path.join avec paths[0]...");
    modifiedContent = modifiedContent.replace(
      /path\.join\s*\(\s*paths\[0\]/g,
      'path.join((paths && paths[0]) || ""'
    );
    
    // Remplacer spécifiquement les appels à path.resolve avec ...paths
    colorLog(colors.blue, "Remplacement spécifique des appels à path.resolve avec ...paths...");
    modifiedContent = modifiedContent.replace(
      /path\.resolve\s*\(\s*\.\.\.paths\s*\)/g,
      'path.resolve(...(paths || []))'
    );
    
    // Remplacer spécifiquement les appels à path.join avec ...paths
    colorLog(colors.blue, "Remplacement spécifique des appels à path.join avec ...paths...");
    modifiedContent = modifiedContent.replace(
      /path\.join\s*\(\s*\.\.\.paths\s*\)/g,
      'path.join(...(paths || []))'
    );
    
    // Écrire le contenu modifié
    colorLog(colors.blue, `Écriture du fichier modifié...`);
    fs.writeFileSync(indexJsPath, modifiedContent);
    
    colorLog(colors.green, "Fichier index.js corrigé avec succès");
    
    // Créer un fichier .env.local pour forcer l'utilisation de la base de données en mémoire
    const envLocalPath = path.join(process.cwd(), '.env.local');
    const envLocalContent = `# Configuration locale pour forcer l'utilisation de la base de données en mémoire
USE_MEMORY_DB=true
`;
    
    fs.writeFileSync(envLocalPath, envLocalContent);
    colorLog(colors.green, "Fichier .env.local créé pour forcer l'utilisation de la base de données en mémoire");
    
    colorLog(colors.cyan, "=== Correction terminée ===");
  } catch (error) {
    colorLog(colors.red, `Erreur lors de la correction du fichier index.js: ${error.message}`);
    process.exit(1);
  }
}

// Exécuter la fonction principale
main();
