const expect = require('expect.js');
const axios = require('axios');

const testeurMSS = require('../testeurMSS');
const {
  verifieNomFichierServi,
  verifieTypeFichierServiEstPDF,
  verifieTypeFichierServiEstZIP,
} = require('../../aides/verifieFichierServi');
const { unDossier } = require('../../constructeurs/constructeurDossier');
const Homologation = require('../../../src/modeles/homologation');
const Referentiel = require('../../../src/referentiel');
const {
  Permissions,
  Rubriques,
} = require('../../../src/modeles/autorisations/gestionDroits');
const {
  uneAutorisation,
} = require('../../constructeurs/constructeurAutorisation');
const AutorisationBase = require('../../../src/modeles/autorisations/autorisationBase');

const { LECTURE } = Permissions;
const { SECURISER, RISQUES, DECRIRE, HOMOLOGUER } = Rubriques;

describe('Le serveur MSS des routes /api/service/:id/pdf/*', () => {
  const testeur = testeurMSS();

  beforeEach(testeur.initialise);

  afterEach(testeur.arrete);

  describe('quand requête GET sur `/api/service/:id/pdf/annexes.pdf`', () => {
    it('recherche le service correspondant', (done) => {
      testeur.middleware().verifieRechercheService(
        [
          { niveau: LECTURE, rubrique: DECRIRE },
          { niveau: LECTURE, rubrique: SECURISER },
          { niveau: LECTURE, rubrique: RISQUES },
        ],
        'http://localhost:1234/api/service/456/pdf/annexes.pdf',
        done
      );
    });

    it('sert un fichier de type pdf', (done) => {
      verifieTypeFichierServiEstPDF(
        'http://localhost:1234/api/service/456/pdf/annexes.pdf',
        done
      );
    });

    it('utilise un adaptateur de pdf pour la génération', (done) => {
      let adaptateurPdfAppele = false;
      testeur.adaptateurPdf().genereAnnexes = () => {
        adaptateurPdfAppele = true;
        return Promise.resolve('Pdf annexes');
      };

      axios
        .get('http://localhost:1234/api/service/456/pdf/annexes.pdf')
        .then(() => {
          expect(adaptateurPdfAppele).to.be(true);
          done();
        })
        .catch(done);
    });
  });

  describe('quand requête GET sur `/api/service/:id/pdf/dossierDecision.pdf`', () => {
    const referentiel = Referentiel.creeReferentiel({
      echeancesRenouvellement: { unAn: { nbMoisDecalage: 12 } },
      statutsAvisDossierHomologation: { favorable: {} },
    });

    beforeEach(() => {
      const homologationARenvoyer = new Homologation(
        {
          id: '456',
          descriptionService: { nomService: 'un service' },
          dossiers: [
            unDossier(referentiel)
              .quiEstActif()
              .avecAutorite('Jean Dupond', 'RSSI')
              .avecAvis([
                {
                  collaborateurs: ['Jean Dupond'],
                  dureeValidite: 'unAn',
                  statut: 'favorable',
                },
              ])
              .avecDocuments(['unDocument']).donnees,
          ],
        },
        referentiel
      );
      homologationARenvoyer.mesures.indiceCyber = () => 3.5;
      testeur.middleware().reinitialise({ homologationARenvoyer });
    });

    it('recherche le service correspondant', (done) => {
      testeur
        .middleware()
        .verifieRechercheService(
          [{ niveau: LECTURE, rubrique: HOMOLOGUER }],
          'http://localhost:1234/api/service/456/pdf/dossierDecision.pdf',
          done
        );
    });

    it('recherche le dossier courant correspondant', (done) => {
      testeur
        .middleware()
        .verifieRechercheDossierCourant(
          'http://localhost:1234/api/service/456/pdf/dossierDecision.pdf',
          done
        );
    });

    it('sert un fichier de type pdf', (done) => {
      verifieTypeFichierServiEstPDF(
        'http://localhost:1234/api/service/456/pdf/dossierDecision.pdf',
        done
      );
    });

    it('utilise un adaptateur de pdf pour la génération', (done) => {
      let adaptateurPdfAppele = false;
      testeur.adaptateurPdf().genereDossierDecision = (donnees) => {
        adaptateurPdfAppele = true;
        expect(donnees.nomService).to.equal('un service');
        expect(donnees.nomPrenomAutorite).to.equal('Jean Dupond');
        expect(donnees.fonctionAutorite).to.equal('RSSI');
        expect(donnees.avis).to.eql([
          {
            collaborateurs: ['Jean Dupond'],
            dureeValidite: 'unAn',
            statut: 'favorable',
          },
        ]);
        expect(donnees.documents).to.eql(['unDocument']);
        return Promise.resolve('Pdf dossier décision');
      };

      axios
        .get('http://localhost:1234/api/service/456/pdf/dossierDecision.pdf')
        .then(() => {
          expect(adaptateurPdfAppele).to.be(true);
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });
  });

  describe('quand requête GET sur `/api/service/:id/pdf/syntheseSecurite.pdf`', () => {
    const referentiel = Referentiel.creeReferentiel({
      categoriesMesures: { uneCategorie: {} },
      localisationsDonnees: { uneLocalisation: { description: 'France' } },
      statutsDeploiement: {
        unStatutDeploiement: { description: 'Statut de déploiement' },
      },
      typesService: { unType: { description: 'Type de service' } },
      mesures: { uneMesure: { categorie: 'uneCategorie' } },
      reglesPersonnalisation: { mesuresBase: ['uneMesure'] },
    });
    const homologationARenvoyer = new Homologation({ id: '456' }, referentiel);

    beforeEach(() => {
      testeur.middleware().reinitialise({ homologationARenvoyer });
    });

    it('recherche le service correspondant', (done) => {
      testeur.middleware().verifieRechercheService(
        [
          { niveau: LECTURE, rubrique: SECURISER },
          { niveau: LECTURE, rubrique: DECRIRE },
        ],
        'http://localhost:1234/api/service/456/pdf/syntheseSecurite.pdf',
        done
      );
    });

    it('sert un fichier de type pdf', (done) => {
      verifieTypeFichierServiEstPDF(
        'http://localhost:1234/api/service/456/pdf/syntheseSecurite.pdf',
        done
      );
    });

    it('utilise un adaptateur de pdf pour la génération', (done) => {
      let adaptateurPdfAppele = false;
      testeur.adaptateurPdf().genereSyntheseSecurite = (donnees) => {
        adaptateurPdfAppele = true;
        expect(donnees.service).to.eql(homologationARenvoyer);
        expect(donnees.referentiel).to.eql(testeur.referentiel());
        return Promise.resolve('Pdf synthèse sécurité');
      };

      axios
        .get('http://localhost:1234/api/service/456/pdf/syntheseSecurite.pdf')
        .then(() => {
          expect(adaptateurPdfAppele).to.be(true);
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });
  });

  describe('quand requête GET sur `/api/service/:id/pdf/documentsHomologation.zip`', () => {
    const referentiel = Referentiel.creeReferentielVide();
    const homologationARenvoyer = new Homologation(
      {
        id: '456',
        descriptionService: { nomService: 'un service' },
        dossiers: [unDossier(referentiel).donnees],
      },
      referentiel
    );
    homologationARenvoyer.mesures.indiceCyber = () => 3.5;
    homologationARenvoyer.documentsPdfDisponibles = () => [
      'annexes',
      'syntheseSecurite',
      'dossierDecision',
    ];

    beforeEach(() => {
      testeur.middleware().reinitialise({ homologationARenvoyer });
    });

    it('recherche le service correspondant', (done) => {
      testeur
        .middleware()
        .verifieRechercheService(
          [],
          'http://localhost:1234/api/service/456/pdf/documentsHomologation.zip',
          done
        );
    });

    it('sert un fichier de type zip', (done) => {
      verifieTypeFichierServiEstZIP(
        'http://localhost:1234/api/service/456/pdf/documentsHomologation.zip',
        done
      );
    });

    it('sert un fichier dont le nom contient la date du jour en format court', (done) => {
      testeur.adaptateurHorloge().maintenant = () => new Date(2023, 0, 28);

      verifieNomFichierServi(
        'http://localhost:1234/api/service/456/pdf/documentsHomologation.zip',
        'MSS_decision_20230128.zip',
        done
      );
    });

    it("interroge le dépôt de données pour charger l'autorisation de l'utilisateur", async () => {
      let donneesPassees = {};
      testeur.middleware().reinitialise({ idUtilisateur: '123' });
      testeur.depotDonnees().autorisationPour = async (
        idUtilisateur,
        idService
      ) => {
        donneesPassees = { idUtilisateur, idService };
        return uneAutorisation()
          .avecDroits(AutorisationBase.DROITS_DOSSIER_DECISION_PDF)
          .construis();
      };

      await axios.get(
        'http://localhost:1234/api/service/456/pdf/documentsHomologation.zip'
      );
      expect(donneesPassees).to.eql({ idUtilisateur: '123', idService: '456' });
    });

    it("ajoute dans l'archive zip seulement les documents indiqués par le service", (done) => {
      const homologationSansDossier = new Homologation(
        {
          id: '456',
          descriptionService: { nomService: 'un service' },
          dossiers: [],
        },
        referentiel
      );
      homologationSansDossier.documentsPdfDisponibles = () => ['annexes'];

      testeur
        .middleware()
        .reinitialise({ homologationARenvoyer: homologationSansDossier });

      let adaptateurZipAppele = false;
      testeur.adaptateurPdf().genereAnnexes = () => Promise.resolve('PDF A');
      testeur.adaptateurPdf().genereSyntheseSecurite = () =>
        Promise.reject(new Error('Ce document ne devrait pas être généré'));
      testeur.adaptateurPdf().genereDossierDecision = () =>
        Promise.reject(new Error('Ce document ne devrait pas être généré'));
      testeur.adaptateurZip().genereArchive = (fichiers) => {
        expect(fichiers.length).to.be(1);
        expect(fichiers[0]).to.eql({ nom: 'Annexes.pdf', buffer: 'PDF A' });
        adaptateurZipAppele = true;
      };
      axios
        .get(
          'http://localhost:1234/api/service/456/pdf/documentsHomologation.zip'
        )
        .then(() => {
          expect(adaptateurZipAppele).to.be(true);
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });

    it("utilise un adaptateur d'horloge pour la génération du nom", (done) => {
      let adaptateurHorlogeAppele = false;
      testeur.adaptateurHorloge().maintenant = () => {
        adaptateurHorlogeAppele = true;
        return new Date();
      };

      axios
        .get(
          'http://localhost:1234/api/service/456/pdf/documentsHomologation.zip'
        )
        .then(() => {
          expect(adaptateurHorlogeAppele).to.be(true);
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });
  });
});
