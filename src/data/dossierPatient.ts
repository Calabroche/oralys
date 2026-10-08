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
  /** Présent quand l'item est marqué « à commander » : il remonte alors dans le hub stock. */
  commande?: Commande;
}

export const FOURNISSEURS = ["Henry Schein", "GACD", "Straumann", "Dentsply Sirona", "Labo Dentaire Lyon"];

/** Matériel courant proposé quand on tape dans la checklist. */
export const CATALOGUE: { label: string; fournisseur: string }[] = [
  { label: "Implant Straumann BLT Ø4,1 × 10 mm", fournisseur: "Straumann" },
  { label: "Pilier titane Straumann RC", fournisseur: "Straumann" },
  { label: "Vis de cicatrisation RC", fournisseur: "Straumann" },
  { label: "Membrane Bio-Gide 25 × 25 mm", fournisseur: "GACD" },
  { label: "Bio-Oss 0,5 g", fournisseur: "GACD" },
  { label: "Fils de suture 4/0 résorbables", fournisseur: "Henry Schein" },
  { label: "Composite A2 (seringue)", fournisseur: "GACD" },
  { label: "Gel de chlorhexidine 1 %", fournisseur: "Henry Schein" },
  { label: "Curettes Gracey 11/12", fournisseur: "Henry Schein" },
  { label: "Fil de contention tressé 0.0195", fournisseur: "Dentsply Sirona" },
  { label: "Silicone d'empreinte light", fournisseur: "Dentsply Sirona" },
  { label: "Couronne zircone (labo)", fournisseur: "Labo Dentaire Lyon" },
  { label: "Bridge zircone (labo)", fournisseur: "Labo Dentaire Lyon" },
];

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
  pastilles: Pastille[];
  actes: Acte[];
  observations?: string[];
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
    notes: [{ id: "n-dray-1", date: "02/06/26", auteur: "Dr. Dray", texte: "Paiement en 3 fois accordé pour l'implant", epinglee: false }],
    rdvs: [
      {
        id: "dray-1",
        date: "2026-06-09",
        heure: "10:30",
        duree: 30,
        type: "implanto",
        praticien: "Dr. Paul Dray",
        zone: { dents: [14] },
        motif: "Pose implant",
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
      { id: "n-cab-2", date: "05/10/26", auteur: "Accueil", texte: "Préfère les RDV le matin, pas le mercredi", epinglee: true },
      { id: "n-cab-3", date: "29/07/26", auteur: "Dr. Roude", texte: "Malade cancer depuis 20 ans", epinglee: false },
      { id: "n-cab-4", date: "29/07/26", auteur: "Dr. Gomez", texte: "Chico en moins", epinglee: false },
    ],
    rdvs: [
      {
        id: "cab-8",
        date: "2026-11-04",
        heure: "10:00",
        duree: 60,
        type: "implanto",
        praticien: "Dr. David Gomez",
        zone: { dents: [12] },
        motif: "Implant",
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
    notes: [],
    rdvs: [
      {
        id: "arf-5",
        date: "2026-10-20",
        heure: "18:00",
        duree: 30,
        type: "ortho",
        praticien: "Dr. Paul Dray",
        zone: { dents: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] },
        motif: "Gouttière de bruxisme",
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
        zone: { dents: [36], faces: { 36: "MOD" } },
        motif: "Composite",
        pastilles: ["paiement-ok", "fse"],
        actes: [{ code: "HBMD053", dents: [36], libelle: "Restauration d'une dent sur 3 faces ou plus par matériau inséré en phase plastique", rac: 0, prix: 100.22 }],
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
