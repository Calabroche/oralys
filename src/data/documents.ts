export type StatutDoc = "a-signer" | "signe" | "envoye";

export interface DocOralys {
  id: string;
  titre: string;
  date: string; // jj/mm/aaaa
  statut?: StatutDoc;
}

export type Section = "devis" | "documents" | "ordonnances" | "factures" | "questionnaires";

export const SECTIONS: { id: Section; label: string }[] = [
  { id: "devis", label: "Devis" },
  { id: "documents", label: "Documents" },
  { id: "ordonnances", label: "Ordonnances" },
  { id: "factures", label: "Factures" },
  { id: "questionnaires", label: "Questionnaires médicaux" },
];

/** Logiciels d'où viennent les migrations. */
export type Source = "Logos_w" | "Julie" | "Visiodent" | "Desmos";

export type TypeHisto = "Radio" | "Compte rendu" | "Ordonnance" | "Courrier" | "Devis" | "Feuille de soins" | "Photo";

export interface DocHistorique {
  id: string;
  titre: string;
  type: TypeHisto;
  date: string; // jj/mm/aaaa
  format: "pdf" | "jpg" | "txt";
  taille: string;
  /** Extrait affiché dans l'aperçu. */
  extrait?: string;
}

export interface Migration {
  source: Source;
  importeLe: string;
  docs: DocHistorique[];
}

export interface DocsPatient {
  oralys: Record<Section, DocOralys[]>;
  migration?: Migration;
}

const vide = (): Record<Section, DocOralys[]> => ({ devis: [], documents: [], ordonnances: [], factures: [], questionnaires: [] });

