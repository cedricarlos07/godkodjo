#!/bin/bash

# Script de build personnalisé pour Render

# Afficher les informations de l'environnement
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# Installer les dépendances
echo "Installing dependencies..."
npm ci || npm install

# Reconstruire les modules natifs pour la version actuelle de Node.js
echo "Rebuilding native modules..."
npm rebuild better-sqlite3 --build-from-source

# Vérifier si la reconstruction a réussi
if [ $? -ne 0 ]; then
  echo "Failed to rebuild better-sqlite3, trying alternative approach..."

  # Désinstaller et réinstaller better-sqlite3
  npm uninstall better-sqlite3
  npm install better-sqlite3 --build-from-source

  # Vérifier si l'installation a réussi
  if [ $? -ne 0 ]; then
    echo "Failed to install better-sqlite3!"
    exit 1
  fi
fi

# Essayer le build avec la configuration de production
echo "Trying production build..."
npm run build:prod

# Si le build de production échoue, utiliser le build de secours
if [ $? -ne 0 ]; then
  echo "Production build failed, using fallback build..."
  npm run build:fallback
fi

# Vérifier si le build a réussi
if [ $? -ne 0 ]; then
  echo "Build failed!"
  exit 1
else
  echo "Build successful!"
fi
