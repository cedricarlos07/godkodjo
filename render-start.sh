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

# Fonction pour gérer les erreurs
function handle_error() {
  log_error "$1"
  log_warning "Activation du mode de secours (base de données en mémoire)"
  echo "USE_MEMORY_DB=true" > .env.local
  export USE_MEMORY_DB=true
}

# Afficher les informations de l'environnement
log_info "Environnement de déploiement:"
log_info "Node.js version: $(node -v)"
log_info "NPM version: $(npm -v)"
log_info "Système d'exploitation: $(uname -a)"
log_info "Répertoire courant: $(pwd)"

# Créer le répertoire de données s'il n'existe pas
log_info "Création du répertoire de données..."
mkdir -p ./data || handle_error "Impossible de créer le répertoire de données"
log_success "Répertoire de données créé: $(pwd)/data"

# Vérifier les permissions du répertoire de données
log_info "Vérification des permissions du répertoire de données..."
if [ -w "./data" ]; then
  log_success "Le répertoire de données est accessible en écriture"
else
  log_warning "Le répertoire de données n'est pas accessible en écriture, tentative de correction..."
  chmod -R 777 ./data || handle_error "Impossible de modifier les permissions du répertoire de données"
  log_success "Permissions du répertoire de données mises à jour"
fi

# Vérifier si better-sqlite3 est installé
log_info "Vérification de l'installation de better-sqlite3..."
if npm list better-sqlite3 | grep -q better-sqlite3; then
  log_success "better-sqlite3 est installé"
else
  log_warning "better-sqlite3 n'est pas installé, tentative d'installation..."
  npm install better-sqlite3 --build-from-source || handle_error "Impossible d'installer better-sqlite3"
fi

# Vérifier si better-sqlite3 fonctionne
log_info "Vérification du fonctionnement de better-sqlite3..."
if node -e "try { require('better-sqlite3'); console.log('better-sqlite3 is working correctly!'); } catch (e) { console.error('Error loading better-sqlite3:', e.message); process.exit(1); }"; then
  log_success "better-sqlite3 fonctionne correctement"
else
  log_warning "better-sqlite3 ne fonctionne pas correctement, tentative de reconstruction..."
  npm rebuild better-sqlite3 --build-from-source || handle_error "Impossible de reconstruire better-sqlite3"

  if node -e "try { require('better-sqlite3'); console.log('better-sqlite3 is now working correctly!'); } catch (e) { console.error('Error loading better-sqlite3 after rebuild:', e.message); process.exit(1); }"; then
    log_success "better-sqlite3 reconstruit avec succès"
  else
    handle_error "better-sqlite3 ne fonctionne toujours pas après reconstruction"
  fi
fi

# Vérifier si better-sqlite3 peut créer une base de données
log_info "Vérification de la création d'une base de données SQLite..."
if node -e "try { const db = require('better-sqlite3')(':memory:'); db.prepare('SELECT 1').get(); console.log('SQLite database creation successful!'); } catch (e) { console.error('Error creating SQLite database:', e.message); process.exit(1); }"; then
  log_success "Création de base de données SQLite réussie"
else
  handle_error "Impossible de créer une base de données SQLite"
fi

# Exécuter le script de vérification des dépendances
if [ -f check-deps.js ]; then
  log_info "Exécution du script de vérification des dépendances..."
  node check-deps.js || log_warning "Le script de vérification des dépendances a échoué, mais l'application continuera"
fi

# Vérifier si l'application doit utiliser la base de données en mémoire
if [ -f .env.local ] && grep -q "USE_MEMORY_DB=true" .env.local; then
  log_warning "L'application utilisera la base de données en mémoire"
else
  log_success "L'application utilisera la base de données SQLite"
fi

# Démarrer l'application
log_info "Démarrage de l'application..."
npm start
