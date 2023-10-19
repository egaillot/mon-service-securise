const uneDescriptionValide = require('./constructeurDescriptionService');
const Referentiel = require('../../src/referentiel');
const Service = require('../../src/modeles/service');
const { unUtilisateur } = require('./constructeurUtilisateur');

class ConstructeurService {
  constructor(referentiel) {
    this.donnees = {
      id: '',
      descriptionService: uneDescriptionValide(referentiel).donnees,
      contributeurs: [],
      createur: { id: 'AAA', email: 'jean.dujardin@beta.gouv.com' },
    };
    this.mesures = undefined;
    this.referentiel = referentiel;
  }

  construis() {
    const service = new Service(this.donnees, this.referentiel);
    if (this.mesures !== undefined) {
      service.mesures = this.mesures;
    }
    return service;
  }

  avecDossiers(dossiers) {
    this.donnees.dossiers = dossiers;
    return this;
  }

  avecId(id) {
    this.donnees.id = id;
    return this;
  }

  avecMesures(mesures) {
    this.mesures = mesures;
    return this;
  }

  avecNomService(nomService) {
    this.donnees.descriptionService.nomService = nomService;
    return this;
  }

  avecNContributeurs(combien, ids = []) {
    for (let i = 0; i < combien; i += 1) {
      let { donnees } = unUtilisateur();
      if (ids.length) {
        donnees = unUtilisateur().avecId(ids[i]).donnees;
      }
      this.donnees.contributeurs.push(donnees);
    }
    return this;
  }

  ajouteUnContributeur(contributeur) {
    this.donnees.contributeurs.push(contributeur);
    return this;
  }

  ajouteUnProprietaire(proprietaire) {
    this.donnees.createur = proprietaire;
    return this;
  }
}

const unService = (referentiel = Referentiel.creeReferentielVide()) =>
  new ConstructeurService(referentiel);

module.exports = { unService };
