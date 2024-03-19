const axios = require('axios');
const expect = require('expect.js');

const testeurMSS = require('../testeurMSS');
const Homologation = require('../../../src/modeles/homologation');
const {
  Permissions: { LECTURE },
  Rubriques: { DECRIRE, SECURISER, HOMOLOGUER, CONTACTS, RISQUES },
} = require('../../../src/modeles/autorisations/gestionDroits');
const {
  uneAutorisation,
} = require('../../constructeurs/constructeurAutorisation');
const { unService } = require('../../constructeurs/constructeurService');
const {
  verifieTypeFichierServiEstCSV,
  verifieNomFichierServi,
} = require('../../aides/verifieFichierServi');

describe('Le serveur MSS des routes /service/*', () => {
  const testeur = testeurMSS();

  beforeEach(testeur.initialise);

  afterEach(testeur.arrete);

  describe('quand requête GET sur `/service/creation `', () => {
    beforeEach(() => {
      testeur.middleware().reinitialise({ idUtilisateur: '123' });
      testeur
        .referentiel()
        .recharge({ actionsSaisie: { descriptionService: { position: 0 } } });
      testeur.depotDonnees().utilisateur = async (idUtilisateur) => ({
        id: idUtilisateur,
        entite: {
          nom: 'une entité',
        },
      });
    });

    it("Récupère dans le dépôt le nom de l'organisation de l'utilisateur", async () => {
      let idRecu;

      testeur.depotDonnees().utilisateur = async (idUtilisateur) => {
        idRecu = idUtilisateur;
        return { id: idUtilisateur, entite: { nom: 'une entité' } };
      };

      await axios('http://localhost:1234/service/creation');
      expect(idRecu).to.equal('123');
    });

    it("charge les préférences de l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesPreferences(
          'http://localhost:1234/service/creation',
          done
        );
    });
  });

  describe('quand requête GET sur `/service/:id`', () => {
    beforeEach(() => {
      testeur.middleware().reinitialise({
        autorisationACharger: uneAutorisation().construis(),
      });
      testeur.referentiel().recharge({
        statutsHomologation: {
          nonRealisee: { libelle: 'Non réalisée', ordre: 1 },
        },
        etapesParcoursHomologation: [{ numero: 1 }],
      });
    });

    it("aseptise l'identifiant reçu", (done) => {
      testeur
        .middleware()
        .verifieAseptisationParametres(
          ['id'],
          'http://localhost:1234/service/456',
          done
        );
    });

    it('recherche le service correspondant', (done) => {
      testeur
        .middleware()
        .verifieRechercheService([], 'http://localhost:1234/service/456', done);
    });

    it("utilise le middleware de chargement de l'autorisation", (done) => {
      testeur
        .middleware()
        .verifieChargementDesAutorisations(
          'http://localhost:1234/service/456',
          done
        );
    });

    describe('sur redirection vers une rubrique du service', () => {
      const casDeTests = [
        {
          droits: { [DECRIRE]: LECTURE },
          redirectionAttendue: '/descriptionService',
        },
        {
          droits: { [SECURISER]: LECTURE },
          redirectionAttendue: '/mesures',
        },
        {
          droits: { [HOMOLOGUER]: LECTURE },
          redirectionAttendue: '/dossiers',
        },
        {
          droits: { [RISQUES]: LECTURE },
          redirectionAttendue: '/risques',
        },
        {
          droits: { [CONTACTS]: LECTURE },
          redirectionAttendue: '/rolesResponsabilites',
        },
        {
          droits: {},
          redirectionAttendue: '/tableauDeBord',
        },
      ];

      casDeTests.forEach(({ droits, redirectionAttendue }) => {
        it(`redirige vers \`${redirectionAttendue}\` avec le droit de lecture sur \`${
          Object.keys(droits)[0] ?? 'aucune rubrique'
        }\``, async () => {
          const service = unService().construis();
          service.indiceCyber = () => ({ total: 2 });
          testeur.middleware().reinitialise({
            autorisationACharger: uneAutorisation()
              .avecDroits(droits)
              .construis(),
            homologationARenvoyer: service,
          });

          const reponse = await axios('http://localhost:1234/service/456');

          expect(reponse.request.res.responseUrl).to.contain(
            redirectionAttendue
          );
        });
      });
    });
  });

  describe('quand requête GET sur `/service/:id/descriptionService`', () => {
    it('recherche le service correspondant', (done) => {
      testeur
        .middleware()
        .verifieRechercheService(
          [{ niveau: LECTURE, rubrique: DECRIRE }],
          'http://localhost:1234/service/456/descriptionService',
          done
        );
    });

    it("charge les autorisations du service pour l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesAutorisations(
          'http://localhost:1234/service/456/descriptionService',
          done
        );
    });

    it("charge les préférences de l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesPreferences(
          'http://localhost:1234/service/456/descriptionService',
          done
        );
    });
  });

  describe('quand requête GET sur `/service/:id/mesures`', () => {
    beforeEach(() => {
      const service = unService().avecNomService('un service').construis();
      service.indiceCyber = () => ({ total: 2 });
      testeur.middleware().reinitialise({ homologationARenvoyer: service });
      testeur.referentiel().recharge({
        autorisationACharger: uneAutorisation().construis(),
      });
    });

    it('recherche le service correspondant', (done) => {
      testeur
        .middleware()
        .verifieRechercheService(
          [{ niveau: LECTURE, rubrique: SECURISER }],
          'http://localhost:1234/service/456/mesures',
          done
        );
    });

    it("charge les autorisations du service pour l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesAutorisations(
          'http://localhost:1234/service/456/mesures',
          done
        );
    });

    it("charge les préférences de l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesPreferences(
          'http://localhost:1234/service/456/mesures',
          done
        );
    });

    it('interroge le moteur de règles pour obtenir les mesures personnalisées', async () => {
      let descriptionRecue;
      const requete = {};

      testeur.middleware().trouveService(requete, undefined, () => {
        const { nomService } = requete.homologation.descriptionService;
        expect(nomService).to.equal('un service'); // sanity check
      });

      testeur.moteurRegles().mesures = (descriptionService) => {
        descriptionRecue = descriptionService;
        return {};
      };

      await axios('http://localhost:1234/service/456/mesures');

      expect(descriptionRecue.nomService).to.equal('un service');
    });
  });

  describe('quand requête GET sur `/service/:id/mesures/export.csv', () => {
    beforeEach(() => {
      testeur.adaptateurCsv().genereCsvMesures = async () => Buffer.from('');
    });

    it('recherche le service correspondant', (done) => {
      testeur.middleware().verifieRechercheService(
        [{ niveau: LECTURE, rubrique: SECURISER }],
        {
          method: 'GET',
          url: 'http://localhost:1234/service/456/mesures/export.csv',
        },
        done
      );
    });

    it('aseptise les paramètres de la requête', (done) => {
      testeur.middleware().verifieAseptisationParametres(
        ['id', 'avecDonneesAdditionnelles'],
        {
          method: 'GET',
          url: 'http://localhost:1234/service/456/mesures/export.csv',
        },
        done
      );
    });

    it('utilise un adaptateur CSV pour la génération', async () => {
      let mesuresExportees;
      testeur.adaptateurCsv().genereCsvMesures = async (mesures) => {
        mesuresExportees = mesures;
      };

      await axios.get('http://localhost:1234/service/456/mesures/export.csv');

      expect(mesuresExportees).to.eql({
        mesuresGenerales: [],
        mesuresSpecifiques: [],
      });
    });

    it('sert un fichier de type CSV', (done) => {
      verifieTypeFichierServiEstCSV(
        'http://localhost:1234/service/456/mesures/export.csv',
        done
      );
    });

    it('nomme le fichier CSV avec le nom du service et un horodatage', (done) => {
      testeur.middleware().reinitialise({
        homologationARenvoyer: unService().avecNomService('Mairie').construis(),
      });
      testeur.adaptateurHorloge().maintenant = () => new Date(2024, 0, 23);
      verifieNomFichierServi(
        'http://localhost:1234/service/456/mesures/export.csv',
        'Mairie Liste mesures sans données additionnelles 20240123.csv',
        done
      );
    });

    it('tronque le nom du service à 30 caractères', async () => {
      const tropLong = new Array(150).fill('A').join('');
      testeur.middleware().reinitialise({
        homologationARenvoyer: unService().avecNomService(tropLong).construis(),
      });
      testeur.adaptateurHorloge().maintenant = () => new Date(2024, 0, 23);

      const reponse = await axios(
        'http://localhost:1234/service/456/mesures/export.csv'
      );

      expect(reponse.headers['content-disposition']).to.contain(
        'filename="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA Liste'
      );
    });

    it('décode correctement les caractères spéciaux dans le nom du service', (done) => {
      testeur.middleware().reinitialise({
        homologationARenvoyer: unService()
          .avecNomService('Service d&#x27;apostrophe')
          .construis(),
      });
      testeur.adaptateurHorloge().maintenant = () => new Date(2024, 0, 23);

      verifieNomFichierServi(
        'http://localhost:1234/service/456/mesures/export.csv',
        "Service d'apostrophe Liste mesures sans données additionnelles 20240123.csv",
        done
      );
    });

    it("reste robuste en cas d'erreur de génération CSV", async () => {
      testeur.adaptateurCsv().genereCsvMesures = async () => {
        throw Error('BOOM');
      };

      let executionOK;
      try {
        await axios.get('http://localhost:1234/service/456/mesures/export.csv');
        executionOK = true;
      } catch (e) {
        expect(e.response.status).to.be(424);
      } finally {
        if (executionOK) expect().fail('Une exception aurait dû être levée');
      }
    });

    it("logue l'erreur survenue le cas échéant", async () => {
      let erreurLoguee;

      testeur.adaptateurCsv().genereCsvMesures = async () => {
        throw Error('BOOM');
      };
      testeur.adaptateurGestionErreur().logueErreur = (erreur) => {
        erreurLoguee = erreur;
      };

      try {
        await axios.get('http://localhost:1234/service/456/mesures/export.csv');
      } catch (e) {
        expect(erreurLoguee).to.be.an(Error);
      }
    });
  });

  describe('quand requête GET sur `/service/:id/indiceCyber`', () => {
    beforeEach(() => {
      const service = unService().construis();
      service.indiceCyber = () => ({ total: 2 });
      testeur.middleware().reinitialise({ homologationARenvoyer: service });
    });

    it('recherche le service correspondant', (done) => {
      testeur
        .middleware()
        .verifieRechercheService(
          [{ niveau: LECTURE, rubrique: SECURISER }],
          'http://localhost:1234/service/456/indiceCyber',
          done
        );
    });

    it("charge les autorisations du service pour l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesAutorisations(
          'http://localhost:1234/service/456/indiceCyber',
          done
        );
    });

    it("charge les préférences de l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesPreferences(
          'http://localhost:1234/service/456/indiceCyber',
          done
        );
    });
  });

  describe('quand requete GET sur `/service/:id/rolesResponsabilites`', () => {
    it('recherche le service correspondant', (done) => {
      testeur
        .middleware()
        .verifieRechercheService(
          [{ niveau: LECTURE, rubrique: CONTACTS }],
          'http://localhost:1234/service/456/rolesResponsabilites',
          done
        );
    });

    it("charge les autorisations du service pour l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesAutorisations(
          'http://localhost:1234/service/456/rolesResponsabilites',
          done
        );
    });

    it("charge les préférences de l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesPreferences(
          'http://localhost:1234/service/456/rolesResponsabilites',
          done
        );
    });
  });

  describe('quand requête GET sur `/service/:id/risques`', () => {
    it('recherche le service correspondant', (done) => {
      testeur
        .middleware()
        .verifieRechercheService(
          [{ niveau: LECTURE, rubrique: RISQUES }],
          'http://localhost:1234/service/456/risques',
          done
        );
    });

    it("charge les autorisations du service pour l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesAutorisations(
          'http://localhost:1234/service/456/risques',
          done
        );
    });

    it("charge les préférences de l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesPreferences(
          'http://localhost:1234/service/456/risques',
          done
        );
    });
  });

  describe('quand requête GET sur `/service/:id/dossiers`', () => {
    beforeEach(() => {
      testeur.referentiel().premiereEtapeParcours = () =>
        Promise.resolve({ id: 1 });
    });

    it('recherche le service correspondant', (done) => {
      testeur
        .middleware()
        .verifieRechercheService(
          [{ niveau: LECTURE, rubrique: HOMOLOGUER }],
          'http://localhost:1234/service/456/dossiers',
          done
        );
    });

    it("charge les autorisations du service pour l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesAutorisations(
          'http://localhost:1234/service/456/dossiers',
          done
        );
    });

    it("charge les préférences de l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesPreferences(
          'http://localhost:1234/service/456/dossiers',
          done
        );
    });
  });

  describe('quand requête GET sur `/service/:id/homologation/edition/etape/:idEtape`', () => {
    const homologationARenvoyer = new Homologation({
      id: '456',
      descriptionService: { nomService: 'un service' },
    });
    homologationARenvoyer.dossierCourant = () => ({
      etapeCourante: () => 'dateTelechargement',
      dateTelechargement: { date: new Date() },
    });

    beforeEach(() => {
      testeur.referentiel().recharge({
        etapesParcoursHomologation: [
          { numero: 1, id: 'dateTelechargement' },
          { numero: 2, id: 'deuxieme' },
        ],
      });
      testeur.depotDonnees().ajouteDossierCourantSiNecessaire = async () => {};
      testeur.depotDonnees().homologation = async () => homologationARenvoyer;
    });

    it('recherche le service correspondant', (done) => {
      testeur
        .middleware()
        .verifieRechercheService(
          [{ niveau: LECTURE, rubrique: HOMOLOGUER }],
          'http://localhost:1234/service/456/homologation/edition/etape/dateTelechargement',
          done
        );
    });

    it("charge les autorisations du service pour l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesAutorisations(
          'http://localhost:1234/service/456/homologation/edition/etape/dateTelechargement',
          done
        );
    });

    it("charge les préférences de l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesPreferences(
          'http://localhost:1234/service/456/homologation/edition/etape/dateTelechargement',
          done
        );
    });

    it("répond avec une erreur HTTP 404 si l'identifiant d'étape n'est pas connu du référentiel", (done) => {
      testeur.verifieRequeteGenereErreurHTTP(
        404,
        'Étape inconnue',
        {
          method: 'get',
          url: 'http://localhost:1234/service/456/homologation/edition/etape/inconnue',
        },
        done
      );
    });

    it('ajoute un dossier courant au service si nécessaire', async () => {
      let idRecu;
      testeur.depotDonnees().ajouteDossierCourantSiNecessaire = async (
        idService
      ) => {
        idRecu = idService;
      };

      await axios(
        'http://localhost:1234/service/456/homologation/edition/etape/dateTelechargement'
      );

      expect(idRecu).to.be('456');
    });

    it('recharge le service avant de servir la vue', async () => {
      let chargementsService = 0;
      testeur.depotDonnees().homologation = async () => {
        chargementsService += 1;
        return homologationARenvoyer;
      };

      await axios(
        'http://localhost:1234/service/456/homologation/edition/etape/dateTelechargement'
      );

      expect(chargementsService).to.equal(1);
    });

    it("redirige vers l'étape en cours si l'étape demandée est postérieure", async () => {
      const reponse = await axios(
        'http://localhost:1234/service/456/homologation/edition/etape/deuxieme'
      );

      expect(reponse.request.res.responseUrl).to.contain(
        'edition/etape/dateTelechargement'
      );
    });
  });
});
