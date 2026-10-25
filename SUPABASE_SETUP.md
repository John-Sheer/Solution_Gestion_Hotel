# Mise en service de la comptabilité partagée

La comptabilité utilise Supabase Auth, PostgreSQL et le stockage privé Supabase. Elle ne fonctionne pas tant qu’un projet Supabase n’a pas été créé, que la migration n’a pas été appliquée et que `js/supabase-config.js` n’a pas été configuré.

## 1. Créer et sécuriser le projet

1. Créez un projet Supabase dans une région adaptée à l’établissement.
2. Dans **Authentication → Providers**, gardez l’authentification e-mail activée et désactivez les inscriptions publiques. Configurez aussi l’URL HTTPS du site dans **Authentication → URL Configuration**.
3. Dans **SQL Editor**, exécutez les migrations dans l’ordre : d’abord `supabase/migrations/20261025000000_accounting.sql`, puis `supabase/migrations/20261025010000_shared_hotel_operations.sql`. La seconde crée les chambres, boissons, réservations et commandes partagées ainsi que leurs fonctions d’accès. Ne la relancez pas si elle a déjà été appliquée.
4. Dans **Authentication → Users**, créez manuellement le compte initial du superuser avec une adresse que vous contrôlez. Définissez son mot de passe dans Supabase ; ne le partagez pas. Copiez son UUID.
5. Ajoutez le profil superuser dans SQL Editor en remplaçant l’UUID et le nom :

```sql
insert into public.staff_profiles (id, full_name, role)
values ('UUID-DU-SUPERUSER', 'Superuser', 'super_admin');
```

Le superuser peut inviter un compte `owner`, `hotel_manager` ou `bar_manager` depuis le tableau de bord. Un seul profil propriétaire est autorisé. Le superuser ne peut pas consulter ni modifier les écritures, clôtures ou justificatifs financiers ; le compte `owner` conserve ces droits.

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

## 3. Initialiser les caisses

Connectez-vous comme propriétaire. Pour chaque gérant et service utilisé, enregistrez le fonds initial en espèces et le solde initial mobile money. Si un moyen n’a pas de solde d’ouverture, saisissez `0`. Ces soldes doivent provenir d’un comptage ou d’un relevé réel : ils ne peuvent être créés qu’une seule fois et apparaissent dans le journal comme fonds initiaux.

Les gérants enregistrent ensuite chaque encaissement, dépense (avec justificatif obligatoire) et mouvement de caisse. Les paiements partiels sont acceptés. La référence du séjour/de la commande est obligatoire pour les encaissements ; la référence mobile money est facultative, mais unique si elle est renseignée.

À la clôture, le serveur recalcule le solde attendu à partir du fonds d’ouverture, des écritures et de la dernière clôture approuvée. Les écritures des jours non clôturés restent incluses dans le calcul suivant. Le gérant indique les montants constatés. Tout écart exige une explication. Une clôture soumise bloque les nouvelles écritures de cette caisse jusqu’à la décision du propriétaire. Une clôture rejetée peut être corrigée par de nouvelles écritures et soumise à nouveau.

Les écritures et décisions ne peuvent pas être modifiées ou supprimées par les comptes de l’application. Une erreur se corrige par une contre-écriture qui référence l’écriture initiale ; le gérant concerné ou le propriétaire peut effectuer cette correction. Après la soumission ou l’approbation d’une clôture, les corrections ne peuvent être passées que sur une journée de caisse ouverte.

## Limites à connaître

- La base comptable, l’authentification et les justificatifs sont partagés et protégés par les politiques de la base. Toutefois, aucune application ne peut garantir une comptabilité « sans faille » sans contrôles humains, rapprochement des relevés Mobile Money/bancaires, sauvegardes et procédure de revue.
- Les nouvelles réservations et commandes ne sont enregistrées qu’après application de la migration des opérations partagées. Les réservations, états de maintenance, commandes et stocks deviennent alors visibles sur les appareils connectés ; l’ancien historique conservé dans les navigateurs n’est pas importé.
- Le registre comptable reste indépendant des opérations hôtelières : le montant d’un séjour ou d’une commande n’est pas encore rapproché automatiquement avec les encaissements et le chiffre d’affaires comptabilisés. Les écritures commencent à la date de mise en service et au fonds initial saisi ; aucun historique comptable antérieur n’est importé automatiquement.
- Le journal d’activité de l’interface reste local au navigateur et n’est pas un journal d’audit partagé. Pour une traçabilité complète, appuyez-vous sur les données d’opérations et le registre comptable central.
- Sans configuration Supabase valide, la connexion centrale est indisponible : il n’existe volontairement aucun retour silencieux vers les anciens comptes locaux.
