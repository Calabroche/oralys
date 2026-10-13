import type { ZoneRdv } from "@/lib/dents";

/** absent = dent manquante (trait bleu), extrait = extraction faite ou prévue (trait rouge). */
export type EtatDent = "soigne" | "prevu" | "absent" | "extrait";
/** Date du jour de la démo : les RDV d'exemple sont écrits autour du 7 octobre 2026. */
export const AUJOURDHUI_DEMO = "2026-10-07";

export type StatutCommande = "a-commander" | "commande" | "recu";

export interface Commande {
  statut: StatutCommande;
  quantite: number;
  fournisseur: string;
  /** jj/mm, renseigné au passage de commande. */
  commandeLe?: string;
}

export interface ItemChecklist {
  id: string;
  label: string;
  fait: boolean;
  /** Quantité utilisée pendant le RDV (matériel du catalogue) : décomptée du stock quand on coche. */
  quantite?: number;
  /** Ajouté tout seul d'après un acte du RDV (libellé de l'acte). */
  selonActe?: string;
  /** Présent quand l'item est marqué « à commander » : il remonte alors dans le hub stock. */
  commande?: Commande;
}

export const FOURNISSEURS = ["Henry Schein", "GACD", "Straumann", "Dentsply Sirona", "Labo Dentaire Lyon"];

export interface Materiel {
  label: string;
  fournisseur: string;
  categorie: string;
  /** Quantité en stock au cabinet au début de la démo. */
  stock: number;
  /** En dessous ou à ce niveau : « penser à recommander ». */
  seuil: number;
  /** Fabriqué à la demande (labo) : jamais en stock, toujours commandé pour le patient. */
  surMesure?: boolean;
}

/** Inventaire du cabinet : tout le matériel suivi, avec son stock de départ. */
export const CATALOGUE: Materiel[] = [
  { label: "Implant Straumann BLT Ø4,1 × 10 mm", fournisseur: "Straumann", categorie: "Implantologie", stock: 2, seuil: 2 },
  { label: "Pilier titane Straumann RC", fournisseur: "Straumann", categorie: "Implantologie", stock: 0, seuil: 1 },
  { label: "Vis de cicatrisation RC", fournisseur: "Straumann", categorie: "Implantologie", stock: 4, seuil: 2 },
  { label: "Membrane Bio-Gide 25 × 25 mm", fournisseur: "GACD", categorie: "Chirurgie", stock: 1, seuil: 1 },
  { label: "Bio-Oss 0,5 g", fournisseur: "GACD", categorie: "Chirurgie", stock: 3, seuil: 2 },
  { label: "Fils de suture 4/0 résorbables", fournisseur: "Henry Schein", categorie: "Chirurgie", stock: 12, seuil: 4 },
  { label: "Compresses stériles (×10)", fournisseur: "Henry Schein", categorie: "Consommables", stock: 2, seuil: 5 },
  { label: "Anesthésique articaïne 4 %", fournisseur: "Henry Schein", categorie: "Consommables", stock: 40, seuil: 20 },
  { label: "Digue (feuilles)", fournisseur: "GACD", categorie: "Consommables", stock: 15, seuil: 10 },
  { label: "Composite A2 (seringue)", fournisseur: "GACD", categorie: "Soins", stock: 1, seuil: 2 },
  { label: "Limes endodontiques (boîte)", fournisseur: "Dentsply Sirona", categorie: "Soins", stock: 8, seuil: 3 },
  { label: "Cônes de gutta-percha", fournisseur: "Dentsply Sirona", categorie: "Soins", stock: 25, seuil: 10 },
  { label: "Gel de chlorhexidine 1 %", fournisseur: "Henry Schein", categorie: "Parodontie", stock: 0, seuil: 2 },
  { label: "Curettes Gracey 11/12", fournisseur: "Henry Schein", categorie: "Parodontie", stock: 1, seuil: 2 },
  { label: "Fil de contention tressé 0.0195", fournisseur: "Dentsply Sirona", categorie: "Orthodontie", stock: 0, seuil: 1 },
  { label: "Silicone d'empreinte light", fournisseur: "Dentsply Sirona", categorie: "Prothèse", stock: 6, seuil: 3 },
  { label: "Couronne zircone (labo)", fournisseur: "Labo Dentaire Lyon", categorie: "Prothèse", stock: 0, seuil: 0, surMesure: true },
  { label: "Bridge zircone (labo)", fournisseur: "Labo Dentaire Lyon", categorie: "Prothèse", stock: 0, seuil: 0, surMesure: true },
];

/**
 * Matériel ajouté tout seul à la checklist selon les actes du RDV (code CCAM).
 * La quantité est celle utilisée pour un acte.
 */
