const express = require('express');
const { decode } = require('html-entities');
const Utilisateur = require('../../modeles/utilisateur');
const Service = require('../../modeles/service');
const InformationsHomologation = require('../../modeles/informationsHomologation');

const routesConnectePage = ({
  middleware,
  moteurRegles,
  depotDonnees,
  referentiel,
}) => {
  const routes = express.Router();

  routes.get(
    '/motDePasse/edition',
    middleware.verificationAcceptationCGU,
    middleware.chargeEtatVisiteGuidee,
    (requete, reponse) => {
      const idUtilisateur = requete.idUtilisateurCourant;
      depotDonnees.utilisateur(idUtilisateur).then((utilisateur) =>
        reponse.render('motDePasse/edition', {
          utilisateur,
          afficheChallengeMotDePasse: true,
        })
      );
    }
  );

  routes.get(
    '/motDePasse/initialisation',
    middleware.verificationJWT,
    (requete, reponse) => {
      const idUtilisateur = requete.idUtilisateurCourant;
      depotDonnees
        .utilisateur(idUtilisateur)
        .then((utilisateur) =>
          reponse.render('motDePasse/edition', { utilisateur })
        );
    }
  );

  routes.get(
    '/utilisateur/edition',
    middleware.verificationJWT,
    (requete, reponse) => {
      const departements = referentiel.departements();
      const idUtilisateur = requete.idUtilisateurCourant;
      depotDonnees
        .utilisateur(idUtilisateur)
        .then((utilisateur) =>
          reponse.render('utilisateur/edition', { utilisateur, departements })
        );
    }
  );

  routes.get(
    '/tableauDeBord',
    middleware.verificationAcceptationCGU,
    middleware.chargeEtatVisiteGuidee,
    (_requete, reponse) => {
      reponse.render('tableauDeBord');
    }
  );

  routes.get(
    '/historiqueProduit',
    middleware.verificationAcceptationCGU,
    middleware.chargeEtatVisiteGuidee,
    (_requete, reponse) => {
      reponse.render('historiqueProduit');
    }
  );

  routes.get(
    '/visiteGuidee/:idEtape',
    middleware.verificationAcceptationCGU,
    middleware.chargePreferencesUtilisateur,
    middleware.chargeEtatVisiteGuidee,
    (requete, reponse) => {
      const utilisateurVisiteGuidee = new Utilisateur({
        email: 'visite-guidee@cyber.gouv.fr',
      });
      const service = Service.creePourUnUtilisateur(utilisateurVisiteGuidee);
      service.id = 'ID-SERVICE-VISITE-GUIDEE';

      const { idEtape } = requete.params;
      reponse.locals.etatVisiteGuidee = {
        ...reponse.locals.etatVisiteGuidee,
        etapeCourante: idEtape.toUpperCase(),
      };
      reponse.locals.autorisationsService = {
        DECRIRE: { estMasque: false },
        SECURISER: { estMasque: false, estLectureSeule: false },
        HOMOLOGUER: { estMasque: false },
        RISQUES: { estMasque: false },
        CONTACTS: { estMasque: false },
        peutHomologuer: false,
      };

      if (idEtape === 'decrire') {
        reponse.render('service/creation', {
          InformationsHomologation,
          referentiel,
          service,
          etapeActive: 'descriptionService',
          departements: referentiel.departements(),
        });
      } else if (idEtape === 'securiser') {
        const mesures = moteurRegles.mesures(service.descriptionService);
        const pourcentageProgression = 80;

        service.indiceCyber = () => ({ total: 4.3 });
        reponse.render('service/mesures', {
          InformationsHomologation,
          referentiel,
          service,
          etapeActive: 'mesures',
          pourcentageProgression,
          mesures,
        });
      } else if (idEtape === 'homologuer') {
        reponse.render('service/dossiers', {
          InformationsHomologation,
          decode,
          service,
          etapeActive: 'dossiers',
          premiereEtapeParcours: referentiel.premiereEtapeParcours(),
          peutVoirTamponHomologation: true,
          referentiel,
        });
      } else if (idEtape === 'piloter') {
        reponse.render('tableauDeBord');
      }
    }
  );

  return routes;
};

module.exports = routesConnectePage;
