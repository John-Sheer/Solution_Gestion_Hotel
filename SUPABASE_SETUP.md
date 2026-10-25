# Mise en service de la comptabilité partagée

La comptabilité utilise Supabase Auth, PostgreSQL et le stockage privé Supabase. Elle ne fonctionne pas tant qu’un projet Supabase n’a pas été créé, que la migration n’a pas été appliquée et que `js/supabase-config.js` n’a pas été configuré.

## 1. Créer et sécuriser le projet

1. Créez un projet Supabase dans une région adaptée à l’établissement.
2. Dans **Authentication → Providers**, gardez l’authentification e-mail activée et désactivez les inscriptions publiques. Configurez aussi l’URL HTTPS du site dans **Authentication → URL Configuration**.
3. Dans **SQL Editor**, exécutez une seule fois le contenu de `supabase/migrations/20261025000000_accounting.sql`.
4. Dans **Authentication → Users**, créez manuellement le compte initial du superuser avec une adresse que vous contrôlez. Définissez son mot de passe dans Supabase ; ne le partagez pas. Copiez son UUID.
5. Ajoutez le profil superuser dans SQL Editor en remplaçant l’UUID et le nom :

```sql
insert into public.staff_profiles (id, full_name, role)
values ('UUID-DU-SUPERUSER', 'Superuser', 'super_admin');
```

Le superuser peut inviter des comptes `hotel_manager` et `bar_manager` depuis le tableau de bord. Il ne peut pas créer de propriétaire ni accéder aux écritures, clôtures ou justificatifs financiers. Le propriétaire conserve ces droits financiers et se configure séparément avec le rôle `owner`.

## 2. Configurer le site

Dans `js/supabase-config.js`, configurez l’URL du projet et sa clé publique **anon/publishable**. Ne mettez jamais une clé `service_role` dans le site ou dans Git.

Déployez la fonction Edge depuis le dépôt lié au projet :

```powershell
supabase login
supabase link --project-ref laxihqeckpbqxihkauzp
supabase functions deploy admin-create-user
```

La fonction utilise `SUPABASE_SERVICE_ROLE_KEY` uniquement dans l’environnement serveur fourni par Supabase. Ne créez pas de variable de service-role dans le navigateur. L’adresse d’invitation doit être autorisée par les réglages SMTP et URL de redirection du projet.

Publiez ensuite les fichiers statiques sur un hébergement HTTPS. Ne testez pas l’authentification depuis `file://` : l’URL de redirection et les règles d’origine doivent correspondre au domaine configuré dans Supabase Auth.

Après avoir créé le propriétaire dans **Authentication → Users**, ajoutez son profil avec son UUID (et remplacez le nom) :

```sql
insert into public.staff_profiles (id, full_name, role)
values ('UUID-DU-PROPRIETAIRE', 'Nom du propriétaire', 'owner');
```

## 3. Initialiser les caisses

Connectez-vous comme propriétaire. Pour chaque gérant et service utilisé, enregistrez le fonds initial en espèces et le solde initial mobile money. Si un moyen n’a pas de solde d’ouverture, saisissez `0`. Ces soldes doivent provenir d’un comptage ou d’un relevé réel : ils ne peuvent être créés qu’une seule fois et apparaissent dans le journal comme fonds initiaux.

Les gérants enregistrent ensuite chaque encaissement, dépense (avec justificatif obligatoire) et mouvement de caisse. Les paiements partiels sont acceptés. La référence du séjour/de la commande est obligatoire pour les encaissements ; la référence mobile money est facultative, mais unique si elle est renseignée.

À la clôture, le serveur recalcule le solde attendu à partir du fonds d’ouverture, des écritures et de la dernière clôture approuvée. Les écritures des jours non clôturés restent incluses dans le calcul suivant. Le gérant indique les montants constatés. Tout écart exige une explication. Une clôture soumise bloque les nouvelles écritures de cette caisse jusqu’à la décision du propriétaire. Une clôture rejetée peut être corrigée par de nouvelles écritures et soumise à nouveau.

Les écritures et décisions ne peuvent pas être modifiées ou supprimées par les comptes de l’application. Une erreur se corrige par une contre-écriture qui référence l’écriture initiale ; le gérant concerné ou le propriétaire peut effectuer cette correction. Après la soumission ou l’approbation d’une clôture, les corrections ne peuvent être passées que sur une journée de caisse ouverte.

## Limites à connaître

- La base comptable, l’authentification et les justificatifs sont partagés et protégés par les politiques de la base. Toutefois, aucune application ne peut garantir une comptabilité « sans faille » sans contrôles humains, rapprochement des relevés Mobile Money/bancaires, sauvegardes et procédure de revue.
- Les réservations, chambres, commandes du bar et stocks de ce site restent actuellement dans le `localStorage` du navigateur. La référence saisie dans une écriture permet le rapprochement humain, mais le montant d’un séjour ou d’une commande n’est pas encore vérifié automatiquement par PostgreSQL, et ces données opérationnelles ne sont pas synchronisées entre appareils. Pour une réconciliation entièrement automatisée, ces données doivent également être migrées vers la base partagée.
- Les nouvelles écritures commencent à la date de mise en service et au fonds initial saisi ; aucun historique antérieur n’est importé automatiquement.
- Sans configuration Supabase valide, la connexion centrale est indisponible : il n’existe volontairement aucun retour silencieux vers les anciens comptes locaux.
