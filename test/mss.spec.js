const axios = require('axios');
const expect = require('expect.js');

const testeurMSS = require('./routes/testeurMSS');
const { unUtilisateur } = require('./constructeurs/constructeurUtilisateur');

describe('Le serveur MSS', () => {
  const testeur = testeurMSS();

  beforeEach(testeur.initialise);

  afterEach(testeur.arrete);

  it('sert des pages HTML', (done) => {
    axios
      .get('http://localhost:1234/')
      .then((reponse) => {
        expect(reponse.status).to.equal(200);
        done();
      })
      .catch(done);
  });

  it('utilise un filtrage IP pour ne servir que les IP autorisées', (done) => {
    testeur.middleware().verifieFiltrageIp('http://localhost:1234', done);
  });

  describe('quand une page est servie', () => {
    it('positionne les headers', (done) => {
      testeur
        .middleware()
        .verifieRequetePositionneHeaders('http://localhost:1234/', done);
    });

    it("n'affiche pas d'information sur la nature du serveur", (done) => {
      axios
        .get('http://localhost:1234')
        .then((reponse) => {
          expect(reponse.headers).to.not.have.property('x-powered-by');
          done();
        })
        .catch(done);
    });

    it("repousse l'expiration du cookie", (done) => {
      testeur
        .middleware()
        .verifieRequeteRepousseExpirationCookie('http://localhost:1234/', done);
    });
  });

  describe('quand requête GET sur `/connexion`', () => {
    it("déconnecte l'utilisateur courant", (done) => {
      testeur
        .middleware()
        .verifieRequeteExigeSuppressionCookie(
          'http://localhost:1234/connexion',
          done
        );
    });
  });

  describe('quand GET sur /motDePasse/edition', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      const utilisateur = { accepteCGU: () => true };
      testeur.depotDonnees().utilisateur = () => Promise.resolve(utilisateur);

      testeur
        .middleware()
        .verifieRequeteExigeJWT(
          'http://localhost:1234/motDePasse/edition',
          done
        );
    });
  });

  describe('quand GET sur /motDePasse/initialisation', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      const utilisateur = { accepteCGU: () => true };
      testeur.depotDonnees().utilisateur = () => Promise.resolve(utilisateur);

      testeur
        .middleware()
        .verifieRequeteExigeJWT(
          'http://localhost:1234/motDePasse/initialisation',
          done
        );
    });
  });

  describe('quand requête GET sur `/reinitialisationMotDePasse`', () => {
    it("déconnecte l'utilisateur courant", (done) => {
      testeur
        .middleware()
        .verifieRequeteExigeSuppressionCookie(
          'http://localhost:1234/reinitialisationMotDePasse',
          done
        );
    });
  });

  describe('quand requête GET sur `/initialisationMotDePasse/:idReset`', () => {
    const uuid = '109156be-c4fb-41ea-b1b4-efe1671c5836';

    describe('avec idReset valide', () => {
      const utilisateur = {
        id: '123',
        genereToken: () => 'un token',
        accepteCGU: () => false,
      };

      beforeEach(() => {
        testeur.depotDonnees().utilisateurAFinaliser = async () => utilisateur;
        testeur.depotDonnees().utilisateur = async () => utilisateur;
      });

      it('dépose le jeton dans un cookie', async () => {
        let idRecu;
        testeur.depotDonnees().utilisateurAFinaliser = async (idReset) => {
          idRecu = idReset;
          return utilisateur;
        };

        const reponse = await axios.get(
          `http://localhost:1234/initialisationMotDePasse/${uuid}`
        );

        expect(idRecu).to.be(uuid);
        await testeur.verifieJetonDepose(reponse, () => {});
      });
    });

    it("aseptise l'identifiant reçu", (done) => {
      testeur
        .middleware()
        .verifieAseptisationParametres(
          ['idReset'],
          `http://localhost:1234/initialisationMotDePasse/${uuid}`,
          done
        );
    });

    it("retourne une erreur HTTP 400 sur idReset n'est pas un UUID valide", (done) => {
      testeur.verifieRequeteGenereErreurHTTP(
        400,
        'UUID requis',
        'http://localhost:1234/initialisationMotDePasse/999',
        done
      );
    });

    it('retourne une erreur HTTP 404 si idReset inconnu', (done) => {
      testeur.depotDonnees().utilisateurAFinaliser = async () => {};

      testeur.verifieRequeteGenereErreurHTTP(
        404,
        `Identifiant d'initialisation de mot de passe inconnu`,
        `http://localhost:1234/initialisationMotDePasse/${uuid}`,
        done
      );
    });
  });

  describe('quand requête GET sur `/espacePersonnel`', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      testeur
        .middleware()
        .verifieRequeteExigeAcceptationCGU(
          'http://localhost:1234/espacePersonnel',
          done
        );
    });

    it('redirige vers le tableau de bord', (done) => {
      axios
        .get('http://localhost:1234/espacePersonnel')
        .then((reponse) => {
          expect(reponse.request.res.responseUrl).to.contain('tableauDeBord');
          done();
        })
        .catch(done);
    });
  });

  it("vérifie que l'état de la visite guidée est chargé sur le tableau de bord", (done) => {
    testeur
      .middleware()
      .verifieRequeteChargeEtatVisiteGuidee(
        'http://localhost:1234/tableauDeBord',
        done
      );
  });

  describe('quand requête GET sur `/utilisateur/edition`', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      const utilisateur = unUtilisateur().quiAccepteCGU().construis();
      testeur.depotDonnees().utilisateur = () => Promise.resolve(utilisateur);
      testeur
        .middleware()
        .verifieRequeteExigeJWT(
          'http://localhost:1234/utilisateur/edition',
          done
        );
    });
  });

  describe('quand requête GET sur `/visiteGuidee/:idEtape`', () => {
    it("vérifie que l'utilisateur est authentifié", (done) => {
      const utilisateur = unUtilisateur().quiAccepteCGU().construis();
      testeur.depotDonnees().utilisateur = () => Promise.resolve(utilisateur);
      testeur
        .middleware()
        .verifieRequeteExigeJWT(
          'http://localhost:1234/visiteGuidee/decrire',
          done
        );
    });

    it("charge les préférences de l'utilisateur", (done) => {
      testeur
        .middleware()
        .verifieChargementDesPreferences(
          'http://localhost:1234/visiteGuidee/decrire',
          done
        );
    });

    it("charge l'état de la visite guidée", (done) => {
      testeur
        .middleware()
        .verifieRequeteChargeEtatVisiteGuidee(
          'http://localhost:1234/visiteGuidee/decrire',
          done
        );
    });
  });
});
