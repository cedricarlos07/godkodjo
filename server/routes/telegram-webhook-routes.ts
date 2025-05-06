import express from 'express';
import { telegramService } from '../services/telegram-service';
import { automationLogsService, LogType, LogStatus } from '../services/automation-logs-service';

const router = express.Router();

// Route pour recevoir les mises à jour de Telegram (webhook)
router.post('/telegram/webhook', async (req, res) => {
  try {
    console.log('Webhook Telegram reçu:', JSON.stringify(req.body, null, 2));

    // Vérifier si la mise à jour contient un message
    if (req.body && req.body.message) {
      const message = req.body.message;

      console.log(`Message reçu: ID=${message.message_id}, Chat=${message.chat.id}, From=${message.from?.first_name || 'Unknown'}`);

      // Enregistrer le message dans la base de données
      const saveResult = await telegramService.saveMessage(message);

      if (saveResult) {
        console.log(`Message ${message.message_id} enregistré avec succès`);
      } else {
        console.error(`Échec de l'enregistrement du message ${message.message_id}`);
      }

      // Créer un log pour la réception du message
      await automationLogsService.createLog(
        LogType.TELEGRAM_INFO,
        LogStatus.SUCCESS,
        `Message Telegram reçu de ${message.from?.first_name || 'Unknown'} ${message.from?.last_name || ''}`,
        {
          messageId: message.message_id,
          chatId: message.chat.id,
          userId: message.from?.id,
          text: message.text?.substring(0, 100) // Limiter la taille du texte dans les logs
        }
      );
    } else if (req.body && req.body.channel_post) {
      // Traiter les messages de canal
      const channelPost = req.body.channel_post;
      console.log(`Message de canal reçu: ID=${channelPost.message_id}, Chat=${channelPost.chat.id}, Title=${channelPost.chat.title || 'Unknown'}`);

      // Créer un log pour la réception du message de canal
      await automationLogsService.createLog(
        LogType.TELEGRAM_INFO,
        LogStatus.SUCCESS,
        `Message de canal Telegram reçu de ${channelPost.chat.title || 'Unknown'}`,
        {
          messageId: channelPost.message_id,
          chatId: channelPost.chat.id,
          text: channelPost.text?.substring(0, 100) // Limiter la taille du texte dans les logs
        }
      );
    } else {
      console.log('Mise à jour Telegram sans message ni message de canal');
    }

    // Répondre avec succès
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erreur lors du traitement du webhook Telegram:', error);

    // Créer un log pour l'erreur
    await automationLogsService.createLog(
      LogType.TELEGRAM_INFO,
      LogStatus.ERROR,
      `Erreur lors du traitement du webhook Telegram`,
      {
        error: error.message,
        body: req.body ? JSON.stringify(req.body).substring(0, 500) : 'No body'
      }
    );

    // Répondre avec succès malgré l'erreur pour éviter que Telegram ne réessaie
    res.status(200).json({ success: false, error: error.message });
  }
});

// Route pour configurer le webhook Telegram
router.post('/telegram/set-webhook', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'URL requise' });
    }

    // Configurer le webhook Telegram
    const telegramApiUrl = 'https://api.telegram.org/bot';
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';

    if (!telegramBotToken) {
      return res.status(400).json({ success: false, message: 'Token Telegram non configuré' });
    }

    const response = await fetch(`${telegramApiUrl}${telegramBotToken}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url
      })
    });

    const data = await response.json();

    // Créer un log pour la configuration du webhook
    await automationLogsService.createLog(
      LogType.TELEGRAM_INFO,
      LogStatus.SUCCESS,
      `Webhook Telegram configuré avec succès`,
      {
        url: url,
        response: data
      }
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Erreur lors de la configuration du webhook Telegram:', error);

    // Créer un log pour l'erreur
    await automationLogsService.createLog(
      LogType.TELEGRAM_INFO,
      LogStatus.ERROR,
      `Erreur lors de la configuration du webhook Telegram`,
      {
        error: error.message
      }
    );

    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour obtenir les informations du webhook Telegram actuel
router.get('/telegram/webhook-info', async (req, res) => {
  try {
    // Récupérer les informations du webhook Telegram
    const telegramApiUrl = 'https://api.telegram.org/bot';
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';

    if (!telegramBotToken) {
      return res.status(400).json({ success: false, message: 'Token Telegram non configuré' });
    }

    const response = await fetch(`${telegramApiUrl}${telegramBotToken}/getWebhookInfo`);
    const data = await response.json();

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Erreur lors de la récupération des informations du webhook Telegram:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