export const DOCUMENTS: Record<string, DocsPatient> = {
  dray: {
    oralys: {
      ...vide(),
      devis: [
        { id: "d1", titre: "Devis-DRAY-260604-1", date: "04/06/2026", statut: "signe" },
        { id: "d2", titre: "Devis-DRAY-260310-1", date: "10/03/2026", statut: "a-signer" },
      ],
      documents: [{ id: "doc1", titre: "Panoramique 04-06-2026", date: "04/06/2026" }],
      ordonnances: [{ id: "o1", titre: "Ordonnance antibio implant", date: "04/06/2026", statut: "envoye" }],
      factures: [{ id: "f1", titre: "Facture-2026-0612", date: "09/06/2026" }],
    },
    migration: {
      source: "Julie",
      importeLe: "14/01/2026",
      docs: [
        { id: "h1", titre: "Panoramique", type: "Radio", date: "18/09/2023", format: "jpg", taille: "2,1 Mo" },
        { id: "h2", titre: "Rétro-alvéolaire 14", type: "Radio", date: "02/05/2024", format: "jpg", taille: "640 Ko" },
        { id: "h3", titre: "Compte rendu extraction 14", type: "Compte rendu", date: "02/05/2024", format: "pdf", taille: "88 Ko", extrait: "Avulsion de la 14 fracturée sous anesthésie locale. Alvéole saine, pas de complication. Prévoir implant à 4 mois." },
        { id: "h4", titre: "Ordonnance post-opératoire", type: "Ordonnance", date: "02/05/2024", format: "pdf", taille: "42 Ko", extrait: "Amoxicilline 1 g, 2 fois par jour pendant 6 jours. Paracétamol 1 g si douleur." },
        { id: "h5", titre: "Devis prothèse 2023", type: "Devis", date: "18/09/2023", format: "pdf", taille: "120 Ko" },
        { id: "h6", titre: "Feuille de soins", type: "Feuille de soins", date: "02/05/2024", format: "pdf", taille: "36 Ko" },
      ],
    },
  },
  caboche: {
    oralys: {
      ...vide(),
      devis: [{ id: "d1", titre: "Devis-CABOCHE-261001-1", date: "01/10/2026", statut: "signe" }],
      documents: [
        { id: "doc1", titre: "Consentement chirurgie", date: "07/10/2026", statut: "signe" },
        { id: "doc2", titre: "Charting parodontal", date: "05/10/2026" },
      ],
      ordonnances: [
        { id: "o1", titre: "Ordonnance chirurgie", date: "07/10/2026", statut: "envoye" },
        { id: "o2", titre: "Bain de bouche", date: "05/10/2026", statut: "envoye" },
      ],
      factures: [
        { id: "f1", titre: "Facture-2026-1007", date: "07/10/2026" },
        { id: "f2", titre: "Facture-2026-1005", date: "05/10/2026" },
      ],
      questionnaires: [{ id: "q1", titre: "Questionnaire médical", date: "07/10/2026", statut: "signe" }],
    },
    migration: {
      source: "Logos_w",
      importeLe: "12/03/2026",
      docs: [
        { id: "h1", titre: "Panoramique", type: "Radio", date: "11/02/2025", format: "jpg", taille: "2,4 Mo" },
        { id: "h2", titre: "Bilan long cône", type: "Radio", date: "11/02/2025", format: "jpg", taille: "5,8 Mo" },
        { id: "h3", titre: "Rétro-alvéolaire 46", type: "Radio", date: "03/06/2022", format: "jpg", taille: "580 Ko" },
        { id: "h4", titre: "Panoramique", type: "Radio", date: "14/10/2019", format: "jpg", taille: "2,2 Mo" },
        { id: "h5", titre: "Compte rendu dévitalisation 46", type: "Compte rendu", date: "03/06/2022", format: "pdf", taille: "74 Ko", extrait: "Pulpite irréversible 46. Pulpectomie, 3 canaux, obturation à la gutta. Couronne à prévoir." },
        { id: "h6", titre: "Compte rendu extraction 13 12", type: "Compte rendu", date: "20/01/2021", format: "pdf", taille: "66 Ko", extrait: "Extraction 13 et 12 (fractures radiculaires). Patiente sous traitement pour ostéoporose, avis médecin traitant obtenu." },
        { id: "h7", titre: "Courrier du Dr Martin (cardiologue)", type: "Courrier", date: "08/01/2021", format: "pdf", taille: "210 Ko", extrait: "Pas de contre-indication aux soins dentaires. Antibioprophylaxie non nécessaire." },
        { id: "h8", titre: "Courrier adressage paro", type: "Courrier", date: "11/02/2025", format: "pdf", taille: "54 Ko", extrait: "Je vous adresse Mme Caboche pour une prise en charge parodontale (poches de 5 à 7 mm secteurs 1 et 2)." },
        { id: "h9", titre: "Ordonnance antalgiques", type: "Ordonnance", date: "03/06/2022", format: "pdf", taille: "38 Ko", extrait: "Ibuprofène 400 mg, 3 fois par jour pendant 3 jours." },
        { id: "h10", titre: "Ordonnance post-extraction", type: "Ordonnance", date: "20/01/2021", format: "pdf", taille: "40 Ko" },
        { id: "h11", titre: "Devis couronne 46", type: "Devis", date: "03/06/2022", format: "pdf", taille: "112 Ko" },
        { id: "h12", titre: "Devis bridge 13-11", type: "Devis", date: "20/01/2021", format: "pdf", taille: "130 Ko" },
        { id: "h13", titre: "Photos intra-buccales", type: "Photo", date: "11/02/2025", format: "jpg", taille: "8,2 Mo" },
        { id: "h14", titre: "Feuille de soins", type: "Feuille de soins", date: "03/06/2022", format: "pdf", taille: "35 Ko" },
        { id: "h15", titre: "Notes patient (export texte)", type: "Compte rendu", date: "12/03/2026", format: "txt", taille: "12 Ko", extrait: "Patiente anxieuse. Préfère le matin. Allergie pénicilline signalée en 2019." },
      ],
    },
  },
  arfaoui: {
    oralys: {
      ...vide(),
      devis: [{ id: "d1", titre: "Devis-ARFAOUI-261005-2", date: "05/10/2026", statut: "a-signer" }],
      factures: [{ id: "f1", titre: "Facture-2024-0613", date: "13/06/2024" }],
    },
  },
};
