const axios = require('axios');
const expect = require('expect.js');

const {
  verifieNomFichierServi,
  verifieTypeFichierServiEstCSV,
} = require('../aides/verifieFichierServi');
const { ErreurModele } = require('../../src/erreurs');

const testeurMSS = require('./testeurMSS');
const Service = require('../../src/modeles/service');

describe('Le serveur MSS des routes /api/*', () => {
  const testeur = testeurMSS();

  beforeEach(testeur.initialise);

  afterEach(testeur.arrete);

  describe('quand requête GET sur `/api/services`', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      testeur
        .middleware()
        .verifieRequeteExigeAcceptationCGU(
          'http://localhost:1234/api/services',
          done
        );
    });

    it("interroge le dépôt de données pour récupérer les services de l'utilisateur", (done) => {
      testeur.middleware().reinitialise({ idUtilisateur: '123' });
      testeur.referentiel().recharge({
        statutsHomologation: {
          nonRealisee: { libelle: 'Non réalisée', ordre: 1 },
        },
      });

      testeur.depotDonnees().homologations = (idUtilisateur) => {
        expect(idUtilisateur).to.equal('123');
        return Promise.resolve([
          new Service({
            id: '456',
            descriptionService: {
              nomService: 'Un service',
              organisationsResponsables: [],
            },
            createur: { email: 'email.createur@mail.fr' },
          }),
        ]);
      };

      axios
        .get('http://localhost:1234/api/services')
        .then((reponse) => {
          expect(reponse.status).to.equal(200);

          const { services } = reponse.data;
          expect(services.length).to.equal(1);
          expect(services[0].id).to.equal('456');
          done();
        })
        .catch(done);
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

    it("interroge le dépôt de données pour récupérer les services de l'utilisateur", (done) => {
      testeur.middleware().reinitialise({ idUtilisateur: '123' });

      testeur.depotDonnees().homologations = (idUtilisateur) => {
        expect(idUtilisateur).to.equal('123');
        return Promise.resolve([
          new Service({
            id: '456',
            descriptionService: {
              nomService: 'Un service',
              organisationsResponsables: [],
            },
            createur: { email: 'email.createur@mail.fr' },
          }),
        ]);
      };

      axios
        .get('http://localhost:1234/api/services/indices-cyber')
        .then((reponse) => {
          expect(reponse.status).to.equal(200);

          const { services } = reponse.data;
          expect(services.length).to.equal(1);
          expect(services[0].id).to.equal('456');
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

    it("interroge le dépôt de données pour récupérer les services de l'utilisateur", (done) => {
      let depotAppele = false;
      testeur.middleware().reinitialise({ idUtilisateur: '123' });

      testeur.depotDonnees().homologations = (idUtilisateur) => {
        expect(idUtilisateur).to.equal('123');
        depotAppele = true;
        return Promise.resolve([
          new Service({
            id: '456',
            descriptionService: {
              nomService: 'Un service',
              organisationsResponsables: [],
            },
            createur: { email: 'email.createur@mail.fr' },
          }),
        ]);
      };

      axios
        .get('http://localhost:1234/api/services/export.csv')
        .then((reponse) => {
          expect(reponse.status).to.equal(200);
          expect(depotAppele).to.be(true);
          done();
        })
        .catch(done);
    });

    it('filtre les services en fonction de la requête', (done) => {
      testeur.depotDonnees().homologations = () =>
        Promise.resolve([
          new Service({
            id: '456',
            descriptionService: {
              nomService: 'Un service',
              organisationsResponsables: [],
            },
            createur: { email: 'email.createur@mail.fr' },
          }),
          new Service({
            id: '789',
            descriptionService: {
              nomService: 'Un deuxième service',
              organisationsResponsables: [],
            },
            createur: { email: 'email.createur@mail.fr' },
          }),
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

      testeur.depotDonnees().homologations = () =>
        Promise.resolve([
          new Service({
            id: '456',
            descriptionService: {
              nomService: 'Un service',
              organisationsResponsables: ['ANSSI'],
            },
            createur: { id: '123', email: 'email.createur@mail.fr' },
          }),
        ]);

      let adaptateurCsvAppele = false;
      testeur.adaptateurCsv().genereCsvServices = (donnees) => {
        adaptateurCsvAppele = true;

        const service = donnees[0];
        expect(service.nomService).to.eql('Un service');
        expect(service.organisationsResponsables).to.eql(['ANSSI']);
        expect(service.nombreContributeurs).to.eql(1);
        expect(service.estCreateur).to.be(true);
        expect(service.indiceCyber).not.to.be(undefined);
        expect(service.statutHomologation.libelle).to.be('Non réalisée');

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

  describe('quand requête GET sur `/api/seuilCriticite`', () => {
    it('vérifie que les CGU sont acceptées', (done) => {
      testeur
        .middleware()
        .verifieRequeteExigeAcceptationCGU(
          'http://localhost:1234/api/seuilCriticite',
          done
        );
    });

    it('détermine le seuil de criticité pour le service', (done) => {
      testeur.referentiel().criticite = (
        idsFonctionnalites,
        idsDonnees,
        idDelai
      ) => {
        expect(idsFonctionnalites).to.eql(['f1', 'f2']);
        expect(idsDonnees).to.eql(['d1', 'd2']);
        expect(idDelai).to.equal('unDelai');
        return 'moyen';
      };

      axios('http://localhost:1234/api/seuilCriticite', {
        params: {
          fonctionnalites: ['f1', 'f2'],
          donneesCaracterePersonnel: ['d1', 'd2'],
          delaiAvantImpactCritique: 'unDelai',
        },
      })
        .then((reponse) =>
          expect(reponse.data).to.eql({ seuilCriticite: 'moyen' })
        )
        .then(() => done())
        .catch(done);
    });

    it('retourne une erreur HTTP 422 si les données sont invalides', (done) => {
      testeur.verifieRequeteGenereErreurHTTP(
        422,
        'Données invalides',
        {
          method: 'get',
          url: 'http://localhost:1234/api/seuilCriticite',
          params: { delaiAvantImpactCritique: 'delaiInvalide' },
        },
        done
      );
    });
  });

  describe('quand requête PUT sur `/api/motDePasse`', () => {
    let utilisateur;

    beforeEach(() => {
      utilisateur = { id: '123', genereToken: () => 'un token' };

      const depotDonnees = testeur.depotDonnees();
      depotDonnees.metsAJourMotDePasse = () => Promise.resolve(utilisateur);
      depotDonnees.supprimeIdResetMotDePassePourUtilisateur = () =>
        Promise.resolve(utilisateur);
      depotDonnees.valideAcceptationCGUPourUtilisateur = () =>
        Promise.resolve(utilisateur);
    });

    it("vérifie que l'utilisateur est authentifié", (done) => {
      testeur
        .middleware()
        .verifieRequeteExigeJWT(
          { method: 'put', url: 'http://localhost:1234/api/motDePasse' },
          done
        );
    });

    it('aseptise les paramètres de la requête', (done) => {
      testeur.middleware().verifieAseptisationParametres(
        ['cguAcceptees'],
        {
          method: 'put',
          url: 'http://localhost:1234/api/motDePasse',
          data: { motDePasse: 'mdp', cguAcceptees: true },
        },
        done
      );
    });

    it('met à jour le mot de passe', (done) => {
      let motDePasseMisAJour = false;

      expect(utilisateur.id).to.equal('123');
      testeur.middleware().reinitialise({ idUtilisateur: utilisateur.id });
      testeur.depotDonnees().metsAJourMotDePasse = (
        idUtilisateur,
        motDePasse
      ) => {
        try {
          expect(idUtilisateur).to.equal('123');
          expect(motDePasse).to.equal('mdp_ABC12345');
          motDePasseMisAJour = true;
          return Promise.resolve(utilisateur);
        } catch (e) {
          return Promise.reject(e);
        }
      };

      axios
        .put('http://localhost:1234/api/motDePasse', {
          motDePasse: 'mdp_ABC12345',
        })
        .then((reponse) => {
          expect(motDePasseMisAJour).to.be(true);
          expect(reponse.status).to.equal(200);
          expect(reponse.data).to.eql({ idUtilisateur: '123' });
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });

    it("ne fait rien si aucun nouveau mot de passe n'est renseigné (possible tant que le changement de MDP se fait sur la page profil utilisateur)", (done) => {
      let motDePasseMisAJour = false;

      testeur.depotDonnees().metsAJourMotDePasse = () => {
        motDePasseMisAJour = true;
        return Promise.resolve();
      };

      axios
        .put('http://localhost:1234/api/motDePasse', { motDePasse: undefined })
        .then((reponse) => expect(reponse.status).to.equal(204))
        .then(() => expect(motDePasseMisAJour).to.be(false))
        .then(() => done())
        .catch((e) => done(e.response?.data || e));
    });

    it('retourne une erreur HTTP 422 si le mot de passe est invalide', (done) => {
      testeur.verifieRequeteGenereErreurHTTP(
        422,
        'Mot de passe invalide',
        {
          method: 'put',
          url: 'http://localhost:1234/api/motDePasse',
          data: { motDePasse: '' },
        },
        done
      );
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

    it("invalide l'identifiant de réinitialisation de mot de passe", (done) => {
      let idResetSupprime = false;

      expect(utilisateur.id).to.equal('123');
      testeur.depotDonnees().supprimeIdResetMotDePassePourUtilisateur = (u) => {
        try {
          expect(u.id).to.equal('123');
          idResetSupprime = true;
          return Promise.resolve(u);
        } catch (e) {
          return Promise.reject(e);
        }
      };

      axios
        .put('http://localhost:1234/api/motDePasse', {
          motDePasse: 'mdp_ABC12345',
        })
        .then(() => expect(idResetSupprime).to.be(true))
        .then(() => done())
        .catch((e) => done(e.response?.data || e));
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

        it('ne met pas le mot de passe à jour', (done) => {
          let motDePasseMisAJour = false;
          testeur.depotDonnees().metsAJourMotDePasse = () => {
            motDePasseMisAJour = true;
            return Promise.resolve(utilisateur);
          };

          axios
            .put('http://localhost:1234/api/motDePasse', {
              motDePasse: 'mdp_12345',
            })
            .then(() => expect(motDePasseMisAJour).to.be(false))
            .then(() =>
              done(
                'La tentative de mise à jour aurait dû retourner une erreur HTTP'
              )
            )
            .catch(() => {
              expect(motDePasseMisAJour).to.be(false);
              done();
            })
            .catch((e) => done(e.response?.data || e));
        });
      });

      describe("et que l'utilisateur est en train de les accepter", () => {
        it("demande au dépôt d'enregistrer que les CGU sont acceptées", (done) => {
          let acceptationCGUEnregistree = false;

          expect(utilisateur.id).to.equal('123');
          testeur.depotDonnees().valideAcceptationCGUPourUtilisateur = (u) => {
            try {
              expect(u.id).to.equal('123');
              acceptationCGUEnregistree = true;
              return Promise.resolve(u);
            } catch (e) {
              return Promise.reject(e);
            }
          };

          axios
            .put('http://localhost:1234/api/motDePasse', {
              motDePasse: 'mdp_ABC12345',
              cguAcceptees: 'true',
            })
            .then(() => expect(acceptationCGUEnregistree).to.be(true))
            .then(() => done())
            .catch((e) => done(e.response?.data || e));
        });

        it('met à jour le mot de passe', (done) => {
          let motDePasseMisAJour = false;
          testeur.depotDonnees().metsAJourMotDePasse = () => {
            motDePasseMisAJour = true;
            return Promise.resolve(utilisateur);
          };

          axios
            .put('http://localhost:1234/api/motDePasse', {
              motDePasse: 'mdp_ABC12345',
              cguAcceptees: 'true',
            })
            .then(() => expect(motDePasseMisAJour).to.be(true))
            .then(() => done())
            .catch((e) => done(e.response?.data || e));
        });
      });
    });
  });

  describe('quand requête PUT sur `/api/utilisateur`', () => {
    let utilisateur;
    let donneesRequete;

    beforeEach(() => {
      utilisateur = { id: '123' };

      donneesRequete = {
        prenom: 'Jean',
        nom: 'Dupont',
        telephone: '0100000000',
        postes: ['RSSI', "Chargé des systèmes d'informations"],
        nomEntitePublique: 'Ville de Paris',
        departementEntitePublique: '75',
        infolettreAcceptee: 'true',
      };

      testeur.referentiel().departement = () => 'Paris';
      const depotDonnees = testeur.depotDonnees();
      depotDonnees.metsAJourUtilisateur = () => Promise.resolve(utilisateur);
      depotDonnees.utilisateur = () => Promise.resolve(utilisateur);
    });

    it("vérifie que l'utilisateur est authentifié", (done) => {
      testeur.middleware().verifieRequeteExigeJWT(
        {
          method: 'put',
          url: 'http://localhost:1234/api/utilisateur',
          data: donneesRequete,
        },
        done
      );
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

    it("convertit l'infolettre acceptée en valeur booléenne", (done) => {
      testeur.middleware().reinitialise({ idUtilisateur: utilisateur.id });

      testeur.depotDonnees().metsAJourUtilisateur = (
        id,
        { infolettreAcceptee }
      ) => {
        try {
          expect(id).to.equal('123');
          expect(infolettreAcceptee).to.equal(false);
          return Promise.resolve(utilisateur);
        } catch (e) {
          return Promise.reject(e);
        }
      };

      donneesRequete.infolettreAcceptee = 'false';

      axios
        .put('http://localhost:1234/api/utilisateur', donneesRequete)
        .then((reponse) => {
          expect(reponse.status).to.equal(200);
          expect(reponse.data).to.eql({ idUtilisateur: '123' });
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });

    it("met à jour les autres informations de l'utilisateur", (done) => {
      let infosMisesAJour = false;

      testeur.middleware().reinitialise({ idUtilisateur: utilisateur.id });

      testeur.depotDonnees().metsAJourUtilisateur = (id, donnees) => {
        try {
          expect(id).to.equal('123');
          expect(donnees.prenom).to.equal('Jean');
          expect(donnees.nom).to.equal('Dupont');
          expect(donnees.telephone).to.equal('0100000000');
          expect(donnees.nomEntitePublique).to.equal('Ville de Paris');
          expect(donnees.departementEntitePublique).to.equal('75');
          expect(donnees.postes).to.eql([
            'RSSI',
            "Chargé des systèmes d'informations",
          ]);
          infosMisesAJour = true;
          return Promise.resolve(utilisateur);
        } catch (e) {
          return Promise.reject(e);
        }
      };

      axios
        .put('http://localhost:1234/api/utilisateur', donneesRequete)
        .then((reponse) => {
          expect(infosMisesAJour).to.be(true);
          expect(reponse.status).to.equal(200);
          expect(reponse.data).to.eql({ idUtilisateur: '123' });
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });

    describe("sur demande de recherche de l'utilisateur", () => {
      it("demande au dépôt de retrouver l'utilisateur", (done) => {
        let depotAppele = false;
        testeur.middleware().reinitialise({ idUtilisateur: utilisateur.id });

        testeur.depotDonnees().utilisateur = (idUtilisateur) => {
          expect(idUtilisateur).to.eql(123);
          depotAppele = true;
          return Promise.resolve(utilisateur);
        };

        axios
          .put('http://localhost:1234/api/utilisateur', donneesRequete)
          .then(() => {
            expect(depotAppele).to.be(true);
            done();
          })
          .catch(done);
      });

      it("inscrit l'utilisateur à l'infolettre si il l'a demandé", (done) => {
        let inscriptionAppelee = false;
        donneesRequete.infolettreAcceptee = 'true';
        utilisateur.email = 'jean.dupont@mail.fr';
        testeur.depotDonnees().utilisateur = () =>
          Promise.resolve({ ...utilisateur, infolettreAcceptee: false });

        testeur.adaptateurMail().inscrisInfolettre = (destinataire) => {
          inscriptionAppelee = true;
          expect(destinataire).to.equal('jean.dupont@mail.fr');
          return Promise.resolve();
        };

        axios
          .put('http://localhost:1234/api/utilisateur', donneesRequete)
          .then(() => {
            expect(inscriptionAppelee).to.be(true);
            done();
          })
          .catch(done);
      });

      it("désinscrit l'utilisateur à l'infolettre si il l'a demandé", (done) => {
        let desinscriptionAppelee = false;
        donneesRequete.infolettreAcceptee = 'false';
        utilisateur.email = 'jean.dupont@mail.fr';
        testeur.depotDonnees().utilisateur = () =>
          Promise.resolve({ ...utilisateur, infolettreAcceptee: true });

        testeur.adaptateurMail().desinscrisInfolettre = (destinataire) => {
          desinscriptionAppelee = true;
          expect(destinataire).to.equal('jean.dupont@mail.fr');
          return Promise.resolve();
        };

        axios
          .put('http://localhost:1234/api/utilisateur', donneesRequete)
          .then(() => {
            expect(desinscriptionAppelee).to.be(true);
            done();
          })
          .catch(done);
      });
    });
  });

  describe('quand requête GET sur `/api/utilisateurCourant`', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      testeur.middleware().verifieRequeteExigeJWT(
        {
          method: 'get',
          url: 'http://localhost:1234/api/utilisateurCourant',
        },
        done
      );
    });

    it("renvoie l'utilisateur correspondant à l'identifiant", (done) => {
      testeur.middleware().reinitialise({ idUtilisateur: '123' });

      const depotDonnees = testeur.depotDonnees();
      depotDonnees.utilisateur = (idUtilisateur) => {
        try {
          expect(idUtilisateur).to.equal('123');
          return Promise.resolve({ toJSON: () => ({ id: '123' }) });
        } catch (erreur) {
          return Promise.reject(erreur);
        }
      };

      axios
        .get('http://localhost:1234/api/utilisateurCourant')
        .then((reponse) => {
          expect(reponse.status).to.equal(200);

          const { utilisateur } = reponse.data;
          expect(utilisateur.id).to.equal('123');
          done();
        })
        .catch((e) => done(e.response?.data || e));
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

  describe('quand requête POST sur `/api/autorisation`', () => {
    const autorisation = { id: '111' };
    const utilisateur = {
      id: '999',
      genereToken: () => 'un token',
      accepteCGU: () => true,
    };

    beforeEach(() => {
      testeur.middleware().reinitialise({ idUtilisateur: '456' });
      autorisation.permissionAjoutContributeur = true;

      testeur.depotDonnees().autorisationExiste = () => Promise.resolve(false);
      testeur.depotDonnees().autorisationPour = () =>
        Promise.resolve(autorisation);
      testeur.depotDonnees().utilisateurAvecEmail = () =>
        Promise.resolve(utilisateur);
      testeur.depotDonnees().ajouteContributeurAHomologation = () =>
        Promise.resolve();

      const utilisateurCourant = { prenomNom: () => '' };
      testeur.depotDonnees().utilisateur = () =>
        Promise.resolve(utilisateurCourant);

      const homologation = { nomService: () => '' };
      testeur.depotDonnees().homologation = () => Promise.resolve(homologation);

      testeur.adaptateurMail().envoieMessageInvitationContribution = () =>
        Promise.resolve();
    });

    it('aseptise les paramètres de la requête', (done) => {
      testeur
        .middleware()
        .verifieAseptisationParametres(
          ['idHomologation', 'emailContributeur'],
          { method: 'post', url: 'http://localhost:1234/api/autorisation' },
          done
        );
    });

    it("vérifie que l'utilisateur est authentifié", (done) => {
      testeur.middleware().verifieRequeteExigeAcceptationCGU(
        {
          method: 'post',
          url: 'http://localhost:1234/api/autorisation',
        },
        done
      );
    });

    it("vérifie que l'utilisateur a le droit d'ajouter un contributeur", (done) => {
      let autorisationInterrogee = false;
      testeur.depotDonnees().autorisationPour = (
        idUtilisateur,
        idHomologation
      ) => {
        try {
          expect(testeur.middleware().idUtilisateurCourant()).to.equal('456');

          expect(idUtilisateur).to.equal('456');
          expect(idHomologation).to.equal('123');
          autorisationInterrogee = true;
          return Promise.resolve(autorisation);
        } catch (e) {
          return Promise.reject(e);
        }
      };

      axios
        .post('http://localhost:1234/api/autorisation', {
          emailContributeur: 'jean.dupont@mail.fr',
          idHomologation: '123',
        })
        .then(() => {
          expect(autorisationInterrogee).to.be(true);
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });

    it("retourne une erreur HTTP 403 si l'utilisateur n'a pas le droit d'ajouter un contributeur", (done) => {
      autorisation.permissionAjoutContributeur = false;
      testeur.depotDonnees().autorisationPour = () =>
        Promise.resolve(autorisation);

      axios
        .post('http://localhost:1234/api/autorisation', {
          emailContributeur: 'jean.dupont@mail.fr',
          idHomologation: '123',
        })
        .then(() => {
          done('La requête aurait dû lever une erreur HTTP 403');
        })
        .catch((e) => {
          expect(e.response.status).to.equal(403);
          expect(e.response.data).to.equal(
            "Ajout non autorisé d'un contributeur"
          );
          done();
        })
        .catch(done);
    });

    describe('si le contributeur existe déjà', () => {
      beforeEach(() => {
        const contributeur = { email: 'jean.dupont@mail.fr' };
        testeur.depotDonnees().utilisateurAvecEmail = () =>
          Promise.resolve(contributeur);

        const utilisateurCourant = { prenomNom: () => 'Utilisateur Courant' };
        testeur.depotDonnees().utilisateur = () =>
          Promise.resolve(utilisateurCourant);

        const homologation = { id: '123', nomService: () => 'Nom Service' };
        testeur.depotDonnees().homologation = () =>
          Promise.resolve(homologation);
      });

      describe('avec un email en majuscules', () => {
        it('retrouve le compte et le ne recrée donc pas', (done) => {
          testeur.depotDonnees().utilisateurAvecEmail = (emailRecherche) => {
            const enMinuscules = 'jean.dupont@mail.fr';
            expect(emailRecherche).to.be(enMinuscules);
            done();
            return Promise.resolve({ email: enMinuscules });
          };

          testeur.depotDonnees().nouvelUtilisateur = () => {
            done("L'utilisateur ne devrait pas être re-créé");
          };

          axios
            .post('http://localhost:1234/api/autorisation', {
              emailContributeur: 'Jean.DUPONT@mail.fr',
              idHomologation: '123',
            })
            .catch((e) => done(e.response?.data || e));
        });
      });

      describe("si le contributeur n'a pas déjà été invité", () => {
        it('envoie un email de notification au contributeur', (done) => {
          let emailEnvoye = false;

          testeur.adaptateurMail().envoieMessageInvitationContribution = (
            destinataire,
            prenomNomEmetteur,
            nomService,
            idHomologation
          ) => {
            try {
              expect(destinataire).to.equal('jean.dupont@mail.fr');
              expect(prenomNomEmetteur).to.equal('Utilisateur Courant');
              expect(nomService).to.equal('Nom Service');
              expect(idHomologation).to.equal('123');
              emailEnvoye = true;
              return Promise.resolve();
            } catch (e) {
              return Promise.reject(e);
            }
          };

          axios
            .post('http://localhost:1234/api/autorisation', {
              emailContributeur: 'jean.dupont@mail.fr',
              idHomologation: '123',
            })
            .then(() => expect(emailEnvoye).to.be(true))
            .then(() => done())
            .catch((e) => done(e.response?.data || e));
        });
      });

      describe('si le contributeur a déjà été invité', () => {
        beforeEach(() => {
          testeur.depotDonnees().autorisationExiste = () =>
            Promise.resolve(true);
        });

        it("n'envoie pas d'email d'invitation à contribuer", (done) => {
          let emailEnvoye = false;

          testeur.adaptateurMail().envoieMessageInvitationContribution = () => {
            emailEnvoye = true;
            return Promise.resolve();
          };

          axios
            .post('http://localhost:1234/api/autorisation', {
              emailContributeur: 'jean.dupont@mail.fr',
              idHomologation: '123',
            })
            .then(() => done('Le serveur aurait dû lever une erreur HTTP 424'))
            .catch(() => {
              expect(emailEnvoye).to.be(false);
              done();
            })
            .catch((e) => done(e.response?.data || e));
        });

        it("n'envoie pas d'email d'invitation à s'inscrire", (done) => {
          let emailEnvoye = false;

          testeur.adaptateurMail().envoieMessageInvitationInscription = () => {
            emailEnvoye = true;
            return Promise.resolve();
          };

          axios
            .post('http://localhost:1234/api/autorisation', {
              emailContributeur: 'jean.dupont@mail.fr',
              idHomologation: '123',
            })
            .then(() => done('Le serveur aurait dû lever une erreur HTTP 424'))
            .catch(() => {
              expect(emailEnvoye).to.be(false);
              done();
            })
            .catch((e) => done(e.response?.data || e));
        });

        it("renvoie une erreur explicite à propos de l'invitation déjà envoyée", (done) => {
          axios
            .post('http://localhost:1234/api/autorisation', {
              emailContributeur: 'jean.dupont@mail.fr',
              idHomologation: '123',
            })
            .then(() => done('Le serveur aurait dû lever une erreur HTTP'))
            .catch((e) => {
              expect(e.response.data).to.eql({
                erreur: { code: 'INVITATION_DEJA_ENVOYEE' },
              });
              done();
            })
            .catch((e) => done(e.response?.data || e));
        });
      });
    });

    describe("si le contributeur n'existe pas déjà", () => {
      let contributeurCree;

      beforeEach(() => {
        let utilisateurInexistant;
        testeur.depotDonnees().utilisateurAvecEmail = () =>
          Promise.resolve(utilisateurInexistant);
        testeur.adaptateurMail().envoieMessageInvitationInscription = () =>
          Promise.resolve();
        testeur.adaptateurMail().creeContact = () => Promise.resolve();

        contributeurCree = {
          id: '789',
          email: 'jean.dupont@mail.fr',
          idResetMotDePasse: 'reset',
        };
        testeur.depotDonnees().nouvelUtilisateur = () =>
          Promise.resolve(contributeurCree);
      });

      it('demande au dépôt de le créer', (done) => {
        let nouveauContributeurCree = false;
        testeur.depotDonnees().nouvelUtilisateur = (donneesUtilisateur) => {
          try {
            expect(donneesUtilisateur.email).to.equal('jean.dupont@mail.fr');
            nouveauContributeurCree = true;
            return Promise.resolve(contributeurCree);
          } catch (e) {
            return Promise.reject(e);
          }
        };

        axios
          .post('http://localhost:1234/api/autorisation', {
            emailContributeur: 'jean.dupont@mail.fr',
            idHomologation: '123',
          })
          .then(() => {
            expect(nouveauContributeurCree).to.be(true);
            done();
          })
          .catch((e) => done(e.response?.data || e));
      });

      it('crée un contact email', (done) => {
        testeur.adaptateurMail().creeContact = (
          destinataire,
          prenom,
          nom,
          bloqueEmails
        ) => {
          expect(destinataire).to.equal('jean.dupont@mail.fr');
          expect(prenom).to.equal('');
          expect(nom).to.equal('');
          expect(bloqueEmails).to.equal(true);
          return Promise.resolve();
        };

        axios
          .post('http://localhost:1234/api/autorisation', {
            emailContributeur: 'jean.dupont@mail.fr',
            idHomologation: '123',
          })
          .then(() => done())
          .catch((e) => done(e.response?.data || e));
      });

      it('crée le compte avec un email converti en minuscules', (done) => {
        testeur.depotDonnees().nouvelUtilisateur = (donneesUtilisateur) => {
          const enMinuscules = 'jean.dupont@mail.fr';
          expect(donneesUtilisateur.email).to.be(enMinuscules);
          done();
          return Promise.resolve(contributeurCree);
        };

        axios
          .post('http://localhost:1234/api/autorisation', {
            emailContributeur: 'Jean.DUPONT@mail.fr',
            idHomologation: '123',
          })
          .catch((e) => done(e.response?.data || e));
      });

      it("envoie un mail d'invitation au contributeur créé", (done) => {
        let messageEnvoye = false;
        testeur.middleware().reinitialise({ idUtilisateur: '456' });

        testeur.depotDonnees().utilisateur = (id) => {
          try {
            expect(id).to.equal('456');
            return Promise.resolve({ prenomNom: () => 'Utilisateur Courant' });
          } catch (e) {
            return Promise.reject(e);
          }
        };

        testeur.depotDonnees().homologation = (id) => {
          try {
            expect(id).to.equal('123');
            return Promise.resolve({ nomService: () => 'Nom Service' });
          } catch (e) {
            return Promise.reject(e);
          }
        };

        testeur.adaptateurMail().envoieMessageInvitationInscription = (
          destinataire,
          prenomNomEmetteur,
          nomService,
          idResetMotDePasse
        ) => {
          try {
            expect(destinataire).to.equal('jean.dupont@mail.fr');
            expect(prenomNomEmetteur).to.equal('Utilisateur Courant');
            expect(nomService).to.equal('Nom Service');
            expect(idResetMotDePasse).to.equal('reset');
            messageEnvoye = true;
            return Promise.resolve();
          } catch (e) {
            return Promise.reject(e);
          }
        };

        axios
          .post('http://localhost:1234/api/autorisation', {
            emailContributeur: 'jean.dupont@mail.fr',
            idHomologation: '123',
          })
          .then(() => {
            expect(messageEnvoye).to.be(true);
            done();
          })
          .catch((e) => done(e.response?.data || e));
      });
    });

    it("demande au dépôt de données d'ajouter l'autorisation", (done) => {
      testeur.depotDonnees().ajouteContributeurAHomologation = (
        idContributeur,
        idHomologation
      ) => {
        try {
          expect(utilisateur.id).to.equal('999');
          expect(idContributeur).to.equal('999');
          expect(idHomologation).to.equal('123');
          return Promise.resolve();
        } catch (e) {
          return Promise.reject(e);
        }
      };

      axios
        .post('http://localhost:1234/api/autorisation', {
          emailContributeur: 'jean.dupont@mail.fr',
          idHomologation: '123',
        })
        .then((reponse) => {
          expect(reponse.status).to.be(200);
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });

    it("envoie un événement d'invitation contributeur via l'adaptateur de tracking", (done) => {
      let donneesPassees = {};
      let idUtilisateurPasse;
      testeur.depotDonnees().homologations = (idUtilisateur) => {
        idUtilisateurPasse = idUtilisateur;
        const serviceBouchon3Contributeurs = { contributeurs: ['a', 'b', 'c'] };
        return Promise.resolve([serviceBouchon3Contributeurs]);
      };

      testeur.adaptateurTracking().envoieTrackingInvitationContributeur = (
        destinataire,
        donneesEvenement
      ) => {
        donneesPassees = { destinataire, donneesEvenement };
        return Promise.resolve();
      };

      axios
        .post('http://localhost:1234/api/autorisation', {
          emailContributeur: 'jean.dupont@mail.fr',
          idHomologation: '123',
        })
        .then(() => {
          expect(idUtilisateurPasse).to.be('456');
          expect(donneesPassees).to.eql({
            destinataire: 'jean.dupont@mail.fr',
            donneesEvenement: { nombreMoyenContributeurs: 3 },
          });
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });

    it('retourne une erreur HTTP 422 si le dépôt a levé une `ErreurModele`', (done) => {
      testeur.depotDonnees().ajouteContributeurAHomologation = () => {
        throw new ErreurModele('oups');
      };

      testeur.verifieRequeteGenereErreurHTTP(
        422,
        'oups',
        {
          method: 'post',
          url: 'http://localhost:1234/api/autorisation',
          data: {},
        },
        done
      );
    });
  });

  describe('quand requête DELETE sur `/api/autorisation`', () => {
    const autorisation = { id: '111' };

    beforeEach(() => {
      testeur.middleware().reinitialise({ idUtilisateur: '456' });
      autorisation.permissionSuppressionContributeur = true;
      testeur.depotDonnees().autorisationPour = () =>
        Promise.resolve(autorisation);
      testeur.depotDonnees().supprimeContributeur = () => Promise.resolve();
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

    it("vérifie que l'utilisateur a le droit de supprimer un contributeur", (done) => {
      let autorisationInterrogee = false;
      testeur.depotDonnees().autorisationPour = (
        idUtilisateur,
        idHomologation
      ) => {
        try {
          expect(testeur.middleware().idUtilisateurCourant()).to.equal('456');

          expect(idUtilisateur).to.equal('456');
          expect(idHomologation).to.equal('123');
          autorisationInterrogee = true;
          return Promise.resolve(autorisation);
        } catch (e) {
          return Promise.reject(e);
        }
      };

      axios
        .delete('http://localhost:1234/api/autorisation', {
          params: { idHomologation: '123' },
        })
        .then(() => {
          expect(autorisationInterrogee).to.be(true);
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });

    it("retourne une erreur HTTP 403 si l'utilisateur n'a pas le droit de supprimer un contributeur", (done) => {
      autorisation.permissionSuppressionContributeur = false;
      testeur.depotDonnees().autorisationPour = () =>
        Promise.resolve(autorisation);

      axios
        .delete('http://localhost:1234/api/autorisation', {
          params: { idHomologation: '123' },
        })
        .then(() => {
          done('La requête aurait dû lever une erreur HTTP 403');
        })
        .catch((e) => {
          expect(e.response.status).to.equal(403);
          expect(e.response.data).to.equal(
            'Suppression non autorisé pour un contributeur'
          );
          done();
        })
        .catch(done);
    });

    it("utilise le dépôt de données pour supprimer l'autorisation du contributeur", (done) => {
      let depotInterroge = false;
      testeur.depotDonnees().supprimeContributeur = (
        idContributeur,
        idHomologation
      ) => {
        depotInterroge = true;
        expect(idContributeur).to.equal('999');
        expect(idHomologation).to.equal('123');
        return Promise.resolve({});
      };

      axios
        .delete('http://localhost:1234/api/autorisation', {
          params: {
            idHomologation: '123',
            idContributeur: '999',
          },
        })
        .then(() => {
          expect(depotInterroge).to.be(true);
          done();
        })
        .catch((e) => done(e.response?.data || e));
    });

    it("retourne une erreur HTTP 424 si le dépôt ne peut pas supprimer l'autorisation", (done) => {
      testeur.depotDonnees().supprimeContributeur = () =>
        Promise.reject(new Error("Un message d'erreur"));

      axios
        .delete('http://localhost:1234/api/autorisation', {
          params: {
            idHomologation: '123',
            emailContributeur: 'jean.dupont@mail.fr',
          },
        })
        .then(() => {
          done('La requête aurait dû lever une erreur HTTP 424');
        })
        .catch((e) => {
          expect(e.response.status).to.equal(424);
          expect(e.response.data).to.equal("Un message d'erreur");
          done();
        });
    });
  });
});
