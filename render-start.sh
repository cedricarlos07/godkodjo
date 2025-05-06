#!/bin/bash

# Script de démarrage personnalisé pour Render

# Afficher les informations de l'environnement
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# Vérifier si le module better-sqlite3 est correctement installé
echo "Checking better-sqlite3 installation..."
node -e "try { require('better-sqlite3'); console.log('better-sqlite3 is working correctly!'); } catch (e) { console.error('Error loading better-sqlite3:', e.message); process.exit(1); }"

# Si le module n'est pas correctement installé, essayer de le reconstruire
if [ $? -ne 0 ]; then
  echo "better-sqlite3 is not working correctly, trying to rebuild..."
  npm rebuild better-sqlite3 --build-from-source
  
  # Vérifier à nouveau
  node -e "try { require('better-sqlite3'); console.log('better-sqlite3 is now working correctly!'); } catch (e) { console.error('Error loading better-sqlite3 after rebuild:', e.message); process.exit(1); }"
  
  if [ $? -ne 0 ]; then
    echo "Failed to fix better-sqlite3 installation!"
    exit 1
  fi
fi

# Créer le répertoire de données s'il n'existe pas
echo "Ensuring data directory exists..."
mkdir -p ./data

# Démarrer l'application
echo "Starting application..."
npm start
