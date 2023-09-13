const expect = require('expect.js');
const { depotVide } = require('./depotVide');
const DepotDonneesAutorisations = require('../../src/depots/depotDonneesAutorisations');
const DepotDonneesHomologations = require('../../src/depots/depotDonneesHomologations');
const DepotDonneesUtilisateurs = require('../../src/depots/depotDonneesUtilisateurs');
const {
  ErreurAutorisationExisteDeja,
  ErreurAutorisationInexistante,
  ErreurHomologationInexistante,
  ErreurTentativeSuppressionCreateur,
  ErreurTranfertVersUtilisateurSource,
  ErreurUtilisateurInexistant,
} = require('../../src/erreurs');
const AutorisationContributeur = require('../../src/modeles/autorisations/autorisationContributeur');
const AutorisationCreateur = require('../../src/modeles/autorisations/autorisationCreateur');
const {
  unePersistanceMemoire,
} = require('../constructeurs/constructeurAdaptateurPersistanceMemoire');
const {
  Rubriques,
  Permissions,
} = require('../../src/modeles/autorisations/gestionDroits');

const { DECRIRE, SECURISER, HOMOLOGUER, CONTACTS, RISQUES } = Rubriques;
const { ECRITURE, LECTURE } = Permissions;

describe('Le dépôt de données des autorisations', () => {
  const creeDepot = (adaptateurPersistance, adaptateurUUID) =>
    DepotDonneesAutorisations.creeDepot({
      adaptateurPersistance,
      adaptateurUUID,
      depotHomologations: DepotDonneesHomologations.creeDepot({
        adaptateurPersistance,
      }),
      depotUtilisateurs: DepotDonneesUtilisateurs.creeDepot({
        adaptateurPersistance,
      }),
    });

  describe("sur demande de validation d'autorisation d'accès", () => {
    it("retourne `false` si aucune n'autorisation n'existe pour cet utilisateur et ce service", async () => {
      const depot = creeDepot(unePersistanceMemoire().construis());

      const accesAutorise123 = await depot.accesAutorise('456', '123');

      expect(accesAutorise123).to.be(false);
    });

    it('retourne `true` si le niveau de permission est suffisant pour cette rubrique', async () => {
      const avecDroitEcriture = unePersistanceMemoire()
        .ajouteUneAutorisation({
          idUtilisateur: '456',
          idHomologation: '123',
          type: 'createur',
          droits: { [DECRIRE]: ECRITURE },
        })
        .construis();

      const depot = creeDepot(avecDroitEcriture);

      const accesAutoriseEnLecture = await depot.accesAutorise('456', '123', {
        [DECRIRE]: LECTURE,
      });

      expect(accesAutoriseEnLecture).to.be(true);
    });

    it("retourne `false` si le niveau de permission n'est pas suffisant pour cette rubrique", async () => {
      const avecDroitLecture = unePersistanceMemoire()
        .ajouteUneAutorisation({
          idUtilisateur: '456',
          idHomologation: '123',
          type: 'createur',
          droits: { [DECRIRE]: LECTURE },
        })
        .construis();
      const depot = creeDepot(avecDroitLecture);

      const accesAutoriseEnEcriture = await depot.accesAutorise('456', '123', {
        [DECRIRE]: ECRITURE,
      });

      expect(accesAutoriseEnEcriture).to.be(false);
    });
  });

  describe("Sur demande de transfert des autorisations d'un utilisateur à un autre", () => {
    it("vérifie que l'utilisateur source existe", async () => {
      const depot = creeDepot(unePersistanceMemoire().construis());

      try {
        await depot.transfereAutorisations('999', '000');
        expect().to.fail('Le transfert aurait dû lever une erreur');
      } catch (erreur) {
        expect(erreur).to.be.a(ErreurUtilisateurInexistant);
        expect(erreur.message).to.equal('L\'utilisateur "999" n\'existe pas');
      }
    });

    it("vérifie que l'utilisateur cible existe", async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .construis();

      const depot = creeDepot(adaptateurPersistance);

      try {
        await depot.transfereAutorisations('999', '000');
        expect().to.fail('Le transfert aurait dû lever une erreur');
      } catch (e) {
        expect(e).to.be.a(ErreurUtilisateurInexistant);
        expect(e.message).to.equal('L\'utilisateur "000" n\'existe pas');
      }
    });

    it("vérifie que l'utilisateur cible est différent de l'utilisateur source", async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .construis();

      const depot = creeDepot(adaptateurPersistance);

      try {
        await depot.transfereAutorisations('999', '999');
        expect().to.fail('Le transfert aurait dû lever une erreur');
      } catch (erreur) {
        expect(erreur).to.be.a(ErreurTranfertVersUtilisateurSource);
        expect(erreur.message).to.be(
          "Transfert d'un utilisateur vers lui-même interdit"
        );
      }
    });

    it('effectue le transfert', async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .ajouteUnUtilisateur({ id: '000', email: 'autre.utilisateur@mail.fr' })
        .ajouteUnService({
          id: '123',
          descriptionService: { nomService: 'Un service' },
        })
        .ajouteUneAutorisation({
          idUtilisateur: '999',
          idHomologation: '123',
          type: 'createur',
        })
        .construis();

      const depot = creeDepot(adaptateurPersistance);

      await depot.transfereAutorisations('999', '000');
      const autorisation999 = await depot.autorisations('999');
      expect(autorisation999.length).to.equal(0);

      const autorisations000 = await depot.autorisations('000');
      expect(autorisations000.length).to.equal(1);
      expect(autorisations000[0]).to.be.an(AutorisationCreateur);
      expect(autorisations000[0].idHomologation).to.equal('123');
    });

    it("ne duplique pas les droits de contribution si l'utilisateur cible est déjà contributeur", async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .ajouteUnUtilisateur({ id: '000', email: 'autre.utilisateur@mail.fr' })
        .ajouteUnService({
          id: '123',
          descriptionService: { nomService: 'Un service' },
        })
        .ajouteUneAutorisation({
          id: '456',
          idUtilisateur: '999',
          idHomologation: '123',
          type: 'contributeur',
        })
        .ajouteUneAutorisation({
          id: '789',
          idUtilisateur: '000',
          idHomologation: '123',
          type: 'contributeur',
        })
        .construis();

      const depot = creeDepot(adaptateurPersistance);

      await depot.transfereAutorisations('999', '000');

      const as999 = await depot.autorisations('999');
      expect(as999.length).to.equal(0);

      const as000 = await depot.autorisations('000');
      expect(as000.length).to.equal(1);
      expect(as000[0].id).to.equal('789');
    });

    it("met à jour les droits si l'utilisateur source est créateur et l'utilisateur cible déjà contributeur", async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .ajouteUnUtilisateur({ id: '000', email: 'autre.utilisateur@mail.fr' })
        .ajouteUnService({
          id: '123',
          descriptionService: { nomService: 'Un service' },
        })
        .ajouteUneAutorisation({
          id: '456',
          idUtilisateur: '999',
          idHomologation: '123',
          type: 'createur',
        })
        .ajouteUneAutorisation({
          id: '789',
          idUtilisateur: '000',
          idHomologation: '123',
          type: 'contributeur',
        })
        .construis();

      const depot = creeDepot(adaptateurPersistance);

      await depot.transfereAutorisations('999', '000');

      const as999 = await depot.autorisations('999');
      expect(as999.length).to.equal(0);

      const as000 = await depot.autorisations('000');
      expect(as000.length).to.equal(1);
      expect(as000[0]).to.be.an(AutorisationCreateur);
    });
  });

  describe("sur recherche d'une autorisation", () => {
    it("retourne l'autorisation persistée", async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .ajouteUnService({
          id: '123',
          descriptionService: { nomService: 'Un service' },
        })
        .ajouteUneAutorisation({
          id: '456',
          idUtilisateur: '999',
          idHomologation: '123',
          type: 'createur',
        })
        .construis();

      const depot = creeDepot(adaptateurPersistance);

      const a = await depot.autorisation('456');

      expect(a).to.be.an(AutorisationCreateur);
      expect(a.id).to.equal('456');
      expect(a.idUtilisateur).to.equal('999');
      expect(a.idHomologation).to.equal('123');
    });

    it("retourne `undefined` si l'autorisation est inexistante", async () => {
      const depot = await depotVide();
      const autorisation = await depot.autorisation('123');
      expect(autorisation).to.be(undefined);
    });
  });

  describe("sur demande d'ajout d'un contributeur à une homologation", () => {
    const adaptateurUUID = { genereUUID: () => {} };

    it('lève une erreur si le contributeur est inexistant', async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .ajouteUnService({
          id: '123',
          descriptionService: { nomService: 'Un service' },
        })
        .ajouteUneAutorisation({
          id: '456',
          idUtilisateur: '999',
          idHomologation: '123',
          type: 'createur',
        })
        .construis();

      const depot = creeDepot(adaptateurPersistance);

      try {
        await depot.ajouteContributeurAHomologation('000', '123');
        expect().to.fail("L'ajout aurait du lever une erreur");
      } catch (erreur) {
        expect(erreur).to.be.a(ErreurUtilisateurInexistant);
        expect(erreur.message).to.equal('Le contributeur "000" n\'existe pas');
      }
    });

    it("lève une erreur si l'homologation est inexistante", async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .ajouteUnUtilisateur({ id: '000', email: 'contributeur@mail.fr' })
        .construis();

      const depot = creeDepot(adaptateurPersistance);

      try {
        await depot.ajouteContributeurAHomologation('000', '123');
        expect().to.fail("L'ajout aurait du lever une erreur");
      } catch (erreur) {
        expect(erreur).to.be.a(ErreurHomologationInexistante);
        expect(erreur.message).to.equal('L\'homologation "123" n\'existe pas');
      }
    });

    it("lève une erreur si l'autorisation existe déjà", async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .ajouteUnService({
          id: '123',
          descriptionService: { nomService: 'Un service' },
        })
        .ajouteUneAutorisation({
          id: '456',
          idUtilisateur: '999',
          idHomologation: '123',
          type: 'createur',
        })
        .construis();

      const depot = creeDepot(adaptateurPersistance);

      try {
        await depot.ajouteContributeurAHomologation('999', '123');
        expect().to.fail("L'ajout aurait du lever une erreur");
      } catch (erreur) {
        expect(erreur).to.be.a(ErreurAutorisationExisteDeja);
        expect(erreur.message).to.equal("L'autorisation existe déjà");
      }
    });

    it("persiste l'autorisation", async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .ajouteUnUtilisateur({ id: '000', email: 'contributeur@mail.fr' })
        .ajouteUnService({
          id: '123',
          descriptionService: { nomService: 'Un service' },
        })
        .ajouteUneAutorisation({
          id: '456',
          idUtilisateur: '999',
          idHomologation: '123',
          type: 'createur',
        })
        .construis();

      adaptateurUUID.genereUUID = () => '789';
      const depot = creeDepot(adaptateurPersistance, adaptateurUUID);

      await depot.ajouteContributeurAHomologation('000', '123');

      const a = await depot.autorisation('789');
      expect(a).to.be.a(AutorisationContributeur);
      expect(a.idHomologation).to.equal('123');
      expect(a.idService).to.equal('123');
      expect(a.idUtilisateur).to.equal('000');
      expect(a.droits).to.eql({
        [DECRIRE]: ECRITURE,
        [SECURISER]: ECRITURE,
        [HOMOLOGUER]: ECRITURE,
        [RISQUES]: ECRITURE,
        [CONTACTS]: ECRITURE,
      });
    });
  });

  it("connaît l'autorisation pour un utilisateur et une homologation donnée", async () => {
    const adaptateurPersistance = unePersistanceMemoire()
      .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
      .ajouteUnService({
        id: '123',
        descriptionService: { nomService: 'Un service' },
      })
      .ajouteUneAutorisation({
        id: '456',
        idUtilisateur: '999',
        idHomologation: '123',
        type: 'createur',
      })
      .construis();

    const depot = creeDepot(adaptateurPersistance);

    const a = await depot.autorisationPour('999', '123');

    expect(a).to.be.an(AutorisationCreateur);
    expect(a.id).to.equal('456');
  });

  it('sait si une autorisation existe', async () => {
    const adaptateurPersistance = unePersistanceMemoire()
      .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
      .ajouteUnService({
        id: '123',
        descriptionService: { nomService: 'Un service' },
      })
      .ajouteUneAutorisation({
        id: '456',
        idUtilisateur: '999',
        idHomologation: '123',
        type: 'createur',
      })
      .construis();

    const depot = creeDepot(adaptateurPersistance);

    const existe123 = await depot.autorisationExiste('999', '123');
    expect(existe123).to.be(true);

    const existe000 = await depot.autorisationExiste('999', '000');
    expect(existe000).to.be(false);

    const existeInconnu = await depot.autorisationExiste('000', '123');
    expect(existeInconnu).to.be(false);
  });

  describe("sur demande de suppression d'un contributeur", () => {
    it("vérifie que l'autorisation de contribution existe", async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .ajouteUnUtilisateur({ id: '000', email: 'annie.dubois@mail.fr' })
        .ajouteUnService({
          id: '123',
          descriptionService: { nomService: 'Un service' },
        })
        .ajouteUneAutorisation({
          id: '456',
          idUtilisateur: '999',
          idHomologation: '123',
          type: 'createur',
        })
        .construis();

      const depot = creeDepot(adaptateurPersistance);

      try {
        await depot.supprimeContributeur('000', '123');
        expect().to.fail('La demande aurait dû lever une erreur');
      } catch (e) {
        expect(e).to.be.an(ErreurAutorisationInexistante);
        expect(e.message).to.equal(
          'L\'utilisateur "000" n\'est pas contributeur de l\'homologation "123"'
        );
      }
    });

    it("vérifie qu'il s'agit bien d'un contributeur et non du créateur de l'homologation", async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .ajouteUnService({
          id: '123',
          descriptionService: { nomService: 'Un service' },
        })
        .ajouteUneAutorisation({
          id: '456',
          idUtilisateur: '999',
          idHomologation: '123',
          type: 'createur',
        })
        .construis();

      const depot = creeDepot(adaptateurPersistance);

      try {
        await depot.supprimeContributeur('999', '123');
        expect().to.fail('La demande aurait dû lever une erreur');
      } catch (e) {
        expect(e).to.be.an(ErreurTentativeSuppressionCreateur);
        expect(e.message).to.equal(
          'Suppression impossible : l\'utilisateur "999" est le propriétaire de l\'homologation "123"'
        );
      }
    });

    it('supprime le contributeur', async () => {
      const adaptateurPersistance = unePersistanceMemoire()
        .ajouteUnUtilisateur({ id: '999', email: 'jean.dupont@mail.fr' })
        .ajouteUnUtilisateur({ id: '000', email: 'contributeur@mail.fr' })
        .ajouteUnService({
          id: '123',
          descriptionService: { nomService: 'Un service' },
        })
        .ajouteUneAutorisation({
          id: '456',
          idUtilisateur: '999',
          idHomologation: '123',
          type: 'createur',
        })
        .ajouteUneAutorisation({
          id: '789',
          idUtilisateur: '000',
          idHomologation: '123',
          type: 'contributeur',
        })
        .construis();

      const depot = creeDepot(adaptateurPersistance);

      const a = await depot.autorisationPour('000', '123');
      expect(a).to.be.an(AutorisationContributeur);

      await depot.supprimeContributeur('000', '123');

      const apres = await depot.autorisationPour('000', '123');
      expect(apres).to.be(undefined);
    });
  });
});