export const KITS: Record<string, { label: string; quantite: number }[]> = {
  HBJA003: [
    { label: "Gel de chlorhexidine 1 %", quantite: 1 },
    { label: "Curettes Gracey 11/12", quantite: 1 },
  ],
  LBLD015: [
    { label: "Implant Straumann BLT Ø4,1 × 10 mm", quantite: 1 },
    { label: "Vis de cicatrisation RC", quantite: 1 },
    { label: "Fils de suture 4/0 résorbables", quantite: 1 },
    { label: "Anesthésique articaïne 4 %", quantite: 2 },
  ],
  HBLD418: [
    { label: "Pilier titane Straumann RC", quantite: 1 },
    { label: "Couronne zircone (labo)", quantite: 1 },
  ],
  HBGD025: [
    { label: "Fils de suture 4/0 résorbables", quantite: 1 },
    { label: "Compresses stériles (×10)", quantite: 1 },
    { label: "Anesthésique articaïne 4 %", quantite: 2 },
  ],
  HBGD036: [
    { label: "Compresses stériles (×10)", quantite: 1 },
    { label: "Anesthésique articaïne 4 %", quantite: 1 },
  ],
  HBMD053: [
    { label: "Composite A2 (seringue)", quantite: 1 },
    { label: "Digue (feuilles)", quantite: 1 },
    { label: "Anesthésique articaïne 4 %", quantite: 1 },
  ],
  HBFD006: [
    { label: "Limes endodontiques (boîte)", quantite: 1 },
    { label: "Cônes de gutta-percha", quantite: 2 },
  ],
  HBFD008: [
    { label: "Limes endodontiques (boîte)", quantite: 1 },
    { label: "Cônes de gutta-percha", quantite: 3 },
  ],
  HBFD033: [{ label: "Anesthésique articaïne 4 %", quantite: 1 }],
  LBLD010: [
    { label: "Bio-Oss 0,5 g", quantite: 1 },
    { label: "Membrane Bio-Gide 25 × 25 mm", quantite: 1 },
    { label: "Fils de suture 4/0 résorbables", quantite: 1 },
  ],
};

export type Pastille = "paiement-du" | "paiement-ok" | "ordonnance" | "document" | "fse" | "labo";

export interface TypeRdv {
  label: string;
  /** Liseré de gauche de la carte + pastille du type. */
  border: string;
  pill: string;
}

export const TYPES_RDV: Record<string, TypeRdv> = {
  implanto: { label: "Implantologie", border: "border-l-sky-400", pill: "bg-sky-100 text-sky-800" },
  consult: { label: "Consultation", border: "border-l-lime-300", pill: "bg-lime-100 text-lime-800" },
  prothese: { label: "Prothèse", border: "border-l-sky-300", pill: "bg-sky-100 text-sky-800" },
  endo: { label: "Endodontie", border: "border-l-sky-300", pill: "bg-sky-100 text-sky-800" },
  chir: { label: "Chirurgie Orale", border: "border-l-sky-300", pill: "bg-sky-100 text-sky-800" },
  urgence: { label: "Urgences", border: "border-l-orange-400", pill: "bg-orange-100 text-orange-800" },
  paro: { label: "Parodontie", border: "border-l-violet-300", pill: "bg-violet-100 text-violet-800" },
  soins: { label: "Soins conservateurs", border: "border-l-sky-300", pill: "bg-sky-100 text-sky-800" },
  ortho: { label: "Orthodontie", border: "border-l-amber-300", pill: "bg-amber-100 text-amber-800" },
};

export interface Acte {
  code: string;
  dents: number[];
  libelle: string;
  rac: number;
  prix: number;
}

export interface Rdv {
  id: string;
  /** null = étape de devis pas encore planifiée. */
  date: string | null;
  heure?: string;
  duree: number;
  type: keyof typeof TYPES_RDV;
  praticien: string;
  zone: ZoneRdv;
  motif: string;
  /**
   * Plusieurs actes sur le même RDV (« Extraction 12 + Implant 46 ») : ce qui s'affiche sur la carte.
   * Absent : la carte montre le motif et la zone.
   */
  gestes?: { label: string; zone: ZoneRdv }[];
  pastilles: Pastille[];
  actes: Acte[];
  observations?: string[];
  /** Observation épinglée (son index) : affichée en tête de la liste des observations. */
  observationEpinglee?: number;
  /** Note du rendez-vous, saisie à sa création ou dans le devis (« Notes » de la prod) : c'est elle que montre la carte. */
  note?: string;
  /** Devis lié à ce rendez-vous (créé depuis sa fiche). */
  devisLie?: { id: string; date: string; statut: "attente" | "accepte" };
  etape?: string;
  checklist?: ItemChecklist[];
}

