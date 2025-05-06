#!/bin/bash

# Script de build personnalisé pour Render

# Afficher les informations de l'environnement
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# Installer les dépendances
echo "Installing dependencies..."
npm ci || npm install

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
