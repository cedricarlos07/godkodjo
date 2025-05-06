import { db } from './db';
import * as schema from '../shared/schema-sqlite';
import { eq } from 'drizzle-orm';

// Fonction pour importer les templates de messages
async function importTemplates() {
  console.log('Importation des templates de messages...');

  const templates = [
    {
      name: 'Rappel de cours matinal',
      type: 'course-reminder',
      content: `🌟 *KODJO ENGLISH - COURS DU JOUR* 🌟

📚 *{course}* avec {instructor}
🕒 Aujourd'hui à {time}
🌍 Rejoignez-nous pour améliorer votre anglais !

✅ Préparez vos questions
✅ Testez votre micro et caméra
✅ Ayez un cahier à portée de main

🔗 [👉 REJOINDRE LE COURS ICI]({zoom_link})

_"L'apprentissage est un trésor qui suivra son propriétaire partout."_ - Proverbe chinois

#KodjoEnglish #AméliorezVotreAnglais`,
      createdAt: Date.now()
    },
    {
      name: 'Rappel 1h avant le cours',
      type: 'course-reminder',
      content: `⏰ *RAPPEL : VOTRE COURS COMMENCE DANS 1 HEURE* ⏰

📚 *{course}* avec {instructor}
🕒 Aujourd'hui à {time}
🎯 Objectif : Progresser ensemble en anglais

🔍 Au programme aujourd'hui :
• Révision des concepts précédents
• Nouvelles expressions et vocabulaire
• Pratique de la conversation
• Questions et réponses

🔗 [👉 CLIQUEZ ICI POUR REJOINDRE]({zoom_link})

_Soyez ponctuel(le) pour profiter pleinement du cours !_

#KodjoEnglish #CoursDAnglais`,
      createdAt: Date.now()
    },
    {
      name: 'Message de bienvenue',
      type: 'welcome',
      content: `👋 *BIENVENUE DANS LA COMMUNAUTÉ KODJO ENGLISH !* 👋

Nous sommes ravis de vous accueillir dans notre communauté d'apprentissage de l'anglais.

🌟 *CE QUE VOUS ALLEZ DÉCOUVRIR :*
📚 Des cours interactifs avec des professeurs qualifiés
🗣️ Des opportunités pour pratiquer l'anglais régulièrement
🏆 Un système de badges pour récompenser votre participation
📱 Des notifications pour ne manquer aucun cours
🌍 Une communauté internationale d'apprenants

💡 *CONSEILS POUR RÉUSSIR :*
✅ Participez activement aux discussions de groupe
✅ Posez des questions pendant les cours
✅ Pratiquez régulièrement entre les sessions
✅ Partagez des ressources utiles avec le groupe

🔔 *Restez connecté(e) pour recevoir toutes les informations importantes !*

#KodjoEnglish #ApprendreLAnglais #Bienvenue`,
      createdAt: Date.now()
    },
    {
      name: 'Annonce importante',
      type: 'announcement',
      content: `📢 *ANNONCE IMPORTANTE - KODJO ENGLISH* 📢

{message}

⭐ Merci de votre attention et de votre engagement continu dans votre apprentissage de l'anglais.

_L'équipe KODJO ENGLISH_`,
      createdAt: Date.now()
    },
    {
      name: 'Attribution de badge',
      type: 'badge-award',
      content: `🏆 *FÉLICITATIONS {name}!* 🏆

Vous venez de recevoir le badge *{badge_name}* !

🌟 *POURQUOI CE BADGE ?*
Votre participation active et votre engagement dans le groupe ont été remarquables. Vous êtes un exemple pour tous les membres de notre communauté d'apprentissage.

🚀 *CONTINUEZ COMME ÇA !*
Chaque interaction est une opportunité d'améliorer votre anglais. Votre constance est la clé de votre succès.

📊 *STATISTIQUES PERSONNELLES :*
• Messages cette semaine : {message_count}
• Participation aux cours : {attendance_rate}%
• Position dans le classement : {rank}

_"Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte."_ - Winston Churchill

#KodjoEnglish #Excellence #Apprentissage`,
      createdAt: Date.now()
    }
  ];

  for (const template of templates) {
    // Vérifier si le template existe déjà
    const existingTemplate = db.select().from(schema.templateMessages)
      .where(eq(schema.templateMessages.name, template.name))
      .all();

    if (existingTemplate.length === 0) {
      db.insert(schema.templateMessages).values(template).run();
      console.log(`Template créé: ${template.name}`);
    } else {
      console.log(`Template existant: ${template.name}`);
    }
  }

  console.log('Importation des templates terminée avec succès');
}

// Fonction pour importer les règles d'automatisation
async function importAutomationRules() {
  console.log('Importation des règles d\'automatisation...');

  // Récupérer les templates
  const templates = db.select().from(schema.templateMessages).all();
  const templateMap = new Map(templates.map(t => [t.type, t.id]));

  const automationRules = [
    {
      name: 'Envoi matinal des messages de cours',
      description: 'Envoie automatiquement les messages de rappel pour les cours du jour',
      triggerType: 'daily-courses-message',
      triggerData: '0 6 * * *', // Tous les jours à 6h
      actionType: 'send-telegram',
      actionData: templateMap.get('course-reminder')?.toString() || '',
      isActive: true,
      sendTime: '06:00',
      timeZone: 'GMT',
      createdAt: Date.now()
    },
    {
      name: 'Rappel 1h avant chaque session',
      description: 'Envoie un rappel Telegram 1h avant chaque session',
      triggerType: 'session-before',
      triggerData: '3600', // 1 heure en secondes
      actionType: 'send-telegram',
      actionData: templateMap.get('course-reminder')?.toString() || '',
      isActive: true,
      createdAt: Date.now()
    },
    {
      name: 'Création automatique des réunions Zoom',
      description: 'Crée automatiquement les réunions Zoom 24h avant chaque session',
      triggerType: 'session-before',
      triggerData: '86400', // 24 heures en secondes
      actionType: 'create-zoom',
      actionData: 'topic={course}, duration=60, timezone=GMT',
      isActive: true,
      createdAt: Date.now()
    }
  ];

  for (const rule of automationRules) {
    // Vérifier si la règle existe déjà
    const existingRule = db.select().from(schema.automationRules)
      .where(eq(schema.automationRules.name, rule.name))
      .all();

    if (existingRule.length === 0) {
      db.insert(schema.automationRules).values(rule).run();
      console.log(`Règle d'automatisation créée: ${rule.name}`);
    } else {
      console.log(`Règle d'automatisation existante: ${rule.name}`);
    }
  }

  console.log('Importation des règles d\'automatisation terminée avec succès');
}

// Fonction principale pour importer toutes les données
async function importAllData() {
  try {
    // Importer les templates de messages
    await importTemplates();

    // Importer les règles d'automatisation
    await importAutomationRules();

    console.log('Importation de toutes les données terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'importation des données:', error);
  }
}

// Exécuter l'importation
importAllData().then(() => {
  console.log('Script d\'importation terminé');
}).catch(error => {
  console.error('Erreur dans le script d\'importation:', error);
});