export interface Devis {
  id: string;
  praticien: string;
  etapes: Rdv[];
}

export interface NotePrivee {
  id: string;
  /** jj/mm/aa, comme dans la modale de prod. */
  date: string;
  auteur: string;
  texte: string;
  epinglee: boolean;
  /**
   * Note opérationnelle : générale, pour l'organisation (accueil, paiement, préférences),
   * visible par toute l'équipe et jamais masquée. Sinon, note privée du praticien.
   */
  operationnelle?: boolean;
}

export interface Patient {
  id: string;
  prenom: string;
  nom: string;
  sexe: string;
  naissance: string;
  age: number;
  tel: string;
  email: string;
  solde: number;
  amo: boolean;
  alertes: string[];
  antecedents: string[];
  majLe: string;
  etatDents: Record<number, EtatDent>;
  compteurs: [number, number, number, number];
  notes: NotePrivee[];
  rdvs: Rdv[];
  devis?: Devis;
}

export const PATIENTS: Patient[] = [
  {
    id: "dray",
    prenom: "Laurent",
    nom: "Dray",
    sexe: "Homme",
    naissance: "01/01/1975",
    age: 51,
    tel: "06 00 00 00 00",
    email: "Laurent@dray.fr",
    solde: 1456.26,
    amo: false,
    alertes: [],
    antecedents: [],
    majLe: "02/06/2026",
    etatDents: { 16: "soigne", 15: "soigne", 14: "prevu", 25: "soigne", 26: "soigne", 46: "soigne", 45: "soigne", 34: "soigne", 35: "soigne", 36: "soigne" },
    compteurs: [1, 0, 0, 3],
    notes: [
      { id: "n-dray-1", date: "02/06/26", auteur: "Dr. Dray", texte: "Paiement en 3 fois accordé pour l'implant", epinglee: true, operationnelle: true },
      { id: "n-dray-2", date: "28/05/26", auteur: "Accueil", texte: "Oublie souvent ses RDV : appeler la veille", epinglee: false, operationnelle: true },
      { id: "n-dray-3", date: "04/06/26", auteur: "Dr. Dray", texte: "Bruxisme probable, à surveiller sur la couronne 14", epinglee: false },
    ],
    rdvs: [
      {
        id: "dray-5",
        date: "2026-12-02",
        heure: "10:00",
        duree: 120,
        type: "implanto",
        praticien: "Dr. Paul Dray",
        zone: { dents: [16], site: { label: "droit", title: "Sinus maxillaire droit" } },
        motif: "Sinus lift et implant",
        gestes: [
          { label: "Sinus lift", zone: { dents: [], site: { label: "droit", title: "Sinus maxillaire droit" } } },
          { label: "Implant", zone: { dents: [16] } },
          { label: "Greffe osseuse", zone: { dents: [16] } },
        ],
        observations: ["Bilan CBCT fait : hauteur sous-sinusienne 4 mm, sinus lift indispensable avant l'implant 16."],
        note: "Prémédication la veille",
        pastilles: [],
        actes: [
          { code: "LBLD010", dents: [], libelle: "Comblement préimplantaire sousmuqueux du sinus maxillaire", rac: 0, prix: 0 },
          { code: "LBLD015", dents: [16], libelle: "Pose d'1 implant intraosseux intrabuccal, chez l'adulte", rac: 0, prix: 0 },
        ],
      },
      {
        id: "dray-6",
        date: "2026-10-28",
        heure: "15:00",
        duree: 60,
        type: "soins",
        praticien: "Dr. Paul Dray",
        zone: { dents: [15, 16], cavite: true, faces: { 15: "MO", 16: "O" } },
        motif: "Composites et détartrage",
        gestes: [
          { label: "Composite", zone: { dents: [15], faces: { 15: "MO" } } },
          { label: "Composite", zone: { dents: [16], faces: { 16: "O" } } },
          { label: "Détartrage", zone: { dents: [], cavite: true } },
        ],
        observations: ["Carie distale 15, composite MO. Détartrage en fin de séance."],
        note: "Test notes, rappeler la veille",
        pastilles: ["paiement-du"],
        actes: [
          { code: "HBMD049", dents: [15], libelle: "Restauration d'une dent sur 2 faces par matériau inséré en phase plastique", rac: 0, prix: 50.6 },
          { code: "HBMD038", dents: [16], libelle: "Restauration d'une dent sur 1 face par matériau inséré en phase plastique", rac: 0, prix: 26.97 },
          { code: "HBJD001", dents: [], libelle: "Détartrage et polissage des dents", rac: 0, prix: 28.92 },
        ],
      },
      {
        id: "dray-7",
        date: "2026-10-21",
        heure: "09:30",
        duree: 20,
        type: "consult",
        praticien: "Dr. Paul Dray",
        zone: { dents: [], cavite: true },
        motif: "Contrôle",
        gestes: [
          { label: "Contrôle", zone: { dents: [], cavite: true } },
        ],
        observations: ["Contrôle à 3 mois de l'implant 14, cicatrisation parfaite."],
        pastilles: [],
        actes: [
          { code: "C", dents: [], libelle: "Consultation", rac: 0, prix: 30 },
        ],
      },
      {
        id: "dray-1",
        date: "2026-06-09",
        heure: "10:30",
        duree: 30,
        type: "implanto",
        praticien: "Dr. Paul Dray",
        zone: { dents: [14] },
        motif: "Pose implant",
        observations: ["Pose implant 14 sans complication, stabilité primaire 35 Ncm. Revoir dans 10 jours pour les fils."],
        note: "Prévoir 1 h, patient anxieux",
        pastilles: ["paiement-du"],
        checklist: [
          { id: "ck-dray-1a", label: "Préparer le champ stérile implanto", fait: true },
          { id: "ck-dray-1b", label: "Implant Straumann BLT Ø4,1 × 10 mm", fait: true, commande: { statut: "recu", quantite: 1, fournisseur: "Straumann", commandeLe: "28/05" } },
          { id: "ck-dray-1c", label: "Vis de cicatrisation RC", fait: true, commande: { statut: "recu", quantite: 1, fournisseur: "Straumann", commandeLe: "28/05" } },
        ],
        actes: [
          { code: "LBLD015", dents: [14], libelle: "Pose d'1 implant intraosseux intrabuccal, chez l'adulte", rac: 0, prix: 0 },
          { code: "HBLD418", dents: [14], libelle: "Pose d'une couronne dentaire implantoportée", rac: 0, prix: 0 },
        ],
      },
      {
        id: "dray-2",
        date: "2026-06-04",
        heure: "08:40",
        duree: 30,
        type: "consult",
        praticien: "Dr. Paul Dray",
        zone: { dents: [], cavite: true },
        motif: "Bilan avant implant + panoramique",
        pastilles: ["paiement-du", "ordonnance", "document"],
        actes: [{ code: "HBQK002", dents: [], libelle: "Radiographie panoramique dentomaxillaire", rac: 0, prix: 21.28 }],
        observations: ["Os suffisant en 14, pas de greffe à prévoir."],
      },
      {
        id: "dray-4",
        date: "2026-11-18",
        heure: "09:00",
        duree: 90,
        type: "chir",
        praticien: "Dr. Paul Dray",
        zone: { dents: [47] },
        motif: "Extraction et implant immédiat",
        gestes: [
          { label: "Extraction", zone: { dents: [47] } },
          { label: "Implant", zone: { dents: [47] } },
        ],
        observations: ["Prévoir extraction atraumatique 47 puis implant immédiat si l'os le permet. Patient prévenu de la durée."],
        note: "Venir à jeun, accompagné",
        pastilles: [],
        actes: [
          { code: "HBGD036", dents: [47], libelle: "Avulsion d'une dent permanente sur arcade sans alvéolectomie", rac: 0, prix: 33.44 },
          { code: "LBLD015", dents: [47], libelle: "Pose d'1 implant intraosseux intrabuccal, chez l'adulte", rac: 0, prix: 0 },
        ],
      },
      {
        id: "dray-3",
        date: "2026-05-12",
        heure: "14:00",
        duree: 90,
        type: "chir",
        praticien: "Dr. Paul Dray",
        zone: { dents: [], site: { label: "droit", title: "Sinus maxillaire droit" } },
        motif: "Sinus lift",
        pastilles: ["paiement-ok"],
        actes: [{ code: "LBLD010", dents: [], libelle: "Comblement préimplantaire sousmuqueux du sinus maxillaire", rac: 0, prix: 0 }],
      },
    ],
    devis: {
      id: "Devis-DRAY-260604-1",
      praticien: "Dr. Dray",
      etapes: [
        {
          id: "dray-d2",
          date: null,
          duree: 30,
          type: "prothese",
          praticien: "Dr. Paul Dray",
          zone: { dents: [14] },
          motif: "Couronne sur implant",
          note: "Attendre la couronne du labo",
          pastilles: ["paiement-ok"],
          checklist: [
            { id: "ck-dray-2a", label: "Pilier titane Straumann RC", fait: false, commande: { statut: "a-commander", quantite: 1, fournisseur: "Straumann" } },
            { id: "ck-dray-2b", label: "Couronne zircone sur implant 14", fait: false, commande: { statut: "a-commander", quantite: 1, fournisseur: "Labo Dentaire Lyon" } },
          ],
          actes: [{ code: "HBLD418", dents: [14], libelle: "Pose d'une couronne dentaire implantoportée", rac: 0, prix: 0 }],
          etape: "2/2",
        },
        {
          id: "dray-d1",
          date: "2026-06-02",
          heure: "09:15",
          duree: 75,
          type: "endo",
          praticien: "Dr. Paul Dray",
          zone: { dents: [15, 16] },
          motif: "Reprise de traitement",
          observations: ["Reprise 16 et 15 : obturation canalaire faite, provisoire en place. Couronne à prévoir."],
          note: "Apporter la radio panoramique",
          pastilles: ["paiement-du", "labo"],
          actes: [
            { code: "HBFD006", dents: [15], libelle: "Parage canalaire d'une prémolaire", rac: 0, prix: 48.2 },
            { code: "HBFD008", dents: [16], libelle: "Parage canalaire d'une molaire", rac: 0, prix: 81.94 },
          ],
          etape: "1/2",
        },
      ],
    },
  },
  {
    id: "caboche",
    prenom: "Eugenia",
    nom: "Caboche",
    sexe: "Femme",
    naissance: "04/03/1981",
    age: 45,
    tel: "06 30 93 37 29",
    email: "nadege_deshayes@hotmail.com",
    solde: 736.89,
    amo: true,
    alertes: ["Pénicilline", "Latex", "Ostéoporose", "Cardio-vasculaire"],
    antecedents: ["Fumeur", "Diabète type 1", "Antécédents", "Médicaments"],
    majLe: "07/10/2026",
    etatDents: { 15: "soigne", 13: "extrait", 12: "absent", 46: "soigne" },
    compteurs: [4, 2, 0, 12],
    notes: [
      { id: "n-cab-1", date: "07/10/26", auteur: "Dr. Roude", texte: "Très anxieuse, prévoir du temps et la prévenir avant chaque geste", epinglee: true },
      { id: "n-cab-2", date: "05/10/26", auteur: "Accueil", texte: "Préfère les RDV le matin, pas le mercredi", epinglee: true, operationnelle: true },
      { id: "n-cab-5", date: "30/09/26", auteur: "Accueil", texte: "Vient accompagnée de sa fille, prévenir par SMS", epinglee: false, operationnelle: true },
      { id: "n-cab-3", date: "29/07/26", auteur: "Dr. Roude", texte: "Malade cancer depuis 20 ans", epinglee: false },
      { id: "n-cab-4", date: "29/07/26", auteur: "Dr. Gomez", texte: "Chico en moins", epinglee: false },
    ],
    rdvs: [
      {
        id: "cab-11",
        date: "2026-12-09",
        heure: "09:00",
        duree: 120,
        type: "implanto",
        praticien: "Dr. David Gomez",
        zone: { dents: [35, 36, 37] },
        motif: "Implants",
        gestes: [
          { label: "Implant", zone: { dents: [35] } },
          { label: "Implant", zone: { dents: [36] } },
          { label: "Implant", zone: { dents: [37] } },
        ],
        observations: ["Trois implants 35 à 37 sur guide chirurgical. Antibioprophylaxie la veille, patiente très anxieuse."],
        note: "Bloc 2 h, prévenir l'anesthésiste",
        pastilles: [],
        actes: [
          { code: "LBLD015", dents: [35], libelle: "Pose d'1 implant intraosseux intrabuccal, chez l'adulte", rac: 0, prix: 0 },
          { code: "LBLD015", dents: [36], libelle: "Pose d'1 implant intraosseux intrabuccal, chez l'adulte", rac: 0, prix: 0 },
          { code: "LBLD015", dents: [37], libelle: "Pose d'1 implant intraosseux intrabuccal, chez l'adulte", rac: 0, prix: 0 },
        ],
      },
      {
        id: "cab-10",
        date: "2026-11-25",
        heure: "14:00",
        duree: 90,
        type: "prothese",
        praticien: "Dr. David Gomez",
        zone: { dents: [14, 15, 16, 17, 38, 37, 36, 35, 34, 33, 32, 31] },
        motif: "Bridge, extraction et surfaçage",
        gestes: [
          { label: "Bridge", zone: { dents: [14, 15, 16] } },
          { label: "Extraction", zone: { dents: [17] } },
          { label: "Surfaçage", zone: { dents: [31, 32, 33, 34, 35, 36, 37, 38] } },
        ],
        observations: ["Empreinte bridge 14-16, extraction 17 non conservable, surfaçage du quadrant 3 dans la foulée."],
        note: "RDV long, pause au milieu",
        pastilles: [],
        actes: [
          { code: "HBGD036", dents: [17], libelle: "Avulsion d'une dent permanente sur arcade sans alvéolectomie", rac: 0, prix: 33.44 },
          { code: "HBJA003", dents: [31, 32, 33, 34, 35, 36, 37, 38], libelle: "Assainissement parodontal d'un quadrant", rac: 0, prix: 80 },
        ],
      },
      {
        id: "cab-9",
        date: "2026-11-12",
        heure: "11:00",
        duree: 45,
        type: "chir",
        praticien: "Dr. Lisa Roude",
        zone: { dents: [18, 28] },
        motif: "Extractions",
        gestes: [
          { label: "Extraction", zone: { dents: [18] } },
          { label: "Extraction", zone: { dents: [28] } },
        ],
        observations: ["Extraction des 18 et 28, suites simples prévues. Arrêt de travail de 2 jours remis."],
        pastilles: [],
        actes: [
          { code: "HBGD025", dents: [18, 28], libelle: "Avulsion de 2 troisièmes molaires", rac: 0, prix: 144.21 },
        ],
      },
      {
        id: "cab-8",
        date: "2026-11-04",
        heure: "10:00",
        duree: 60,
        type: "implanto",
        praticien: "Dr. David Gomez",
        zone: { dents: [12] },
        motif: "Implant",
        observations: ["Implant 12 sur site édenté, attendre 3 mois avant la couronne."],
        pastilles: [],
        actes: [{ code: "LBLD015", dents: [12], libelle: "Pose d'1 implant intraosseux intrabuccal, chez l'adulte", rac: 0, prix: 0 }],
      },
      {
        id: "cab-7",
        date: "2026-10-21",
        heure: "11:00",
        duree: 60,
        type: "paro",
        praticien: "Dr. Lisa Roude",
        zone: { dents: [48, 47, 46, 45, 44, 43, 42, 41] },
        motif: "Surfaçage",
        observations: ["Surfaçage Q4, poches de 5 à 6 mm. Réévaluation dans 2 mois."],
        pastilles: [],
        actes: [{ code: "HBJA003", dents: [48, 47, 46, 45, 44, 43, 42, 41], libelle: "Assainissement parodontal d'un quadrant", rac: 0, prix: 80 }],
      },
      {
        id: "cab-6",
        date: "2026-10-14",
        heure: "11:00",
        duree: 90,
        type: "paro",
        praticien: "Dr. Lisa Roude",
        zone: { dents: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23] },
        motif: "Surfaçage radiculaire, 1re séance",
        gestes: [
          { label: "Surfaçage radiculaire, 1re séance", zone: { dents: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23] } },
          { label: "Détartrage", zone: { dents: [], cavite: true } },
        ],
        observations: ["Première séance de surfaçage S1 S2, saignement important, chlorhexidine 15 jours."],
        note: "Prévoir du temps, patiente anxieuse",
        pastilles: ["paiement-du"],
        checklist: [
          { id: "ck-cab-6a", label: "Préparer le kit surfaçage", fait: false },
          { id: "ck-cab-6b", label: "Gel de chlorhexidine 1 %", fait: false, commande: { statut: "a-commander", quantite: 2, fournisseur: "Henry Schein" } },
          { id: "ck-cab-6c", label: "Curettes Gracey 11/12", fait: false, commande: { statut: "a-commander", quantite: 1, fournisseur: "Henry Schein" } },
        ],
        actes: [
          { code: "HBJA003", dents: [18, 17, 16, 15, 14], libelle: "Assainissement parodontal d'un sextant", rac: 0, prix: 80 },
          { code: "HBJA003", dents: [13, 12, 11, 21, 22, 23], libelle: "Assainissement parodontal d'un sextant", rac: 0, prix: 80 },
        ],
      },
      {
        id: "cab-5",
        date: "2026-10-07",
        heure: "14:00",
        duree: 30,
        type: "consult",
        praticien: "Dr. Lisa Roude",
        zone: { dents: [46] },
        motif: "Douleur au froid",
        observations: ["Sensibilité au froid sur la 46, test au froid positif, pas de carie visible. À surveiller."],
        note: "Urgence : douleur au froid depuis 3 jours",
        pastilles: ["paiement-du"],
        actes: [{ code: "C", dents: [], libelle: "Consultation", rac: 0, prix: 30 }],
      },
      {
        id: "cab-4",
        date: "2026-10-07",
        heure: "09:30",
        duree: 60,
        type: "chir",
        praticien: "Dr. Lisa Roude",
        zone: { dents: [18, 28, 38, 48] },
        motif: "Avulsion des dents de sagesse",
        pastilles: ["paiement-ok", "document"],
        checklist: [
          { id: "ck-cab-4a", label: "Fils de suture 4/0 résorbables", fait: true, commande: { statut: "recu", quantite: 2, fournisseur: "Henry Schein", commandeLe: "01/10" } },
        ],
        actes: [{ code: "HBGD025", dents: [38, 48], libelle: "Avulsion de 2 troisièmes molaires", rac: 0, prix: 144.21 }],
        observations: ["Extraction 38 et 48 sans complication. 18 et 28 au prochain RDV."],
      },
      {
        id: "cab-3",
        date: "2026-10-05",
        heure: "13:00",
        duree: 30,
        type: "consult",
        praticien: "Dr. Lisa Roude",
        zone: { dents: [], cavite: true },
        motif: "Détartrage + contrôle annuel",
        observations: ["Détartrage complet, bonne hygiène, contrôle dans 1 an."],
        pastilles: ["paiement-du"],
        actes: [{ code: "HBJD001", dents: [], libelle: "Détartrage et polissage des dents", rac: 0, prix: 28.92 }],
      },
      {
        id: "cab-2",
        date: "2026-09-30",
        heure: "14:35",
        duree: 30,
        type: "prothese",
        praticien: "Dr. David Gomez",
        zone: { dents: [16, 15, 14] },
        motif: "Empreintes bridge",
        observations: ["Empreintes du bridge 14-16 envoyées au labo, teinte A3."],
        note: "Empreintes optiques si possible",
        pastilles: ["document", "ordonnance", "labo"],
        checklist: [
          { id: "ck-cab-2a", label: "Envoyer les empreintes au labo", fait: true },
          { id: "ck-cab-2b", label: "Bridge zircone 14-16", fait: false, commande: { statut: "commande", quantite: 1, fournisseur: "Labo Dentaire Lyon", commandeLe: "30/09" } },
        ],
        actes: [],
      },
      {
        id: "cab-1",
        date: "2026-07-29",
        heure: "14:00",
        duree: 30,
        type: "consult",
        praticien: "Dr. Lisa Roude",
        zone: { dents: [] },
        motif: "",
        pastilles: ["ordonnance"],
        actes: [{ code: "C", dents: [], libelle: "Consultation", rac: 0, prix: 30 }],
      },
    ],
  },
  {
    id: "arfaoui",
    prenom: "Francis",
    nom: "Arfaoui",
    sexe: "Homme",
    naissance: "11/05/2005",
    age: 21,
    tel: "06 75 41 17 92",
    email: "celinepletto@yahoo.fr",
    solde: 41.6,
    amo: false,
    alertes: [],
    antecedents: [],
    majLe: "06/02/2026",
    etatDents: { 11: "prevu", 48: "extrait", 38: "extrait" },
    compteurs: [1, 0, 0, 0],
    notes: [{ id: "n-arf-1", date: "13/06/24", auteur: "Accueil", texte: "Étudiant, tiers payant intégral", epinglee: false, operationnelle: true }],
    rdvs: [
      {
        id: "arf-9",
        date: "2026-12-15",
        heure: "16:00",
        duree: 90,
        type: "endo",
        praticien: "Dr. Flore Perche",
        zone: { dents: [24, 26], faces: { 24: "DO" } },
        motif: "Endo, provisoire et composite",
        gestes: [
          { label: "Endodontie", zone: { dents: [26] } },
          { label: "Couronne provisoire", zone: { dents: [26] } },
          { label: "Composite", zone: { dents: [24], faces: { 24: "DO" } } },
        ],
        observations: ["Pulpite irréversible sur la 26 : endo en une séance, couronne provisoire, composite DO sur la 24."],
        note: "Douleur nocturne, à voir en priorité",
        pastilles: [],
        actes: [
          { code: "HBFD008", dents: [26], libelle: "Parage canalaire d'une molaire", rac: 0, prix: 81.94 },
          { code: "HBMD049", dents: [24], libelle: "Restauration d'une dent sur 2 faces par matériau inséré en phase plastique", rac: 0, prix: 50.6 },
        ],
      },
      {
        id: "arf-8",
        date: "2026-11-23",
        heure: "17:30",
        duree: 30,
        type: "soins",
        praticien: "Dr. Flore Perche",
        zone: { dents: [36, 46] },
        motif: "Scellement de sillons",
        gestes: [
          { label: "Scellement de sillons", zone: { dents: [36] } },
          { label: "Scellement de sillons", zone: { dents: [46] } },
        ],
        observations: ["Scellement des sillons 36 et 46, enfant coopérant."],
        pastilles: [],
        actes: [
          { code: "HBBD005", dents: [36, 46], libelle: "Obturation prophylactique des puits, sillons et fissures sur 2 dents", rac: 0, prix: 43.38 },
        ],
      },
      {
        id: "arf-7",
        date: "2026-11-09",
        heure: "08:30",
        duree: 30,
        type: "soins",
        praticien: "Dr. Flore Perche",
        zone: { dents: [26] },
        motif: "Couronne",
        gestes: [
          { label: "Couronne", zone: { dents: [26] } },
        ],
        observations: ["Couronne céramo-métallique 26 scellée, occlusion vérifiée."],
        pastilles: [],
        actes: [
          { code: "HBLD038", dents: [26], libelle: "Pose d'une couronne dentaire dentoportée céramométallique", rac: 0, prix: 120 },
        ],
      },
      {
        id: "arf-6",
        date: "2026-11-02",
        heure: "14:00",
        duree: 60,
        type: "chir",
        praticien: "Dr. Flore Perche",
        zone: { dents: [12, 46] },
        motif: "Extraction et implant",
        gestes: [
          { label: "Extraction", zone: { dents: [12] } },
          { label: "Implant", zone: { dents: [46] } },
        ],
        observations: ["Extraction 12 délabrée, implant 46 dans la même séance. Prévoir l'arrêt du tabac."],
        note: "Arrêt du tabac conseillé avant",
        pastilles: [],
        actes: [
          { code: "HBGD036", dents: [12], libelle: "Avulsion d'une dent permanente sur arcade sans alvéolectomie", rac: 0, prix: 33.44 },
          { code: "LBLD015", dents: [46], libelle: "Pose d'1 implant intraosseux intrabuccal, chez l'adulte", rac: 0, prix: 0 },
        ],
      },
      {
        id: "arf-5",
        date: "2026-10-20",
        heure: "18:00",
        duree: 30,
        type: "ortho",
        praticien: "Dr. Paul Dray",
        zone: { dents: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] },
        motif: "Gouttière de bruxisme",
        observations: ["Gouttière de bruxisme maxillaire, à porter la nuit. Contrôle dans 1 mois."],
        pastilles: [],
        actes: [],
      },
      {
        id: "arf-3",
        date: "2026-10-09",
        heure: "17:45",
        duree: 15,
        type: "urgence",
        praticien: "Dr. Flore Perche",
        zone: { dents: [11] },
        motif: "Fracture incisive, choc vélo",
        observations: ["Fracture de l'angle mésial de la 11 après une chute à vélo, pulpe exposée."],
        note: "Choc vélo, apporter le morceau de dent",
        pastilles: ["paiement-ok", "fse"],
        checklist: [
          { id: "ck-arf-3a", label: "Composite A2 (seringue)", fait: false, commande: { statut: "commande", quantite: 3, fournisseur: "GACD", commandeLe: "06/10" } },
        ],
        actes: [{ code: "HBFD033", dents: [11], libelle: "Exérèse de la pulpe vivante d'une incisive ou d'une canine", rac: 0, prix: 41.6 }],
      },
      {
        id: "arf-2",
        date: "2026-10-08",
        heure: "08:00",
        duree: 30,
        type: "ortho",
        praticien: "Dr. Paul Dray",
        zone: { dents: [43, 42, 41, 31, 32, 33] },
        motif: "Contention",
        observations: ["Contention 33-43 collée, fil tressé. Revoir dans 6 mois."],
        note: "Prévenir le patient : 45 min",
        pastilles: ["paiement-du", "document"],
        checklist: [
          { id: "ck-arf-2a", label: "Fil de contention tressé 0.0195", fait: false, commande: { statut: "a-commander", quantite: 1, fournisseur: "Dentsply Sirona" } },
          { id: "ck-arf-2b", label: "Prévenir le patient : 45 min", fait: true },
        ],
        actes: [],
      },
      {
        id: "arf-4",
        date: "2026-09-15",
        heure: "16:30",
        duree: 45,
        type: "soins",
        praticien: "Dr. Flore Perche",
        zone: { dents: [36, 37], faces: { 36: "MOD", 37: "O" } },
        motif: "Composite",
        observations: ["Composite 36 MOD et 37 O, anesthésie bien supportée."],
        pastilles: ["paiement-ok", "fse"],
        actes: [
          { code: "HBMD053", dents: [36], libelle: "Restauration d'une dent sur 3 faces ou plus par matériau inséré en phase plastique", rac: 0, prix: 100.22 },
          { code: "HBMD038", dents: [37], libelle: "Restauration d'une dent sur 1 face par matériau inséré en phase plastique", rac: 0, prix: 26.97 },
        ],
      },
      {
        id: "arf-1",
        date: "2024-06-13",
        heure: "14:30",
        duree: 30,
        type: "chir",
        praticien: "Dr. Paul Dray",
        zone: { dents: [38, 48] },
        motif: "Dents de sagesse",
        pastilles: ["paiement-du", "fse"],
        actes: [{ code: "HBGD025", dents: [38, 48], libelle: "Avulsion de dent de sagesse", rac: 0, prix: 144.21 }],
        observations: ["Extr 40S"],
      },
    ],
  },
];
