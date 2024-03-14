const axios = require('axios');
const expect = require('expect.js');

const {
  verifieNomFichierServi,
  verifieTypeFichierServiEstCSV,
} = require('../../aides/verifieFichierServi');
const { ErreurModele, EchecAutorisation } = require('../../../src/erreurs');

const testeurMSS = require('../testeurMSS');
const {
  unUtilisateur,
} = require('../../constructeurs/constructeurUtilisateur');
const { unService } = require('../../constructeurs/constructeurService');
const {
  uneAutorisation,
} = require('../../constructeurs/constructeurAutorisation');
const {
  Rubriques: { SECURISER },
  Permissions: { LECTURE },
  tousDroitsEnEcriture,
} = require('../../../src/modeles/autorisations/gestionDroits');

describe('Le serveur MSS des routes privées /api/*', () => {
  const testeur = testeurMSS();
  const service = unService()
    .avecId('456')
    .avecNomService('Un service')
    .ajouteUnContributeur(
      unUtilisateur().avecEmail('email.proprietaire@mail.fr').donnees
    )
    .construis();

  beforeEach(testeur.initialise);

  afterEach(testeur.arrete);

  it("vérifie que l'utilisateur est authentifié sur toutes les routes", (done) => {
    // On vérifie une seule route privée.
    // Par construction, les autres seront protégées aussi puisque la protection est ajoutée comme middleware
    // devant le routeur dédié aux routes privées.
    testeur
      .middleware()
      .verifieRequeteExigeJWT('http://localhost:1234/api/services', done);
  });

  describe('quand requête GET sur `/api/services`', () => {
    beforeEach(() => {
      testeur.middleware().reinitialise({ idUtilisateur: '123' });
      testeur.referentiel().recharge({
        statutsHomologation: {
          nonRealisee: { libelle: 'Non réalisée', ordre: 1 },
        },
      });
    });

    it("vérifie que l'utilisateur est authentifié", (done) => {
      testeur
        .middleware()
        .verifieRequeteExigeAcceptationCGU(
          'http://localhost:1234/api/services',
          done
        );
    });

    it("interroge le dépôt de données pour récupérer les services de l'utilisateur", (done) => {
      let donneesPassees = {};
      testeur.middleware().reinitialise({ idUtilisateur: '123' });
      testeur.referentiel().recharge({
        statutsHomologation: {
          nonRealisee: { libelle: 'Non réalisée', ordre: 1 },
        },
      });

      testeur.depotDonnees().autorisations = async () => [
        uneAutorisation()
          .deProprietaire('123', '456')
          .avecDroits({})
          .construis(),
      ];

      testeur.depotDonnees().homologations = (idUtilisateur) => {
        donneesPassees = { idUtilisateur };
        return Promise.resolve([service]);
      };

      axios
        .get('http://localhost:1234/api/services')
        .then((reponse) => {
          expect(reponse.status).to.equal(200);

          const { services } = reponse.data;
          expect(services.length).to.equal(1);
          expect(services[0].id).to.equal('456');
          expect(donneesPassees.idUtilisateur).to.equal('123');
          done();
        })
        .catch(done);
    });

    it("interroge le dépôt de données pour récupérer les autorisations de l'utilisateur", async () => {
      let donneesPassees = {};
      testeur.depotDonnees().autorisations = async (idUtilisateur) => {
        donneesPassees = { idUtilisateur };
        return [
          uneAutorisation()
            .deProprietaire('123', '456')
            .avecDroits({})
            .construis(),
        ];
      };

      await axios.get('http://localhost:1234/api/services');
      expect(donneesPassees.idUtilisateur).to.equal('123');
    });
  });

  describe('quand requête GET sur `/api/services/indices-cyber`', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      testeur
        .middleware()
        .verifieRequeteExigeAcceptationCGU(
          'http://localhost:1234/api/services/indices-cyber',
          done
        );
    });

    it("interroge le dépôt de données pour récupérer les autorisations de l'utilisateur", async () => {
      let donneesPassees = {};
      testeur.middleware().reinitialise({ idUtilisateur: '123' });

      testeur.depotDonnees().autorisations = async (idUtilisateur) => {
        donneesPassees = { idUtilisateur };
        return [
          uneAutorisation()
            .deProprietaire('123', '456')
            .avecDroits({})
            .construis(),
        ];
      };

      await axios.get('http://localhost:1234/api/services/indices-cyber');
      expect(donneesPassees.idUtilisateur).to.equal('123');
    });

    it("interroge le dépôt de données pour récupérer les services de l'utilisateur", (done) => {
      let donneesPassees = {};
      testeur.middleware().reinitialise({ idUtilisateur: '123' });

      testeur.depotDonnees().autorisations = async () => [
        uneAutorisation()
          .deProprietaire('123', '456')
          .avecDroits({})
          .construis(),
      ];

      testeur.depotDonnees().homologations = (idUtilisateur) => {
        donneesPassees = { idUtilisateur };
        return Promise.resolve([service]);
      };

      axios
        .get('http://localhost:1234/api/services/indices-cyber')
        .then((reponse) => {
          expect(reponse.status).to.equal(200);

          const { services } = reponse.data;
          expect(services.length).to.equal(1);
          expect(services[0].id).to.equal('456');
          expect(donneesPassees.idUtilisateur).to.equal('123');
          done();
        })
        .catch(done);
    });
  });

  describe('quand requête GET sur `/api/services/export.csv`', () => {
    beforeEach(() => {
      testeur.adaptateurCsv().genereCsvServices = () => Promise.resolve();
      testeur.referentiel().recharge({
        statutsHomologation: {
          nonRealisee: { libelle: 'Non réalisée', ordre: 1 },
        },
      });
      testeur.depotDonnees().autorisations = async () => [
        uneAutorisation()
          .deProprietaire('123', '456')
          .avecDroits({ [SECURISER]: LECTURE })
          .construis(),
      ];
    });

    it("vérifie que l'utilisateur est authentifié", (done) => {
      testeur
        .middleware()
        .verifieRequeteExigeAcceptationCGU(
          'http://localhost:1234/api/services/export.csv',
          done
        );
    });

    it('aseptise les identifiants des services à exporter', (done) => {
      testeur.middleware().verifieAseptisationParametres(
        ['idsServices.*'],
        {
          method: 'get',
          url: 'http://localhost:1234/api/services/export.csv',
        },
        done
      );
    });

    it("interroge le dépôt de données pour récupérer les autorisations de l'utilisateur", async () => {
      let donneesPassees = {};
      testeur.middleware().reinitialise({ idUtilisateur: '123' });

      testeur.depotDonnees().autorisations = async (idUtilisateur) => {
        donneesPassees = { idUtilisateur };
        return [
          uneAutorisation()
            .deProprietaire('123', '456')
            .avecDroits({})
            .construis(),
        ];
      };

      await axios.get('http://localhost:1234/api/services/export.csv');
      expect(donneesPassees).to.eql({ idUtilisateur: '123' });
    });

    it("interroge le dépôt de données pour récupérer les services de l'utilisateur", (done) => {
      let donneesPassees = {};
      testeur.middleware().reinitialise({ idUtilisateur: '123' });

      testeur.depotDonnees().homologations = (idUtilisateur) => {
        donneesPassees = { idUtilisateur };
        return Promise.resolve([service]);
      };

      axios
        .get('http://localhost:1234/api/services/export.csv')
        .then((reponse) => {
          expect(reponse.status).to.equal(200);
          expect(donneesPassees.idUtilisateur).to.equal('123');
          done();
        })
        .catch(done);
    });

    it('filtre les services en fonction de la requête', (done) => {
      testeur.depotDonnees().homologations = () =>
        Promise.resolve([
          service,
          unService()
            .avecId('789')
            .avecNomService('Un deuxième service')
            .ajouteUnContributeur(
              unUtilisateur().avecEmail('email.proprietaire@mail.fr').donnees
            )
            .construis(),
        ]);

      testeur.adaptateurCsv().genereCsvServices = (donneesServices) => {
        expect(donneesServices.length).to.be(1);
        expect(donneesServices[0].id).to.equal('456');
        done();
        return Promise.resolve('Fichier CSV');
      };

      axios
        .get('http://localhost:1234/api/services/export.csv?idsServices=456')
        .catch((e) => done(e.response?.data || e));
    });

    it('utilise un adaptateur de CSV pour la génération', (done) => {
      testeur.middleware().reinitialise({ idUtilisateur: '123' });

      testeur.depotDonnees().autorisations = async () => [
        uneAutorisation()
          .deProprietaire('123', '456')
          .avecDroits({})
          .construis(),
      ];

      testeur.depotDonnees().homologations = () =>
        Promise.resolve([
          unService()
            .avecId('456')
            .avecNomService('Un service')
            .avecOrganisationResponsable('ANSSI')
            .ajouteUnContributeur(
              unUtilisateur().avecId('123').avecEmail('email.createur@mail.fr')
                .donnees
            )
            .construis(),
        ]);

      let adaptateurCsvAppele = false;
      testeur.adaptateurCsv().genereCsvServices = (donnees) => {
        adaptateurCsvAppele = true;

        const serviceRecu = donnees[0];
        expect(serviceRecu.nomService).to.eql('Un service');
        expect(serviceRecu.organisationsResponsables).to.eql(['ANSSI']);
        expect(serviceRecu.nombreContributeurs).to.eql(1);
        expect(serviceRecu.estProprietaire).to.be(true);

        return Promise.resolve('Fichier CSV');
      };

      axios
        .get('http://localhost:1234/api/services/export.csv?idsServices=456')
        .then(() => {
          expect(adaptateurCsvAppele).to.be(true);
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });

    it('sert un fichier de type CSV', (done) => {
      verifieTypeFichierServiEstCSV(
        'http://localhost:1234/api/services/export.csv',
        done
      );
    });

    it('sert un fichier dont le nom contient la date du jour en format court', (done) => {
      testeur.adaptateurHorloge().maintenant = () => new Date(2023, 0, 28);

      verifieNomFichierServi(
        'http://localhost:1234/api/services/export.csv',
        'MSS_services_20230128.csv',
        done
      );
    });

    it("reste robuste en cas d'échec de génération de CSV", (done) => {
      testeur.adaptateurCsv().genereCsvServices = () => Promise.reject();

      axios
        .get('http://localhost:1234/api/services/export.csv')
        .then(() => done('La génération aurait dû lever une erreur'))
        .catch((e) => {
          expect(e.response.status).to.equal(424);
          done();
        })
        .catch(done);
    });
  });

  describe('quand requête PUT sur `/api/motDePasse`', () => {
    let utilisateur;

    beforeEach(() => {
      utilisateur = {
        id: '123',
        email: 'jean.dujardin@beta.gouv.fr',
        genereToken: () => 'un token',
      };

      const depotDonnees = testeur.depotDonnees();
      depotDonnees.utilisateur = async () => utilisateur;
      depotDonnees.metsAJourMotDePasse = async () => {};
      depotDonnees.supprimeIdResetMotDePassePourUtilisateur = async () => {};
      depotDonnees.valideAcceptationCGUPourUtilisateur = async () =>
        utilisateur;
    });

    it('aseptise les paramètres de la requête', (done) => {
      testeur.middleware().verifieAseptisationParametres(
        ['cguAcceptees', 'infolettreAcceptee'],
        {
          method: 'put',
          url: 'http://localhost:1234/api/motDePasse',
          data: { motDePasse: 'mdp', cguAcceptees: true },
        },
        done
      );
    });

    it('met à jour le mot de passe', async () => {
      let majMotDePasse;

      expect(utilisateur.id).to.equal('123');

      testeur.middleware().reinitialise({ idUtilisateur: utilisateur.id });
      testeur.depotDonnees().metsAJourMotDePasse = async (
        idUtilisateur,
        motDePasse
      ) => {
        majMotDePasse = { idUtilisateur, motDePasse };
      };

      const reponse = await axios.put('http://localhost:1234/api/motDePasse', {
        motDePasse: 'mdp_ABC12345',
      });

      expect(majMotDePasse).to.eql({
        idUtilisateur: '123',
        motDePasse: 'mdp_ABC12345',
      });
      expect(reponse.status).to.equal(200);
      expect(reponse.data).to.eql({ idUtilisateur: '123' });
    });

    it("retourne une erreur HTTP 422 si le mot de passe n'est pas assez robuste", (done) => {
      testeur.verifieRequeteGenereErreurHTTP(
        422,
        'Mot de passe trop simple',
        {
          method: 'put',
          url: 'http://localhost:1234/api/motDePasse',
          data: { motDePasse: '1234' },
        },
        done
      );
    });

    it('pose un nouveau cookie', (done) => {
      axios
        .put('http://localhost:1234/api/motDePasse', {
          motDePasse: 'mdp_ABC12345',
        })
        .then((reponse) => testeur.verifieJetonDepose(reponse, done))
        .catch((e) => done(e.response?.data || e));
    });

    it("inscrit l'utilisateur aux emails transactionnels Brevo", async () => {
      let inscriptionEffectuee;

      testeur.adaptateurMail().inscrisEmailsTransactionnels = async (
        emailUtilisateur
      ) => {
        inscriptionEffectuee = emailUtilisateur;
      };

      await axios.put('http://localhost:1234/api/motDePasse', {
        motDePasse: 'mdp_ABC12345',
      });

      expect(inscriptionEffectuee).to.equal('jean.dujardin@beta.gouv.fr');
    });

    it("ajoute l'utilisateur à la newsletter Brevo si l'utilisateur le souhaite et persiste ce choix", async () => {
      let inscriptionEffectuee;
      let utilisateurPersiste;

      testeur.adaptateurMail().inscrisInfolettre = async (emailUtilisateur) => {
        inscriptionEffectuee = emailUtilisateur;
      };

      testeur.depotDonnees().metsAJourUtilisateur = async (
        idUtilisateur,
        donnees
      ) => {
        utilisateurPersiste = { idUtilisateur, donnees };
      };

      await axios.put('http://localhost:1234/api/motDePasse', {
        motDePasse: 'mdp_ABC12345',
        infolettreAcceptee: 'true',
      });

      expect(inscriptionEffectuee).to.equal('jean.dujardin@beta.gouv.fr');
      expect(utilisateurPersiste).to.eql({
        idUtilisateur: '123',
        donnees: { infolettreAcceptee: true },
      });
    });

    it("invalide l'identifiant de réinitialisation de mot de passe", async () => {
      expect(utilisateur.id).to.equal('123');

      let utilisateurQuiEstReset;
      testeur.depotDonnees().supprimeIdResetMotDePassePourUtilisateur = async (
        u
      ) => {
        utilisateurQuiEstReset = u;
      };

      await axios.put('http://localhost:1234/api/motDePasse', {
        motDePasse: 'mdp_ABC12345',
      });

      expect(utilisateurQuiEstReset.id).to.be('123');
    });

    describe("si les CGU n'ont pas déjà été acceptées", () => {
      beforeEach(() => {
        const cguNonAcceptees = false;
        testeur.middleware().reinitialise({
          idUtilisateur: utilisateur.id,
          acceptationCGU: cguNonAcceptees,
        });
      });

      describe("et que l'utilisateur n'est pas en train de les accepter", () => {
        it('renvoie une erreur HTTP 422', (done) => {
          testeur.verifieRequeteGenereErreurHTTP(
            422,
            'CGU non acceptées',
            {
              method: 'put',
              url: 'http://localhost:1234/api/motDePasse',
              data: { motDePasse: 'mdp_12345' },
            },
            done
          );
        });

        it('ne met pas le mot de passe à jour', async () => {
          let motDePasseMisAJour = false;
          testeur.depotDonnees().metsAJourMotDePasse = async () => {
            motDePasseMisAJour = true;
          };

          try {
            await axios.put('http://localhost:1234/api/motDePasse', {
              motDePasse: 'mdp_12345',
            });
          } catch (e) {
            expect(e.response.status).to.be(422);
            expect(motDePasseMisAJour).to.be(false);
          }
        });
      });

      describe("et que l'utilisateur est en train de les accepter", () => {
        it("demande au dépôt d'enregistrer que les CGU sont acceptées", async () => {
          expect(utilisateur.id).to.equal('123');

          let utilisateurQuiAccepte;
          testeur.depotDonnees().valideAcceptationCGUPourUtilisateur = async (
            u
          ) => {
            utilisateurQuiAccepte = u;
            return u;
          };

          await axios.put('http://localhost:1234/api/motDePasse', {
            motDePasse: 'mdp_ABC12345',
            cguAcceptees: 'true',
          });

          expect(utilisateurQuiAccepte.id).to.be('123');
        });

        it('met à jour le mot de passe', async () => {
          let motDePasseMisAJour = false;
          testeur.depotDonnees().metsAJourMotDePasse = async () => {
            motDePasseMisAJour = true;
          };

          await axios.put('http://localhost:1234/api/motDePasse', {
            motDePasse: 'mdp_ABC12345',
            cguAcceptees: 'true',
          });

          expect(motDePasseMisAJour).to.be(true);
        });
      });
    });
  });

  describe('quand requête PATCH sur `/api/motDePasse', () => {
    let utilisateur;
    beforeEach(() => {
      utilisateur = { id: '123', genereToken: () => 'un token' };
      testeur.depotDonnees().metsAJourMotDePasse = async () => utilisateur;
    });

    it('utilise le middleware de challenge du mot de passe', (done) => {
      testeurMSS().middleware().verifieChallengeMotDePasse(
        {
          method: 'patch',
          url: 'http://localhost:1234/api/motDePasse',
        },
        done
      );
    });

    it('met à jour le mot de passe', async () => {
      let motDePasseMisAJour = false;
      testeur.middleware().reinitialise({ idUtilisateur: utilisateur.id });
      testeur.depotDonnees().metsAJourMotDePasse = async (
        idUtilisateur,
        motDePasse
      ) => {
        expect(idUtilisateur).to.equal('123');
        expect(motDePasse).to.equal('mdp_ABC12345');
        motDePasseMisAJour = true;
        return utilisateur;
      };

      const reponse = await axios.patch(
        'http://localhost:1234/api/motDePasse',
        { motDePasse: 'mdp_ABC12345' }
      );

      expect(motDePasseMisAJour).to.be(true);
      expect(reponse.status).to.equal(200);
      expect(reponse.data).to.eql({ idUtilisateur: '123' });
    });

    it("retourne une erreur HTTP 422 si le mot de passe n'est pas assez robuste", (done) => {
      testeur.verifieRequeteGenereErreurHTTP(
        422,
        'Mot de passe trop simple',
        {
          method: 'patch',
          url: 'http://localhost:1234/api/motDePasse',
          data: { motDePasse: '1234' },
        },
        done
      );
    });

    it('pose un nouveau cookie', (done) => {
      axios
        .patch('http://localhost:1234/api/motDePasse', {
          motDePasse: 'mdp_ABC12345',
        })
        .then((reponse) => testeur.verifieJetonDepose(reponse, done))
        .catch((e) => done(e.response?.data || e));
    });
  });

  describe('quand requête PUT sur `/api/utilisateur`', () => {
    let utilisateur;
    let donneesRequete;

    beforeEach(() => {
      utilisateur = unUtilisateur().avecId('123').construis();

      donneesRequete = {
        prenom: 'Jean',
        nom: 'Dupont',
        telephone: '0100000000',
        postes: ['RSSI', "Chargé des systèmes d'informations"],
        nomEntitePublique: 'Ville de Paris',
        departementEntitePublique: '75',
        infolettreAcceptee: 'true',
        transactionnelAccepte: 'true',
      };

      testeur.referentiel().departement = () => 'Paris';
      const depotDonnees = testeur.depotDonnees();
      depotDonnees.metsAJourUtilisateur = () => Promise.resolve(utilisateur);
      depotDonnees.utilisateur = () => Promise.resolve(utilisateur);
    });

    it('aseptise les paramètres de la requête', (done) => {
      testeur.middleware().verifieAseptisationParametres(
        [
          'prenom',
          'nom',
          'telephone',
          'cguAcceptees',
          'nomEntitePublique',
          'departementEntitePublique',
          'infolettreAcceptee',
          'transactionnelAccepte',
          'postes.*',
        ],
        {
          method: 'put',
          url: 'http://localhost:1234/api/utilisateur',
          data: donneesRequete,
        },
        done
      );
    });

    it("est en erreur 422  quand les propriétés de l'utilisateur ne sont pas valides", (done) => {
      donneesRequete.prenom = '';

      testeur.verifieRequeteGenereErreurHTTP(
        422,
        'La mise à jour de l\'utilisateur a échoué car les paramètres sont invalides. La propriété "prenom" est requise',
        {
          method: 'put',
          url: 'http://localhost:1234/api/utilisateur',
          data: donneesRequete,
        },
        done
      );
    });

    it("met à jour les autres informations de l'utilisateur", async () => {
      let idRecu;
      let donneesRecues;

      testeur.middleware().reinitialise({ idUtilisateur: utilisateur.id });
      testeur.depotDonnees().metsAJourUtilisateur = async (id, donnees) => {
        idRecu = id;
        donneesRecues = donnees;
        return utilisateur;
      };

      const reponse = await axios.put(
        'http://localhost:1234/api/utilisateur',
        donneesRequete
      );

      expect(reponse.status).to.equal(200);
      expect(reponse.data).to.eql({ idUtilisateur: '123' });
      expect(idRecu).to.equal('123');
      expect(donneesRecues.prenom).to.equal('Jean');
      expect(donneesRecues.nom).to.equal('Dupont');
      expect(donneesRecues.telephone).to.equal('0100000000');
      expect(donneesRecues.nomEntitePublique).to.equal('Ville de Paris');
      expect(donneesRecues.departementEntitePublique).to.equal('75');
      expect(donneesRecues.infolettreAcceptee).to.equal(true);
      expect(donneesRecues.transactionnelAccepte).to.equal(true);
      expect(donneesRecues.postes).to.eql([
        'RSSI',
        "Chargé des systèmes d'informations",
      ]);
    });

    it("met à jour les préférences de communication de l'utilisateur", async () => {
      let preferencesChangees;
      testeur.middleware().reinitialise({ idUtilisateur: utilisateur.id });

      testeur.depotDonnees().utilisateur = async () => {
        const u = unUtilisateur().construis();

        u.changePreferencesCommunication = async (nouvellesPreferences) => {
          preferencesChangees = nouvellesPreferences;
        };

        return u;
      };

      donneesRequete.infolettreAcceptee = 'true';
      donneesRequete.transactionnelAccepte = 'true';
      await axios.put('http://localhost:1234/api/utilisateur', donneesRequete);

      expect(preferencesChangees).to.eql({
        infolettreAcceptee: true,
        transactionnelAccepte: true,
      });
    });
  });

  describe('quand requête GET sur `/api/utilisateurCourant`', () => {
    it("renvoie des infos de l'utilisateur correspondant à l'identifiant", async () => {
      testeur.middleware().reinitialise({ idUtilisateur: '123' });
      let idUtilisateurRecu = null;
      const depotDonnees = testeur.depotDonnees();
      depotDonnees.utilisateur = async (idUtilisateur) => {
        idUtilisateurRecu = idUtilisateur;
        return unUtilisateur().quiSAppelle('Marie Jeanne').construis();
      };

      const response = await axios.get(
        'http://localhost:1234/api/utilisateurCourant'
      );

      expect(response.status).to.equal(200);
      expect(idUtilisateurRecu).to.equal('123');
      const { utilisateur } = response.data;
      expect(utilisateur.prenomNom).to.equal('Marie Jeanne');
      expect(utilisateur.profilEstComplet).to.be(true);
    });

    it("répond avec un code 401 quand il n'y a pas d'identifiant", (done) => {
      testeur.middleware().reinitialise({ idUtilisateur: '' });

      axios
        .get('http://localhost:1234/api/utilisateurCourant')
        .then(() => {
          done(new Error('La requête aurait du être en erreur'));
        })
        .catch((erreur) => {
          expect(erreur.response.status).to.equal(401);
          done();
        });
    });
  });

  describe('quand requête GET sur `/api/dureeSession`', () => {
    it('renvoie la durée de session', (done) => {
      axios
        .get('http://localhost:1234/api/dureeSession')
        .then((reponse) => {
          expect(reponse.status).to.equal(200);

          const { dureeSession } = reponse.data;
          expect(dureeSession).to.equal(3600000);
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });
  });

  describe('quand requête POST sur `/api/autorisation`', () => {
    beforeEach(() => {
      testeur.depotDonnees().utilisateur = async () =>
        unUtilisateur().construis();
      testeur.depotDonnees().homologation = async () => unService().construis();

      testeur.procedures().ajoutContributeurSurServices = async () => {};
    });

    it('aseptise les paramètres de la requête', (done) => {
      testeur.middleware().verifieAseptisationParametres(
        ['idServices.*', 'emailContributeur'],
        {
          method: 'post',
          url: 'http://localhost:1234/api/autorisation',
          data: { droits: tousDroitsEnEcriture() },
        },
        done
      );
    });

    it("vérifie que l'utilisateur est authentifié", (done) => {
      testeur.middleware().verifieRequeteExigeAcceptationCGU(
        {
          method: 'post',
          url: 'http://localhost:1234/api/autorisation',
          data: { droits: tousDroitsEnEcriture() },
        },
        done
      );
    });

    it("appelle la procédure d'ajout de contributeur avec les droits envoyés", async () => {
      let ajout;

      testeur.depotDonnees().homologation = async (id) =>
        unService().avecId(id).construis();
      testeur.depotDonnees().utilisateur = async () =>
        unUtilisateur().avecId('EMETTEUR').construis();

      testeur.procedures().ajoutContributeurSurServices = async (
        emailContributeur,
        services,
        droits,
        emetteur
      ) => {
        ajout = { emailContributeur, services, droits, emetteur };
      };

      const droitsEnvoyes = {
        DECRIRE: 2,
        SECURISER: 1,
        HOMOLOGUER: 2,
        RISQUES: 1,
        CONTACTS: 2,
      };

      await axios.post('http://localhost:1234/api/autorisation', {
        emailContributeur: 'jean.dupont@mail.fr',
        idServices: ['123'],
        droits: droitsEnvoyes,
      });

      expect(ajout.emailContributeur).to.be('jean.dupont@mail.fr');
      expect(ajout.services[0].id).to.be('123');
      expect(ajout.droits).to.eql(droitsEnvoyes);
      expect(ajout.emetteur.id).to.be('EMETTEUR');
    });

    it('cible tous les services demandés', async () => {
      let cibles;

      testeur.depotDonnees().homologation = async (id) =>
        unService().avecId(id).construis();

      testeur.procedures().ajoutContributeurSurServices = async (
        _,
        services,
        __
      ) => {
        cibles = services;
      };

      await axios.post('http://localhost:1234/api/autorisation', {
        emailContributeur: 'jean.dupont@mail.fr',
        idServices: ['123', '456'],
        droits: tousDroitsEnEcriture(),
      });

      expect(cibles.length).to.be(2);
      expect(cibles[0].id).to.be('123');
      expect(cibles[1].id).to.be('456');
    });

    it("met l'email du contributeur en minuscules pour éviter de créer des comptes en double", async () => {
      let ajout;

      testeur.procedures().ajoutContributeurSurServices = async (
        emailContributeur
      ) => {
        ajout = { emailContributeur };
      };

      await axios.post('http://localhost:1234/api/autorisation', {
        emailContributeur: 'JEAN.DUPONT@MAIL.FR',
        idServices: ['123'],
        droits: tousDroitsEnEcriture(),
      });

      const enMinucsules = 'jean.dupont@mail.fr';
      expect(ajout.emailContributeur).to.be(enMinucsules);
    });

    it("retourne une erreur HTTP 403 si l'utilisateur n'a pas le droit d'ajouter un contributeur", async () => {
      testeur.procedures().ajoutContributeurSurServices = async () => {
        throw new EchecAutorisation();
      };

      try {
        await axios.post('http://localhost:1234/api/autorisation', {
          emailContributeur: 'jean.dupont@mail.fr',
          idServices: ['123'],
          droits: tousDroitsEnEcriture(),
        });

        expect().to.fail('La requête aurait dû lever une erreur HTTP 403');
      } catch (e) {
        expect(e.response.status).to.equal(403);
        expect(e.response.data).to.equal(
          "Ajout non autorisé d'un contributeur"
        );
      }
    });

    it('retourne une erreur HTTP 422 si la procédure a levé une `ErreurModele`', (done) => {
      testeur.procedures().ajoutContributeurSurServices = async () => {
        throw new ErreurModele('oups');
      };

      testeur.verifieRequeteGenereErreurHTTP(
        422,
        'oups',
        {
          method: 'post',
          url: 'http://localhost:1234/api/autorisation',
          data: { droits: tousDroitsEnEcriture() },
        },
        done
      );
    });

    it('retourne une erreur HTTP 422 si les droits sont incohérents', (done) => {
      testeur.verifieRequeteGenereErreurHTTP(
        422,
        { erreur: { code: 'DROITS_INCOHERENTS' } },
        {
          method: 'post',
          url: 'http://localhost:1234/api/autorisation',
          data: { droits: { RUBRIQUE_INCONNUE: 2 } },
        },
        done
      );
    });
  });

  describe('quand requête DELETE sur `/api/autorisation`', () => {
    beforeEach(() => {
      testeur.middleware().reinitialise({ idUtilisateur: '456' });
      testeur.depotDonnees().autorisationPour = async () =>
        uneAutorisation().deProprietaire().construis();
      testeur.depotDonnees().supprimeContributeur = async () => {};
    });

    it('aseptise les paramètres de la requête', (done) => {
      testeur
        .middleware()
        .verifieAseptisationParametres(
          ['idHomologation', 'idContributeur'],
          { method: 'delete', url: 'http://localhost:1234/api/autorisation' },
          done
        );
    });

    it("vérifie que l'utilisateur est authentifié", (done) => {
      testeur.middleware().verifieRequeteExigeAcceptationCGU(
        {
          method: 'delete',
          url: 'http://localhost:1234/api/autorisation',
        },
        done
      );
    });

    it("vérifie que l'utilisateur a le droit de supprimer un contributeur", async () => {
      let autorisationCherchee = {};
      testeur.depotDonnees().autorisationPour = async (
        idUtilisateur,
        idHomologation
      ) => {
        autorisationCherchee = { idUtilisateur, idHomologation };
        return uneAutorisation().deProprietaire().construis();
      };

      await axios.delete('http://localhost:1234/api/autorisation', {
        params: { idHomologation: '123' },
      });

      expect(autorisationCherchee.idUtilisateur).to.be('456');
      expect(autorisationCherchee.idHomologation).to.be('123');
    });

    it("retourne une erreur HTTP 403 si l'utilisateur n'a pas le droit de supprimer un contributeur", async () => {
      const contributeurSimple = uneAutorisation().deContributeur().construis();
      testeur.depotDonnees().autorisationPour = async () => contributeurSimple;

      try {
        await axios.delete('http://localhost:1234/api/autorisation', {
          params: { idHomologation: '123' },
        });
        expect().fail('La requête aurait dû lever une erreur HTTP 403');
      } catch (e) {
        expect(e.response.status).to.equal(403);
        expect(e.response.data).to.equal(
          'Suppression non autorisé pour un contributeur'
        );
      }
    });

    it("utilise le dépôt de données pour supprimer l'autorisation du contributeur", async () => {
      let suppressionDemandee = {};
      testeur.depotDonnees().supprimeContributeur = async (
        idContributeur,
        idHomologation,
        idUtilisateurCourant
      ) => {
        suppressionDemandee = {
          idContributeur,
          idHomologation,
          idUtilisateurCourant,
        };
        return {};
      };

      await axios.delete('http://localhost:1234/api/autorisation', {
        params: {
          idHomologation: 'ABC',
          idContributeur: '999',
        },
      });

      expect(suppressionDemandee.idContributeur).to.be('999');
      expect(suppressionDemandee.idHomologation).to.be('ABC');
      expect(suppressionDemandee.idUtilisateurCourant).to.be('456');
    });

    it("retourne une erreur HTTP 424 si le dépôt ne peut pas supprimer l'autorisation", async () => {
      testeur.depotDonnees().supprimeContributeur = async () => {
        throw new Error("Un message d'erreur");
      };

      try {
        await axios.delete('http://localhost:1234/api/autorisation', {
          params: {
            idHomologation: '123',
            emailContributeur: 'jean.dupont@mail.fr',
          },
        });
        expect().fail('La requête aurait dû lever une erreur HTTP 424');
      } catch (e) {
        expect(e.response.status).to.equal(424);
        expect(e.response.data).to.equal("Un message d'erreur");
      }
    });
  });

  describe('quand requête GET sur `/api/nouvelleFonctionnalite/:id`', () => {
    it("aseptise l'identifiant de nouvelle fonctionnalité", (done) => {
      testeur.middleware().verifieAseptisationParametres(
        ['id'],
        {
          method: 'get',
          url: 'http://localhost:1234/api/nouvelleFonctionnalite/nouveaute',
        },
        done
      );
    });

    it("retourne une erreur HTTP 404 si la nouvelle fonctionnalité n'existe pas", (done) => {
      testeur.verifieRequeteGenereErreurHTTP(
        404,
        'Nouvelle fonctionnalité inconnue',
        {
          method: 'get',
          url: 'http://localhost:1234/api/nouvelleFonctionnalite/inconnue',
        },
        done
      );
    });

    it('retourne le contenu de la nouvelle fonctionnalité', (done) => {
      testeur.referentiel().recharge({
        nouvellesFonctionnalites: [
          { id: 'tdb', fichierPug: 'tableauDeBord.pug' },
        ],
      });
      axios
        .get('http://localhost:1234/api/nouvelleFonctionnalite/tdb')
        .then((reponse) => {
          expect(reponse.status).to.equal(200);
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });
  });

  describe('quand requête GET sur `/api/nouvelleFonctionnalite/derniere`', () => {
    it("retourne une erreur HTTP 404 si il n'y a pas de fonctionnalité", (done) => {
      testeur.verifieRequeteGenereErreurHTTP(
        404,
        'Aucune dernière fonctionnalité',
        {
          method: 'get',
          url: 'http://localhost:1234/api/nouvelleFonctionnalite/derniere',
        },
        done
      );
    });

    it("retourne l'ID de la dernière fonctionnalité", (done) => {
      testeur.referentiel().recharge({
        nouvellesFonctionnalites: [
          {
            id: 'tdb',
            fichierPug: 'tableauDeBord.pug',
            dateDeDeploiement: '2020-01-01',
          },
        ],
      });
      axios
        .get('http://localhost:1234/api/nouvelleFonctionnalite/derniere')
        .then((reponse) => {
          expect(reponse.status).to.equal(200);
          expect(reponse.data.id).to.equal('tdb');
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });
  });

  describe('quand requête GET sur `/api/annuaire/contributeurs`', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      testeur
        .middleware()
        .verifieRequeteExigeAcceptationCGU(
          'http://localhost:1234/api/annuaire/contributeurs',
          done
        );
    });

    it('aseptise la chaine de recherche', (done) => {
      testeur.middleware().verifieAseptisationParametres(
        ['recherche'],
        {
          method: 'get',
          url: 'http://localhost:1234/api/annuaire/contributeurs',
        },
        done
      );
    });

    it('retourne une erreur HTTP 400 si le terme de recherche est vide', (done) => {
      testeur.verifieRequeteGenereErreurHTTP(
        400,
        'Le terme de recherche ne peut pas être vide',
        {
          method: 'get',
          url: 'http://localhost:1234/api/annuaire/contributeurs',
        },
        done
      );
    });

    it("utilise le service d'annuaire pour suggérer des contributeurs", async () => {
      const appelDepot = {};
      testeur.middleware().reinitialise({ idUtilisateur: '123' });
      testeur.serviceAnnuaire().rechercheContributeurs = async (
        idUtilisateur,
        recherche
      ) => {
        appelDepot.idUtilisateur = idUtilisateur;
        appelDepot.recherche = recherche;

        return [
          unUtilisateur()
            .avecEmail('jean.dujardin@beta.gouv.fr')
            .quiSAppelle('Jean Dujardin')
            .construis(),
        ];
      };

      const reponse = await axios.get(
        'http://localhost:1234/api/annuaire/contributeurs?recherche=jean'
      );

      expect(appelDepot).to.eql({ idUtilisateur: '123', recherche: 'jean' });
      expect(reponse.status).to.be(200);
      expect(reponse.data.suggestions).to.eql([
        {
          prenomNom: 'Jean Dujardin',
          email: 'jean.dujardin@beta.gouv.fr',
          initiales: 'JD',
        },
      ]);
    });
  });
});
