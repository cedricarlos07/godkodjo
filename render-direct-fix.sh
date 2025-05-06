#!/bin/bash

# Script de démarrage qui corrige directement le fichier index.js compilé

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

# Vérifier si le fichier index.js existe
INDEX_JS="./dist/index.js"
if [ ! -f "$INDEX_JS" ]; then
  log_error "Le fichier $INDEX_JS n'existe pas"
  exit 1
fi

# Sauvegarder le fichier original
log_info "Sauvegarde du fichier original..."
cp "$INDEX_JS" "${INDEX_JS}.bak"
log_success "Fichier original sauvegardé: ${INDEX_JS}.bak"

# Corriger le fichier index.js avec notre script JavaScript
log_info "Correction du fichier index.js avec notre script JavaScript..."
node direct-fix.cjs
if [ $? -eq 0 ]; then
  log_success "Fichier index.js corrigé avec succès"
else
  log_error "Erreur lors de la correction du fichier index.js"

  # Essayer la méthode de secours avec sed
  log_warning "Tentative de correction avec sed..."

  # Ajouter une fonction de sécurité pour les chemins au début du fichier
  SAFE_PATH_FUNCTION='
// Fonction de sécurité pour les chemins
function safePath(p) {
  return p || "";
}
'

  # Remplacer les appels à path.resolve et path.join
  log_info "Remplacement des appels à path.resolve et path.join..."

  # Utiliser sed pour remplacer les appels à path.resolve
  sed -i "s/path\.resolve(\([^)]*\))/path.resolve(safePath(\1))/g" "$INDEX_JS"
  sed -i "s/path\.join(\([^)]*\))/path.join(safePath(\1))/g" "$INDEX_JS"

  # Ajouter la fonction safePath au début du fichier
  sed -i "1s/^/${SAFE_PATH_FUNCTION}/" "$INDEX_JS"

  log_success "Fichier index.js corrigé avec sed"
fi

# Forcer l'utilisation de la base de données en mémoire
log_info "Configuration de l'environnement..."
echo "USE_MEMORY_DB=true" > .env.local
export USE_MEMORY_DB=true
log_success "Configuration terminée"

# Démarrer l'application
log_info "Démarrage de l'application..."
NODE_ENV=production USE_MEMORY_DB=true node dist/index.js
