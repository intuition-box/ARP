/**
 * The site's legal pages, in French (task 74): legal notice, privacy, terms, contact.
 *
 * Every personal or host detail is a visible placeholder, `[… À COMPLÉTER]`. `vite.config.ts`
 * refuses a release build (`VITE_PUBLIC_RELEASE=1`) while one remains, so the site cannot go
 * online with them unfilled. The privacy page lists what the code contacts; when a page starts
 * calling a new host, it belongs here too.
 */

export const LEGAL_SLUGS = ["mentions-legales", "confidentialite", "conditions", "contact"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

/** A paragraph, or a list when it is an array. */
export type LegalBlock = string | readonly string[];
export type LegalSection = {heading: string; blocks: readonly LegalBlock[]};
export type LegalDoc = {title: string; english: string; sections: readonly LegalSection[]};

/** What a placeholder looks like, for the release check and for the page that marks them. */
export const PLACEHOLDER = /\[[^[\]"]*À COMPLÉTER\]/g;

const EDITOR = "[NOM ET PRÉNOM DE L'ÉDITEUR À COMPLÉTER]";
const EMAIL = "[ADRESSE E-MAIL DE CONTACT À COMPLÉTER]";
const REPO = "https://github.com/intuition-box/ARP";

export const LEGAL: Record<LegalSlug, LegalDoc> = {
    "mentions-legales": {
        title: "Mentions légales",
        english: "Legal notice, in French.",
        sections: [
            {
                heading: "Éditeur",
                blocks: [
                    "Ce site est édité par une personne physique, à titre non professionnel :",
                    [
                        EDITOR,
                        "[ADRESSE POSTALE DE L'ÉDITEUR À COMPLÉTER]",
                        "[NUMÉRO DE TÉLÉPHONE DE L'ÉDITEUR À COMPLÉTER]",
                        EMAIL,
                    ],
                ],
            },
            {
                heading: "Directeur de la publication",
                blocks: ["[NOM DU DIRECTEUR DE LA PUBLICATION À COMPLÉTER]"],
            },
            {
                heading: "Hébergeur",
                blocks: [
                    [
                        "[RAISON SOCIALE DE L'HÉBERGEUR À COMPLÉTER]",
                        "[ADRESSE DE L'HÉBERGEUR À COMPLÉTER]",
                        "[TÉLÉPHONE DE L'HÉBERGEUR À COMPLÉTER]",
                    ],
                ],
            },
            {
                heading: "Code source",
                blocks: [
                    `Le code de ce site et d'ARP est public, sous licence MIT : ${REPO}.`,
                    "Ce site est un test, sur un réseau de test : voir les conditions d'utilisation.",
                ],
            },
        ],
    },
    confidentialite: {
        title: "Confidentialité",
        english: "Privacy policy, in French.",
        sections: [
            {
                heading: "En bref",
                blocks: [
                    "ARP ne conserve aucune donnée sur vous. Ce site est un ensemble de fichiers statiques : il n'a ni compte, ni base de données, ni formulaire envoyé à ARP.",
                    "Pas de cookie, pas de mesure d'audience, pas de publicité, pas de traceur.",
                ],
            },
            {
                heading: "Responsable du traitement",
                blocks: [`${EDITOR}, joignable à ${EMAIL}.`],
            },
            {
                heading: "Ce que votre navigateur garde",
                blocks: [
                    "Le stockage local de votre navigateur (pas un cookie, et rien n'en sort vers ARP) garde quelques préférences : le parcours choisi dans « Get started », la barre d'activité ouverte ou fermée et, si vous connectez un portefeuille, l'état de la connexion et les délégations que vous signez. Vous pouvez l'effacer à tout moment depuis les réglages de votre navigateur.",
                    "Si vous connectez un portefeuille, son adresse est lue dans votre navigateur, pour afficher vos positions. Elle n'est envoyée à aucun serveur d'ARP.",
                ],
            },
            {
                heading: "Les services que votre navigateur contacte",
                blocks: [
                    "Pour afficher les pages, votre navigateur s'adresse directement à des services tiers, qui voient votre adresse IP et l'heure de la requête :",
                    [
                        "Intuition, pour lire le graphe et le réseau de test (testnet.intuition.sh, testnet.rpc.intuition.systems) ;",
                        "GitHub (api.github.com, raw.githubusercontent.com), pour lire le fichier d'un skill sur sa page ;",
                        "la passerelle IPFS ipfs.io, et les adresses d'image que les agents déclarent eux-mêmes, pour leurs images ;",
                        "les réseaux publics Base, BNB Chain et Ethereum, seulement si vous importez un agent qui y est inscrit ;",
                        "WalletConnect (Reown), seulement si vous choisissez de connecter un portefeuille mobile par ce moyen ;",
                        "[ADRESSE DU SERVICE DE CHIFFRES D'ARP À COMPLÉTER, OU RETIRER CETTE LIGNE SI VITE_ARP_API_URL N'EST PAS DÉFINI], pour le nombre d'installations et d'étoiles des skills.",
                    ],
                    "Les polices sont servies par ce site, pas par Google.",
                ],
            },
            {
                heading: "Ce que vous écrivez sur la chaîne",
                blocks: [
                    "Une transaction que vous signez est publique et permanente : elle est inscrite sur un réseau que ni ARP ni personne ne peut effacer. Ne signez rien que vous ne voulez pas voir publié.",
                ],
            },
            {
                heading: "Les journaux de l'hébergeur",
                blocks: [
                    "Le serveur qui envoie ces pages tient un journal technique des requêtes (adresse IP, date, page demandée, navigateur), pour la sécurité et le bon fonctionnement. Il est conservé [DURÉE DE CONSERVATION DES JOURNAUX À COMPLÉTER], puis effacé.",
                ],
            },
            {
                heading: "Vos droits",
                blocks: [
                    `Vous pouvez demander l'accès, la rectification ou l'effacement des données vous concernant, ou vous opposer à leur traitement, en écrivant à ${EMAIL}. Vous pouvez aussi saisir la CNIL (cnil.fr).`,
                ],
            },
        ],
    },
    conditions: {
        title: "Conditions d'utilisation",
        english: "Terms of use, in French.",
        sections: [
            {
                heading: "Un test",
                blocks: [
                    "Ce site est une version de test d'ARP. Il fonctionne uniquement sur le réseau de test d'Intuition (testnet, chaîne 13579). Le jeton de ce réseau, le tTRUST, n'a aucune valeur : il ne s'achète pas et ne se revend pas.",
                    "Ce que vous y lisez peut changer, disparaître ou être faux. Les données du réseau de test peuvent être effacées par ceux qui le font tourner.",
                ],
            },
            {
                heading: "Sans garantie",
                blocks: [
                    "Le site et le logiciel sont fournis tels quels, sans garantie d'aucune sorte, ni de disponibilité, ni d'exactitude, ni d'adéquation à un usage. Dans les limites permises par la loi, l'éditeur n'est pas responsable des dommages qui en résulteraient.",
                    "ARP n'héberge ni ne vérifie les skills, outils et agents qu'il liste : ils appartiennent à leurs auteurs. Ce que vous installez ou payez ailleurs relève de votre décision et des conditions de ces auteurs.",
                ],
            },
            {
                heading: "Ce que vous publiez",
                blocks: [
                    "Une ligne écrite sur la chaîne est publique, signée par vous et permanente. Vous en êtes responsable.",
                ],
            },
            {
                heading: "Licence",
                blocks: [`Le code d'ARP est un logiciel libre sous licence MIT : ${REPO}.`],
            },
            {
                heading: "Droit applicable",
                blocks: ["Ces conditions sont régies par le droit français."],
            },
        ],
    },
    contact: {
        title: "Contact",
        english: "Contact, in French.",
        sections: [
            {
                heading: "Écrire",
                blocks: [EMAIL],
            },
            {
                heading: "Un problème ou une question sur ARP",
                blocks: [`Ouvrez une issue sur ${REPO}/issues.`],
            },
        ],
    },
};

/** Every placeholder still in the legal pages. Empty means they can be published. */
export function remainingPlaceholders(): string[] {
    return JSON.stringify(LEGAL).match(PLACEHOLDER) ?? [];
}
