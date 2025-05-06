#!/bin/bash

# Script de démarrage personnalisé pour Render avec PostgreSQL

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

# Vérifier si DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
  log_error "DATABASE_URL n'est pas défini. Impossible de se connecter à PostgreSQL."
  exit 1
fi

# Vérifier si DATABASE_TYPE est défini
if [ -z "$DATABASE_TYPE" ]; then
  log_warning "DATABASE_TYPE n'est pas défini. Utilisation de 'postgres' par défaut."
  export DATABASE_TYPE="postgres"
fi

# Créer le répertoire de données s'il n'existe pas
log_info "Création du répertoire de données..."
mkdir -p ./data
log_success "Répertoire de données créé: $(pwd)/data"

# Vérifier les permissions du répertoire de données
log_info "Vérification des permissions du répertoire de données..."
chmod -R 777 ./data
log_success "Permissions du répertoire de données mises à jour"

# Vérifier la connexion à PostgreSQL
log_info "Vérification de la connexion à PostgreSQL..."
if node -e "
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => {
    console.log('Connexion à PostgreSQL réussie');
    return client.query('SELECT version()');
  })
  .then(res => {
    console.log('Version de PostgreSQL:', res.rows[0].version);
    return client.end();
  })
  .catch(err => {
    console.error('Erreur de connexion à PostgreSQL:', err);
    process.exit(1);
  });
"; then
  log_success "Connexion à PostgreSQL réussie"
else
  log_error "Erreur de connexion à PostgreSQL"
  exit 1
fi

# Exécuter les migrations si nécessaire
if [ "$RUN_MIGRATIONS" = "true" ]; then
  log_info "Exécution des migrations PostgreSQL..."
  node run-migrations.js
  if [ $? -eq 0 ]; then
    log_success "Migrations PostgreSQL exécutées avec succès"
  else
    log_error "Erreur lors de l'exécution des migrations PostgreSQL"
    # Continuer malgré l'erreur
  fi
fi

# Démarrer l'application
log_info "Démarrage de l'application avec PostgreSQL..."
NODE_ENV=production DATABASE_TYPE=postgres node dist/index.js
