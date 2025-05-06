// Script pour configurer le webhook Telegram
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Charger les variables d'environnement
dotenv.config();

// Récupérer le token Telegram depuis les variables d'environnement
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';

if (!telegramToken) {
  console.error('TELEGRAM_BOT_TOKEN non défini. Veuillez définir cette variable d\'environnement.');
  process.exit(1);
}

// URL de l'application
const appUrl = 'https://kodjo-english-app.onrender.com';

// URL du webhook
const webhookUrl = `${appUrl}/api/telegram/webhook`;

// URL pour configurer le webhook
const setWebhookUrl = `https://api.telegram.org/bot${telegramToken}/setWebhook?url=${webhookUrl}`;

// Configurer le webhook
console.log(`Configuration du webhook Telegram pour l'URL: ${webhookUrl}`);

fetch(setWebhookUrl)
  .then(response => response.json())
  .then(data => {
    console.log('Réponse de l\'API Telegram:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.ok) {
      console.log('Le webhook a été configuré avec succès!');
      
      // Vérifier les informations du webhook
      return fetch(`https://api.telegram.org/bot${telegramToken}/getWebhookInfo`);
    } else {
      console.error('Erreur lors de la configuration du webhook:', data.description);
      process.exit(1);
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log('\nInformations sur le webhook:');
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(error => {
    console.error('Erreur lors de la requête:', error);
    process.exit(1);
  });
