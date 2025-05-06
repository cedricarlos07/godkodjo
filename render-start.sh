#!/bin/bash

# Script de démarrage personnalisé pour Render avec gestion d'erreur robuste

# Fonction pour afficher les messages avec couleur
function log_info() {
  echo -e "\033[0;34m[INFO]\033[0m $1"
}

function log_success() {
  echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

function log_warning() {
  echo -e "\033[0;33m[WARNING]\033[0m $1"
}

function log_error() {
  echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Afficher les informations de l'environnement
log_info "Environnement de déploiement:"
log_info "Node.js version: $(node -v)"
log_info "NPM version: $(npm -v)"
log_info "Système d'exploitation: $(uname -a)"
log_info "Répertoire courant: $(pwd)"

# Créer le répertoire de données s'il n'existe pas
log_info "Création du répertoire de données..."
mkdir -p ./data
log_success "Répertoire de données créé: $(pwd)/data"

# Vérifier les permissions du répertoire de données
log_info "Vérification des permissions du répertoire de données..."
chmod -R 777 ./data
log_success "Permissions du répertoire de données mises à jour"

# Désactiver complètement better-sqlite3
log_info "Désactivation de better-sqlite3..."
node no-sqlite.js
log_success "better-sqlite3 désactivé avec succès"

# Créer un fichier .env.local pour forcer l'utilisation de la base de données en mémoire
log_info "Configuration de l'environnement..."
echo "USE_MEMORY_DB=true" > .env.local
export USE_MEMORY_DB=true
log_success "Configuration terminée"

# Démarrer l'application
log_info "Démarrage de l'application..."
NODE_ENV=production USE_MEMORY_DB=true npm start
