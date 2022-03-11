const express = require('express');

const { ErreurModele } = require('../erreurs');
const ActeursHomologation = require('../modeles/acteursHomologation');
const AvisExpertCyber = require('../modeles/avisExpertCyber');
const DescriptionService = require('../modeles/descriptionService');
const FonctionnalitesSpecifiques = require('../modeles/fonctionnalitesSpecifiques');
const DonneesSensiblesSpecifiques = require('../modeles/donneesSensiblesSpecifiques');
const MesureGenerale = require('../modeles/mesureGenerale');
const MesuresSpecifiques = require('../modeles/mesuresSpecifiques');
const PartiesPrenantes = require('../modeles/partiesPrenantes/partiesPrenantes');
const PointsAcces = require('../modeles/pointsAcces');
const RisqueGeneral = require('../modeles/risqueGeneral');
const RisquesSpecifiques = require('../modeles/risquesSpecifiques');
const RolesResponsabilites = require('../modeles/rolesResponsabilites');

const routesApiHomologation = (middleware, depotDonnees, referentiel) => {
  const routes = express.Router();

  routes.post('/', middleware.verificationAcceptationCGU, middleware.aseptise('nomService'), middleware.aseptiseListes([
    { nom: 'pointsAcces', proprietes: PointsAcces.proprietesItem() },
    { nom: 'fonctionnalitesSpecifiques', proprietes: FonctionnalitesSpecifiques.proprietesItem() },
    { nom: 'donneesSensiblesSpecifiques', proprietes: DonneesSensiblesSpecifiques.proprietesItem() },
  ]),
  (requete, reponse, suite) => {
    const {
      nomService,
      typeService,
      provenanceService,
      fonctionnalites,
      fonctionnalitesSpecifiques,
      donneesCaracterePersonnel,
      donneesSensiblesSpecifiques,
      delaiAvantImpactCritique,
      localisationDonnees,
      presenceResponsable,
      presentation,
      pointsAcces,
      statutDeploiement,
    } = requete.body;

    depotDonnees.nouvelleHomologation(requete.idUtilisateurCourant, {
      nomService,
      typeService,
      provenanceService,
      fonctionnalites,
      fonctionnalitesSpecifiques,
      donneesCaracterePersonnel,
      donneesSensiblesSpecifiques,
      delaiAvantImpactCritique,
      localisationDonnees,
      presenceResponsable,
      presentation,
      pointsAcces,
      statutDeploiement,
    })
      .then((idHomologation) => reponse.json({ idHomologation }))
      .catch((e) => {
        if (e instanceof ErreurModele) reponse.status(422).send(e.message);
        else suite(e);
      });
  });

  routes.put('/:id', middleware.trouveHomologation, middleware.aseptise('nomService'), middleware.aseptiseListes([
    { nom: 'pointsAcces', proprietes: PointsAcces.proprietesItem() },
    { nom: 'fonctionnalitesSpecifiques', proprietes: FonctionnalitesSpecifiques.proprietesItem() },
    { nom: 'donneesSensiblesSpecifiques', proprietes: DonneesSensiblesSpecifiques.proprietesItem() },
  ]),
  (requete, reponse, suite) => {
    const descriptionService = new DescriptionService(requete.body, referentiel);
    depotDonnees.ajouteDescriptionServiceAHomologation(
      requete.idUtilisateurCourant,
      requete.params.id,
      descriptionService
    )
      .then(() => reponse.send({ idHomologation: requete.homologation.id }))
      .catch((e) => {
        if (e instanceof ErreurModele) {
          reponse.status(422).send(e.message);
        } else suite(e);
      });
  });

  routes.post('/:id/mesures', middleware.trouveHomologation, middleware.aseptise(
    '*',
    'mesuresSpecifiques.*.description',
    'mesuresSpecifiques.*.categorie',
    'mesuresSpecifiques.*.statut',
    'mesuresSpecifiques.*.modalites',
  ),
  (requete, reponse, suite) => {
    const { mesuresSpecifiques = [], ...params } = requete.body;
    const identifiantsMesures = Object.keys(params).filter((p) => !p.match(/^modalites-/));
    const idHomologation = requete.homologation.id;
    try {
      const ajouts = identifiantsMesures.reduce((acc, im) => {
        const mesure = new MesureGenerale({
          id: im,
          statut: params[im],
          modalites: params[`modalites-${im}`],
        }, referentiel);

        return acc.then(
          () => depotDonnees.ajouteMesureGeneraleAHomologation(idHomologation, mesure)
        );
      }, Promise.resolve());

      ajouts
        .then(() => {
          const aPersister = mesuresSpecifiques.filter(
            (m) => m?.description || m?.categorie || m?.statut || m?.modalites
          );

          const listeMesures = new MesuresSpecifiques({
            mesuresSpecifiques: aPersister,
          }, referentiel);
          return depotDonnees.remplaceMesuresSpecifiquesPourHomologation(
            idHomologation,
            listeMesures,
          );
        })
        .then(() => reponse.send({ idHomologation }))
        .catch(suite);
    } catch {
      reponse.status(422).send('Données invalides');
    }
  });

  routes.post('/:id/partiesPrenantes',
    middleware.trouveHomologation,
    middleware.aseptiseListes([
      { nom: 'acteursHomologation', proprietes: ActeursHomologation.proprietesItem() },
      { nom: 'partiesPrenantes', proprietes: PartiesPrenantes.proprietesItem() },
    ]),
    (requete, reponse) => {
      const rolesResponsabilites = new RolesResponsabilites(requete.body);
      const idHomologation = requete.homologation.id;
      depotDonnees.ajouteRolesResponsabilitesAHomologation(
        idHomologation, rolesResponsabilites
      ).then(() => reponse.send({ idHomologation }));
    });

  routes.post('/:id/risques', middleware.trouveHomologation, middleware.aseptise(
    '*',
    'risquesSpecifiques.*.description',
    'risquesSpecifiques.*.niveauGravite',
    'risquesSpecifiques.*.commentaire',
  ),
  (requete, reponse, suite) => {
    const { risquesSpecifiques = [], ...params } = requete.body;
    const prefixeAttributRisque = /^(commentaire|niveauGravite)-/;
    const idHomologation = requete.homologation.id;

    try {
      const donneesRisques = Object.keys(params)
        .filter((p) => p.match(prefixeAttributRisque))
        .reduce((acc, p) => {
          const idRisque = p.replace(prefixeAttributRisque, '');
          const nomAttribut = p.match(prefixeAttributRisque)[1];
          acc[idRisque] ||= {};
          Object.assign(acc[idRisque], { id: idRisque, [nomAttribut]: params[p] });
          return acc;
        }, {});

      const ajouts = Object.values(donneesRisques)
        .reduce((acc, donnees) => {
          const risque = new RisqueGeneral(donnees, referentiel);
          return acc.then(() => depotDonnees.ajouteRisqueGeneralAHomologation(
            idHomologation,
            risque,
          ));
        }, Promise.resolve());

      ajouts
        .then(() => {
          const aPersister = risquesSpecifiques
            .filter((r) => r?.description || r?.commentaire || r?.niveauGravite);
          const listeRisquesSpecifiques = new RisquesSpecifiques({
            risquesSpecifiques: aPersister,
          }, referentiel);

          return depotDonnees.remplaceRisquesSpecifiquesPourHomologation(
            idHomologation, listeRisquesSpecifiques,
          );
        })
        .then(() => reponse.send({ idHomologation }))
        .catch(suite);
    } catch {
      reponse.status(422).send('Données invalides');
    }
  });

  routes.post('/:id/avisExpertCyber', middleware.trouveHomologation, (requete, reponse) => {
    try {
      const avisExpert = new AvisExpertCyber(requete.body, referentiel);
      depotDonnees.ajouteAvisExpertCyberAHomologation(requete.params.id, avisExpert)
        .then(() => reponse.send({ idHomologation: requete.params.id }));
    } catch {
      reponse.status(422).send('Données invalides');
    }
  });

  return routes;
};

module.exports = routesApiHomologation;
