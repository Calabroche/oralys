# Oralys Team : maquettes pour Figma

Export haute fidélité du prototype Oralys Team (planète « Team » de l'univers Oralys), régénéré le 25/09/2026 (en-tête avec le nom de la personne connectée, V4 pointage) à partir de l'app qui tourne (`/team`).
Données de démo : cabinet Oralpes, session Delphine Girard (Gestionnaire). La démo vit à la date du jour : ces maquettes ont été capturées le vendredi 25 septembre 2026 (arrêt maladie de Thomas ce jour-là, congés de Camille et Léa la semaine du 5 octobre).

## Contenu du dossier

| Dossier / fichier | Rôle |
|---|---|
| `Oralys-Team-planche-par-version.svg` | **La démo découpée MVP → V3** : chaque version avec ses écrans, capturés dans cette version (ce qui n'existe pas encore est masqué). Idéal pour présenter ou chiffrer une livraison |
| `Oralys-Team-planche-complete.svg` | **Les 58 écrans de la version complète**, rangés par section avec titres et légendes. Un seul glisser-déposer dans Figma |
| `screens/*.svg` | Les 58 maquettes vectorielles de la version complète, un fichier par écran (1440 px de large) |
| `versions/{mvp,v1,v2,v3}/*.svg` | Les mêmes écrans capturés dans leur version (et leur `png/` de contrôle) |
| `png/*.png` | Rendu de contrôle de chaque SVG (référence visuelle) |
| `tokens.json` | Design tokens (couleurs, typo, rayons, espacements, tailles, ombres) au format Tokens Studio |
| `index.html` | Planche de consultation dans un navigateur |

## Importer dans Figma

1. **Police** : installer ou activer **Geist** (Google Font, disponible dans Figma). Tous les textes sont en Geist, avec Helvetica / Arial en secours hors Figma.
2. **Maquettes** : glisser-déposer `Oralys-Team-planche-complete.svg` (tout d'un coup) ou les fichiers de `screens/` sur le canevas.
3. **Transformer chaque écran en frame** : sélectionner le groupe d'un écran (ex. `02 · Planning · Binômes (semaine)`), puis clic droit → *Frame selection* (⌥⌘G). Recommandé : activer *Clip content*.
4. **Tokens** : plugin **Tokens Studio for Figma** → *Load from file* → `tokens.json`, puis créer les styles / variables.

### Ce que vous obtenez dans Figma

Les SVG ont été produits par un exportateur écrit pour Figma (et non une simple capture du navigateur) :

- **Calques nommés comme un fichier de designer** : `Header · oralys`, `Navigation · Tableau de bord`, `Card · À traiter en priorité`, `Button · Déclarer une absence`, `Badge · Congé · à valider`, `Modale · Déclarer une absence`, `Fiche latérale · Thomas Dupont`, `Ligne · Dr Sophie Martin`, `Icon · calendar-plus`… Conteneurs génériques nommés d'après leur mise en page : `Rangée`, `Pile`, `Grille`, `Actions`, `Bloc`.
- **Formes réelles** : chaque fond est un rectangle (`Fond`) avec son rayon d'arrondi, chaque contour est un trait (`Bordure`, pointillé si besoin), les séparateurs sont des filets (`Bordure basse`…). Couleurs en hex + opacité.
- **Textes éditables**, posés sur leur ligne de base, avec la vraie graisse, la taille, l'interlettrage, les majuscules appliquées, le barré. Texte tronqué à l'écran = tronqué avec « … ».
- **Icônes Lucide en vecteurs** (tracés éditables, couleur appliquée), nommées `Icon · nom-de-l-icône`.
- **Arborescence aplatie** : un groupe n'existe que s'il porte quelque chose de visible ou regroupe plusieurs éléments. Aucun masque, aucun attribut technique.

## Découpage par version

La démo a un sélecteur de version (menu utilisateur, ou pastille à côté de « Team ») : ce qui n'est pas encore livré dans la version choisie est masqué, et un message liste ce qu'on peut faire en plus. La page `/team/feuille-de-route` présente les 5 versions.

| Version | Problème réglé | Ce qu'on peut faire en plus | Écrans |
|---|---|---|---|
| **MVP** · Qui est là, qui manque | Les absences vivent dans un tableau à part, l'alerte passe par téléphone | Créer, inviter, archiver, réactiver un utilisateur (email en double bloqué) · déclarer, valider, refuser, annuler une absence ou retirer un jour · planning par personne · alerte de dernier moment et agenda Soins fermé · se mettre sur son profil (changer d'utilisateur par PIN), nom affiché dans l'en-tête | 01, 03 à 07, 09, 22 à 30, 37 à 41, 53 à 55 |
| **V1** · Binômes et remplacements | On ne sait pas qui travaille avec quel praticien ni qui remplace | Équipe de chaque praticien (titulaires, back-ups, besoin) · vue Binômes et manques · récupérer un prêt, prêter pour la journée, accepter moins d'assistants · remplaçants classés par règles, reprogrammer un RDV | 02, 08, 10, 12 à 18, 36, 43, 44, 56 |
| **V2** · Intelligence et conformité | Rendre les remplacements plus justes et tracer qui fait quoi | Score d'affinité · suggestion à la prise de RDV dans Soins · rôles et grille des droits · journal d'audit · réglage des postes partagés (PIN obligatoire, verrouillage), opérateur de stérilisation | 11, 19 à 21, 31 à 35 |
| **V3** · Le collaborateur | Le collaborateur devient acteur de son planning | Disponibilités, compétences, actes préférés · préférences de binôme confidentielles | 42 |
| **V4** · Temps de travail | La clinique pointe avec des bipeurs, sans lien avec le planning, les absences ni le contrat | Pointer arrivée, pause, reprise, départ depuis son profil · heures de la semaine comparées au contrat · heures au-delà du contrat et anomalies (départ oublié, pause trop courte, plus de 10 h) · correction tracée au journal · récapitulatif du mois et export paie | 49 à 52, 57, 58 |

Différences visibles d'une version à l'autre (utile pour le développement) : en MVP, pas d'onglets Remplacements ni Praticiens & équipes, pas de vue Binômes ni de tensions d'assistants ; « Trouver un remplaçant » devient « Voir le planning » ; l'Aperçu Soins ne montre que l'agenda fermé ; dans l'Administration, Rôles, Postes et Journal apparaissent grisés avec leur version.

## Droits par rôle

Droits par défaut, validés le 25/09/2026. Ils découlent de la grille des droits (`src/components/team/Access.tsx`) : si le gestionnaire donne un droit à quelqu'un, la fonctionnalité apparaît pour lui. Resp. stérilisation s'ajoute au rôle principal (droits additionnés). Les praticiens, libéraux, ne pointent pas. Assistants et aides voient le planning en lecture seule.

**Vue par défaut** (à la connexion, au changement d'utilisateur, au clic sur le logo ou en venant de Soins) : **Tableau de bord** pour les gestionnaires et les praticiens, **Planning** pour tous les autres profils (assistant, aide, secrétaire, comptable, resp. stérilisation). Un rôle cumulé avec praticien ou gestionnaire arrive sur le tableau de bord. L'onglet Tableau de bord reste accessible à tous.

| Ce qu'on peut faire | Version | Gestionnaire | Praticien | Secrétaire | Assistant dentaire | Aide dentaire | Comptable | Resp. stérilisation |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Général** |  |  |  |  |  |  |  |  |
| Changer d'utilisateur (code PIN), voir son nom dans l'en-tête | MVP | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tableau de bord : présents, « Qui est là », absences à venir | MVP | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| « À traiter en priorité », RDV à risque, alertes (cloche) | MVP | ✓ | ✓ | ✓ | — | — | — | — |
| Bouton « Gérer les utilisateurs » | MVP | ✓ | — | — | — | — | — | — |
| **Absences** |  |  |  |  |  |  |  |  |
| Déclarer ou annuler sa propre absence | MVP | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Déclarer ou annuler l'absence d'un autre | MVP | ✓ | — | ✓ | — | — | — | — |
| Valider ou refuser une demande d'absence | MVP | ✓ | — | ✓ | — | — | — | — |
| **Planning d'équipe** |  |  |  |  |  |  |  |  |
| Consulter le planning (par personne, binômes) | MVP | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Agir depuis le planning (manque, prêt du jour, besoin du jour, tensions) | V1 | ✓ | — | ✓ | — | — | — | — |
| **Remplacements** |  |  |  |  |  |  |  |  |
| Voir les RDV à réaffecter et les candidats | V1 | ✓ | ✓ | ✓ | — | — | — | — |
| Affecter un remplaçant | V1 | ✓ | ✓ | ✓ | — | — | — | — |
| Reprogrammer ou annuler un RDV | V1 | ✓ | ✓ | ✓ | — | — | — | — |
| **Praticiens & équipes** |  |  |  |  |  |  |  |  |
| Voir et régler les fiches praticiens (titulaires, back-ups, besoin) | V1 | ✓ | Sa fiche | ✓ | — | — | — | — |
| Créer un profil praticien | V1 | ✓ | — | ✓ | — | — | — | — |
| **Aperçu Soins** |  |  |  |  |  |  |  |  |
| Voir l'agenda fermé d'un praticien absent | MVP | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Prise de RDV avec suggestion d'assistant | V2 | ✓ | ✓ | ✓ | — | — | — | — |
| Être opérateur d'un cycle de stérilisation | V2 | — | ✓ | — | ✓ | ✓ | — | ✓ |
| **Administration** |  |  |  |  |  |  |  |  |
| Utilisateurs : créer, inviter, archiver, supprimer, modifier | MVP | ✓ | — | — | — | — | — | — |
| Rôles et grille des droits, postes partagés | V2 | ✓ | — | — | — | — | — | — |
| Journal d'audit | V2 | ✓ | — | — | — | — | — | ✓ |
| **Mon profil** |  |  |  |  |  |  |  |  |
| Disponibilités, actes préférés, préférences de binôme | V3 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Modifier les habilitations | V3 | ✓ | — | — | — | — | — | — |
| **Temps de travail** |  |  |  |  |  |  |  |  |
| Pointer (arrivée, pause, départ) avec son code PIN, voir ses propres heures | V4 | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Voir les heures de toute l'équipe, corriger un pointage | V4 | ✓ | — | ✓ | — | — | — | — |
| Récapitulatif du mois de toute l'équipe et export CSV pour la paie | V4 | ✓ | — | ✓ | — | — | — | — |

## Identité de la planète Team

- **Liseré de 3 px sous l'en-tête** : rose `planet.team.lisere` (#f9a8d4) pour Team, vert `planet.soins.lisere` (#bef264) pour Soins. C'est le repère principal pour savoir sur quelle planète on se trouve (écrans 01 et 23).
- **Sélecteur de planète** : pastille « Team ▾ » à droite du logo, rose ; « Soins ▾ » en vert côté Soins. Menu « Univers Oralys » : Soins, Team, Compta (bientôt) (écrans 23, 40).
- **Accent** : rose pour tout ce qui est actif (onglet souligné rose, filtre actif sur fond pink-100, badges compteurs pink-500). Les boutons primaires restent noirs (charte shadcn / Oralys).
- **Sous-navigation** : fond dégradé très léger rose vers blanc, onglets texte, soulignement rose 2 px sur l'onglet actif.
- **Mise en page** : en-tête sur 3 colonnes (logo + planète | cabinet centré | changer d'utilisateur, alertes, avatar), contenu 1280 px max, Administration avec barre latérale de 256 px (même ordre que la prod, entrées Team badgées « Team »).

## Inventaire des écrans

### Présentation de la démo
| # | Fichier | Contenu | User stories |
|---|---|---|---|
| 45 | `45-feuille-de-route` | Frise MVP → V3, et pour chaque version : problème réglé, ce qu'on peut faire en plus, numéros des maquettes, « Voir la démo en V1 » | Présenter l'évolution du module |
| 46 | `46-version-en-cours` | Pastille de version cliquable dans l'en-tête : ce que la version permet, « Commencer la démo ici », bascule MVP / V1 / V2 / V3 | Savoir où on en est pendant une démo |
| 47 | `47-selecteur-de-version` | Menu utilisateur : les 5 versions avec une phrase chacune, lien vers la feuille de route | Choisir la version à montrer |
| 48 | `48-message-changement-de-version` | Message après une bascule : « Démo en V2 · … », liste de ce qu'on peut faire en plus | Expliquer ce qui vient d'apparaître |

### Tableau de bord
| # | Fichier | Contenu | User stories |
|---|---|---|---|
| 01 | `01-tableau-de-bord` | KPI (présents, RDV à risque, demandes, utilisateurs), « À traiter en priorité » (absence de dernier moment, tension, demandes), « Qui est là aujourd'hui » par rôle, absences à 14 jours | Vue d'ensemble, alertes proactives Team → Soins |

### Planning
| # | Fichier | Contenu | User stories |
|---|---|---|---|
| 02 | `02-planning-binomes-semaine` | **Vue Binômes** (par défaut) : une ligne par praticien, besoin en assistants, titulaires / back-ups, puces par jour (titulaire vert, back-up bleu pointillé ↻, prêt violet ⇄, « Manque n » rouge), titulaires absents barrés, bandeau Tensions | Qui travaille avec quel praticien, manques selon le besoin |
| 03 | `03-planning-par-personne` | Vue par personne groupée par les 6 rôles de la prod, filtres par rôle avec compteurs, cellule = praticien du jour (assistant) ou binôme (praticien) | Calendrier consolidé, absences par poste |
| 04 | `04-planning-mois` | Même vue sur le mois (cellules compactes) | Vue mensuelle |
| 05 | `05-planning-demandes-a-valider` | Demandes de congé : charge d'agenda du praticien (barre %), tension créée si validée, Valider / Refuser | Arbitrer un congé en connaissant la charge |
| 06 | `06-planning-toutes-absences` | Liste de toutes les absences, badge cliquable, annulation | Historique des absences |
| 07 | `07-planning-absence-retour-arriere` | Popover d'absence : détails, « Présent(e) finalement le … », « Annuler toute l'absence », lien vers les RDV impactés | Retour arrière total ou pour un jour |
| 08 | `08-planning-binome-actions` | Popover sur une puce d'assistant : déclarer absent ce jour, voir la fiche (et « Retirer le prêt » pour un prêt) | Action directe depuis le planning |
| 43 | `43-planning-manque-pourquoi-et-actions` | Clic sur « Manque 1 » : où est chaque assistant rattaché ce jour-là (prêté à un autre praticien, absent, présent), boutons « Récupérer » (annule un prêt) et « Retirer l'absence », action **« Confirmer : 1 assistant suffit »** pour cette journée seulement, lien vers les prêts | Comprendre un manque et agir sans quitter le planning |
| 44 | `44-planning-besoin-ajuste-journee` | Après confirmation : case verte, mention « Besoin 1 ce jour (au lieu de 2) », popover avec « Rétablir 2 » | Accepter de travailler avec moins d'assistants un jour donné, réversible |
| 09 | `09-planning-declarer-absence` | Modale de déclaration : collaborateur, motif (segmenté), dates, précision, alerte « dernier moment » | Déclarer une absence (maladie, congé, formation) |

### Remplacements
| # | Fichier | Contenu | User stories |
|---|---|---|---|
| 10 | `10-remplacements-brique1-regles` | Liste des RDV à réaffecter, filtres par absence, candidats classés par règles (titulaire, back-up n°), « Meilleur binôme », RDV à reporter (praticien absent) | Brique 1 : substitution par règles |
| 11 | `11-remplacements-brique2-affinite` | Classement par score d'affinité 0-100, détail « Pourquoi ? » (rattachement, historique Soins, actes, retours, habilitations, préférences), personnes écartées et raisons | Brique 2 : score d'affinité |
| 12 | `12-remplacements-aucun-admissible` | État vide « Aucun assistant admissible » avec « Reprogrammer le RDV » ou « Maintenir sans assistant » (le RDV reste, sans alerte) | Nettoyer les RDV sans solution, garder le RDV au besoin |
| 13 | `13-remplacements-reprogrammer-rdv` | Modale ouverte depuis le même état vide : 6 prochains créneaux où praticien libre + binôme dispo (score), « Choisir », « Annuler le RDV » | Rebooker un RDV |
| 14 | `14-remplacements-journee-pret-assistant` | Arrivée depuis un « Manque » du planning (bandeau filtré), équipe du jour avec raison de chaque absence, **Solutions** : prêter un assistant pour la journée avec impact simulé | Combler un manque sans toucher aux rattachements |

### Praticiens & équipes
| # | Fichier | Contenu | User stories |
|---|---|---|---|
| 15 | `15-equipes-fiche-praticien` | Fiche 360° : spécialités, salles, jours de travail, absences à venir, équipe rattachée (ordre, titulaire / back-up, jours avec le praticien), titulaires prévus par jour / besoin, affinités. Plus de jauge de charge agenda | Fiche praticien centralisée, vue équipe par praticien |
| 16 | `16-equipes-besoin-assistants` | Liste « Besoin : 0 à 3 assistants / jour » (0 = travaille seul). Cases de jours : cochées = jours avec le praticien, pointillé rose = aucun jour coché donc tous ses jours, barrées = le praticien ne consulte pas | Dimensionner l'équipe |
| 17 | `17-equipes-specialites` | Multi-sélection de spécialités (liste de la prod) avec recherche, sauvegarde auto « Spécialités sauvegardées » | Spécialités visibles par le secrétariat |
| 18 | `18-equipes-nouveau-profil-bloque` | Création de profil praticien bloquée sans utilisateur rattaché | Blocage profil praticien orphelin |

### Aperçu Soins (points de contact Team → Soins)
| # | Fichier | Contenu | User stories |
|---|---|---|---|
| 19 | `19-soins-prise-rdv-suggestion` | Prise de RDV : alerte « assistant habituel absent », meilleur binôme proposé | Brique 3 : suggestion contextuelle |
| 20 | `20-soins-fiche-patient-droits` | Fiche patient : consultation concurrente (« en cours de consultation par … », demander la main), actions selon les droits, décision clinique masquée pour un non-soignant | Accès concurrents, droits appliqués sans reconnexion |
| 21 | `21-soins-sterilisation-operateur` | Cycle de stérilisation sur poste partagé : opérateur obligatoire, différent de la session | Opérateur explicite (Oralpes) |
| 22 | `22-soins-agenda-ferme` | Absences praticiens validées → agenda Soins fermé | Fermeture automatique de l'agenda |
| 23 | `23-oralys-soins-selecteur-planete` | Planète Soins (liseré vert) et son sélecteur | Passage d'une planète à l'autre |

### Administration
| # | Fichier | Contenu | User stories |
|---|---|---|---|
| 24 | `24-admin-utilisateurs` | Tableau (utilisateur, rôles, environnement, statut), filtres Tous / Actifs / En attente / Archivés, recherche | Gestion des utilisateurs |
| 25 | `25-admin-utilisateur-menu-actions` | Menu de ligne (en attente) : renvoyer le mail, voir l'email, simuler l'activation, modifier, archiver, supprimer | Cycle de vie |
| 26 | `26-admin-creer-utilisateur-doublon` | Création : identifiant déjà utilisé, bouton désactivé | Blocage des doublons |
| 27 | `27-admin-creer-utilisateur-permissions` | Création : rôles cumulables à gauche, **permissions couvertes** en direct à droite (comme la prod), info profil praticien | Rôles multiples, lisibilité des droits |
| 30 | `30-admin-invitation-envoyee` | Aperçu de l'email d'invitation | Définir son mot de passe |
| 28 | `28-admin-archiver-utilisateur` | Archivage : motif, impacts (RDV à réaffecter, équipes, historique conservé) | Archiver sans perdre l'historique |
| 29 | `29-admin-supprimer-definitivement` | Suppression définitive avec confirmation par saisie de l'email | Suppression définitive |
| 31 | `31-admin-roles-matrice` | Matrice rôles × droits (12 permissions prod + 2 « Nouveau Team »), décision clinique verrouillée hors soignants | Qui a accès à quoi |
| 32 | `32-admin-roles-par-utilisateur` | Matrice utilisateurs × droits | Revue RGPD / audit |
| 33 | `33-admin-nouveau-role` | Création de rôle à partir d'un rôle existant, professionnel de santé, transverse | Rôles paramétrables par cabinet |
| 34 | `34-admin-journal-audit` | Journal filtrable (personne, type, période, sensibles), rôle au moment de l'action, poste | Traçabilité |
| 35 | `35-admin-postes-partages` | Réglages par poste : PIN, opérateur explicite, verrouillage auto | Postes partagés |

### Temps de travail (pointage, V4)
| # | Fichier | Contenu | User stories |
|---|---|---|---|
| 49 | `49-pointage-pointeuse` | Pastille « Pas encore pointé » / « En poste · 2 h 43 » dans l'en-tête ; au clic : nom de la personne en grand, « Ce n'est pas vous ? Changer d'utilisateur », bouton d'action du moment, pointages du jour | Pointer sur son propre profil, remplace les bipeurs |
| 50 | `50-temps-de-travail-semaine` | Semaine en cours : KPI (en poste maintenant, heures au-delà du contrat, anomalies), une ligne par salarié, heures par jour et horaires, total comparé au contrat | Voir les heures de chacun |
| 51 | `51-temps-de-travail-semaine-badges` | Semaine précédente importée des badges : heures sup d'Inès, départ oublié de Camille en rouge | Reprendre l'historique des bipeurs, repérer heures sup et anomalies |
| 52 | `52-temps-de-travail-correction` | Détail d'une journée : anomalie, pointages avec leur source (Badge, Oralys, Correction), ajout d'un pointage oublié avec motif obligatoire | Corriger un oubli, tracé au journal |
| 57 | `57-pointage-code-pin` | Chaque pointage se confirme avec le code PIN de la personne connectée ; mauvais code = rien n'est pointé | Personne ne pointe à la place d'un autre |
| 58 | `58-temps-de-travail-mois-paie` | Vue Mois (paie) : heures par semaine, total face au contrat mensualisé, sup 25 % / 50 %, complémentaires, absences, anomalies ; export CSV récapitulatif et détail | Préparer la paie, exporter pour le cabinet comptable |

### Vues par rôle
| # | Fichier | Contenu | User stories |
|---|---|---|---|
| 53 | `53-role-assistant-tableau-de-bord` | Tableau de bord de Thomas (assistant), accessible par l'onglet mais plus sa vue par défaut : présents, « Qui est là », absences à venir ; pas d'alertes, de demandes ni de gestion des comptes | Chacun ne voit que ce qui le concerne |
| 54 | `54-role-assistant-planning-lecture-seule` | **Vue par défaut** des assistants, aides, secrétaires et comptables. Planning consultable sans aucun clic, sans demandes à valider ni bouton de déclaration | Assistants et aides : visualiser seulement |
| 55 | `55-role-section-reservee` | Lien direct vers une section non autorisée : droit requis et personne connectée, bouton « Retour à l'accueil » (vue par défaut de la personne) | Pas de page cassée |
| 56 | `56-role-praticien-sa-fiche` | Dr Perche ne voit et ne règle que sa propre fiche (équipe, besoin, spécialités) | Le praticien règle son équipe |

### Éléments globaux
| # | Fichier | Contenu |
|---|---|---|
| 36 | `36-fiche-personne` | Fiche latérale ouverte depuis n'importe quel nom : liens vers Planning, Remplacements, Journal, Modifier, déclarer une absence, absences en cours, onglets Rôles & droits / Dispos / Historique |
| 37 | `37-changer-utilisateur-choix` | Bascule rapide sur poste partagé : choix de la personne et du poste |
| 38 | `38-changer-utilisateur-pin` | Saisie du PIN à 4 chiffres |
| 39 | `39-notifications` | Alertes Team → Soins |
| 40 | `40-selecteur-planete-team` | Menu « Univers Oralys » côté Team |
| 41 | `41-menu-utilisateur` | Menu avatar : profil, administration, changer d'utilisateur, réinitialiser la démo |
| 42 | `42-mon-profil` | Disponibilités, actes préférés, habilitations, préférences de binôme (confidentiel), mes absences |

## Composants (base shadcn/ui, style radix-nova)

| Composant | Variantes / états utilisés |
|---|---|
| Button | default (noir), outline, ghost, destructive, link ; tailles xs 24, sm 28, default 32, icon |
| Badge | secondary (rôles), outline (statuts, priorités), destructive (dernier moment), rose (compteurs) |
| Card | titre, description, action à droite, contenu |
| Tabs | variante « line » (soulignée) et « default » (segmentée : Brique 1 / Brique 2) |
| ToggleGroup | outline (Binômes / Par personne, Semaine / Mois, motifs d'absence, jours) ; état actif rose |
| Dialog / AlertDialog | modales centrées, pied de page gris, média icône pour les confirmations |
| Sheet | fiche latérale droite 576 px |
| Popover / DropdownMenu / Select / Command | menus flottants, liste avec coche, recherche |
| Table | en-têtes en capitales grises, lignes 56 px |
| Checkbox, Switch, RadioGroup, InputOTP, Input, Textarea | formulaires |
| Alert | warning (ambre), destructive (rose), info (bleu), succès (vert) |
| Progress | charge d'agenda, score d'affinité |
| Avatar | initiales, 6 teintes selon l'identifiant, grisé si archivé |

Composants propres à Team (à créer comme composants Figma) :

- **PillFilter** : filtres en pastilles, actif = fond pink-100 texte pink-900, compteur gris.
- **StatusBadge** : ACTIF (vert), EN ATTENTE (ambre), ARCHIVÉ (gris), capitales 11 px.
- **AbsenceBadge** : Congé (bleu), Maladie (rose), Formation (violet), Autre (gris) ; « à valider » = fond blanc, bordure pointillée 2 px ; « Dernier moment » = anneau rose + sirène.
- **BinomeChip** : titulaire / back-up ↻ / prêt ⇄ / Manque n / titulaire absent barré / « Prénom → Dr X ».
- **BinomeCell** : état couvert (fond vert très pâle), manque (fond rose + contour), absent (badge d'absence « agenda fermé »), repos (gris).
- **CandidateCard** : rang, avatar, nom, « Meilleur binôme », priorité, barre d'affinité, « Pourquoi ? » dépliable, bouton Affecter.
- **PlanetSwitcher** et **Liseré** (Team rose / Soins vert).
- **PersonLink** : nom cliquable, soulignement rose au survol, ouvre la fiche personne.

## Parcours à prototyper dans Figma

1. **Absence de dernier moment** : 01 (alerte rouge) → 10 (RDV à réaffecter) → 11 (pourquoi ce binôme) → affecter → 01 (alerte passée au vert « gérée »).
2. **Manque sur une journée** : 02 (clic « Manque 1 ») → 43 (pourquoi : Thomas prêté à Dr Dray, Camille à Dr Perche) → « Confirmer : 1 assistant suffit » → 44 (case verte, réversible). Variante : 43 → « Récupérer » (annule le prêt), ou 43 → 14 (prêter un assistant pour la journée) → 02 (puce violette ⇄).
3. **Congé praticien** : 05 (charge d'agenda) → valider → 22 (agenda Soins fermé).
4. **Retour arrière** : 03 → 07 (« Présent(e) finalement ») → toast « Annuler ».
5. **Nouvel utilisateur** : 24 → 26 (doublon) → 27 (permissions couvertes) → 30 (invitation) → 25 (renvoyer le mail).
6. **Poste partagé** : 37 → 38 (PIN) → 20 (droits appliqués immédiatement pour l'assistant).
7. **Aucun remplaçant** : 12 → 13 (reprogrammer).
8. **Changer de planète** : 40 (menu Team) → 23 (Soins, liseré vert).
9. **Présenter l'évolution** : 45 (feuille de route) → « Voir la démo en MVP » → 47 (sélecteur) → V1 → 48 (message « ce qu'on peut faire en plus ») → 46 (pastille pour se repérer) → V2, V3.
10. **Pointage** : 49 (« Commencer ma journée » sur son profil) → 50 (la semaine de l'équipe) → 51 (semaine des badges, anomalie de Camille) → 52 (ajout du départ oublié avec motif).

## Liens directs dans l'app (pour html.to.design ou revue)

- Planning binômes : `/team/planning?date=2026-10-05`
- Planning par personne, une personne en avant : `/team/planning?view=personnes&user=u-camille&date=2026-10-05`
- Remplacements pour un manque : `/team/remplacements?date=2026-10-07&praticien=u-sophie`
- Fiche praticien : `/team/equipes?praticien=env-dray`
- Journal filtré : `/team/reglages/journal?user=u-hugo`

## Limites (à reprendre dans Figma)

- **Ombres** : non incluses. Appliquer `shadow.overlay` (tokens) sur les modales, menus, popovers et la fiche latérale.
- **Auto-layout** : les maquettes sont en positions absolues (c'est le cas de tout SVG). Les calques étant nommés et groupés par composant, on peut les convertir en auto-layout (⇧A) composant par composant.
- **Hachures « ne consulte pas »** : rendues en aplat gris clair.
- **Matrice rôles × droits (31)** : la 7e colonne (Resp. stérilisation) défile horizontalement dans l'app, elle est coupée à 1440 px.
- **Survols, focus, animations** : non capturés. Survol des boutons = assombrissement 20 %, focus = anneau gris 3 px.
- **Emojis** de la planète Soins (écran 23) : textes, pas des icônes vectorielles.
- **Données** : fictives (cabinet Oralpes). Les correspondances rôle → permissions sont déduites de la vidéo de la prod, à confirmer.
