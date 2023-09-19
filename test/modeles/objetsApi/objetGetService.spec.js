const expect = require('expect.js');

const Service = require('../../../src/modeles/service');
const objetGetService = require('../../../src/modeles/objetsApi/objetGetService');
const Referentiel = require('../../../src/referentiel');
const {
  uneAutorisation,
} = require('../../constructeurs/constructeurAutorisation');
const {
  Rubriques: { HOMOLOGUER },
  Permissions: { LECTURE },
} = require('../../../src/modeles/autorisations/gestionDroits');

describe("L'objet d'API de `GET /service`", () => {
  const referentiel = Referentiel.creeReferentiel({
    statutsHomologation: {
      nonRealisee: { libelle: 'Non réalisée', ordre: 1 },
    },
  });
  const lectureSurHomologuer = uneAutorisation()
    .avecDroits({ [HOMOLOGUER]: LECTURE })
    .construis();

  const unService = new Service({
    id: '123',
    descriptionService: {
      nomService: 'Un service',
      organisationsResponsables: ['Une organisation'],
    },
    createur: {
      id: 'A',
      email: 'email.createur@mail.fr',
      prenom: 'Jacques',
      postes: ['RSSI'],
    },
    contributeurs: [
      {
        id: 'B',
        email: 'email.contributeur1@mail.fr',
        prenom: 'Jean',
        postes: ['Maire'],
      },
    ],
  });

  it('fournit les données nécessaires', () => {
    expect(
      objetGetService.donnees(unService, lectureSurHomologuer, 'A', referentiel)
    ).to.eql({
      id: '123',
      nomService: 'Un service',
      organisationsResponsables: ['Une organisation'],
      createur: {
        id: 'A',
        prenomNom: 'Jacques',
        initiales: 'J',
        poste: 'RSSI',
      },
      contributeurs: [
        {
          id: 'B',
          prenomNom: 'Jean',
          initiales: 'J',
          poste: 'Maire',
        },
      ],
      statutHomologation: {
        enCoursEdition: false,
        libelle: 'Non réalisée',
        id: 'nonRealisee',
        ordre: 1,
      },
      nombreContributeurs: 1 + 1,
      estCreateur: true,
      documentsPdfDisponibles: ['annexes', 'syntheseSecurite'],
      permissions: {
        suppressionContributeur: true,
      },
    });
  });

  it("masque le statut d'homologation si l'utilisateur n'a pas la permission", () => {
    const autorisationSansHomologuer = uneAutorisation()
      .avecDroits({})
      .construis();
    const donnees = objetGetService.donnees(
      unService,
      autorisationSansHomologuer,
      'A',
      referentiel
    );
    expect(donnees.statutHomologation).to.be(undefined);
  });

  describe('sur demande des permissions', () => {
    it("autorise la suppression de contributeur si l'utilisateur est créateur", () => {
      const unServiceDontAestCreateur = new Service({
        id: '123',
        descriptionService: { nomService: 'Un service' },
        createur: { id: 'A', email: 'email.createur@mail.fr' },
      });
      expect(
        objetGetService.donnees(
          unServiceDontAestCreateur,
          lectureSurHomologuer,
          'A',
          referentiel
        ).permissions
      ).to.eql({
        suppressionContributeur: true,
      });
    });

    it("n'autorise pas la suppression de contributeur si l'utilisateur est contributeur", () => {
      const unServiceDontAestCreateur = new Service({
        id: '123',
        descriptionService: { nomService: 'Un service' },
        createur: { id: 'A', email: 'email.createur@mail.fr' },
      });
      const idUtilisateur = 'un autre ID';
      expect(
        objetGetService.donnees(
          unServiceDontAestCreateur,
          lectureSurHomologuer,
          idUtilisateur,
          referentiel
        ).permissions
      ).to.eql({
        suppressionContributeur: false,
      });
    });
  });
});
