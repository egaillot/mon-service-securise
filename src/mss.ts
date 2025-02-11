const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const express = require('express');

const {
  CACHE_CONTROL_FICHIERS_STATIQUES,
  DUREE_SESSION,
  ENDPOINTS_SANS_CSRF,
} = require('./http/configurationServeur');
const routesConnecteApi = require('./routes/connecte/routesConnecteApi');
const routesNonConnecteApi = require('./routes/nonConnecte/routesNonConnecteApi');
const {
  routesNonConnecteApiBibliotheques,
} = require('./routes/nonConnecte/routesNonConnecteApiBibliotheques');
const routesNonConnecteApiStyles = require('./routes/nonConnecte/routesNonConnecteApiStyles');
const routesNonConnectePage = require('./routes/nonConnecte/routesNonConnectePage');
const routesConnectePage = require('./routes/connecte/routesConnectePage');
const routesNonConnecteOidc = require('./routes/nonConnecte/routesNonConnecteOidc');
const routesConnecteOidc = require('./routes/connecte/routesConnecteOidc');

require('dotenv').config();

const creeServeur = ({
  depotDonnees,
  middleware,
  referentiel,
  moteurRegles,
  adaptateurCmsCrisp,
  adaptateurMail,
  adaptateurPdf,
  adaptateurHorloge,
  adaptateurGestionErreur,
  serviceAnnuaire,
  adaptateurCsv,
  adaptateurZip,
  adaptateurTracking,
  adaptateurProtection,
  adaptateurJournal,
  adaptateurOidc,
  adaptateurEnvironnement,
  adaptateurStatistiques,
  adaptateurJWT,
  serviceSupervision,
  serviceCgu,
  procedures,
  inscriptionUtilisateur,
  avecCookieSecurise = process.env.NODE_ENV === 'production',
  avecPageErreur = process.env.NODE_ENV === 'production',
}) => {
  let serveur;

  const app = express();

  adaptateurGestionErreur.initialise(app);

  app.use(middleware.filtreIpAutorisees());
  app.use(middleware.redirigeVersUrlBase);

  app.use(express.json());

  app.use(
    cookieSession({
      maxAge: DUREE_SESSION,
      name: 'token',
      sameSite: true,
      secret: process.env.SECRET_COOKIE,
      secure: avecCookieSecurise,
    })
  );

  app.use(cookieParser());

  app.use(adaptateurProtection.protectionCsrf(ENDPOINTS_SANS_CSRF));
  app.use(adaptateurProtection.protectionLimiteTrafic());

  app.use(middleware.positionneHeaders);
  app.use(middleware.repousseExpirationCookie);
  app.use(middleware.ajouteVersionFichierCompiles);

  app.disable('x-powered-by');

  app.set('trust proxy', 1);
  app.set('view engine', 'pug');
  app.set('views', './src/vues');

  app.use(/\/((?!statique).)*/, middleware.verificationModeMaintenance);

  app.use(
    '',
    routesNonConnectePage({
      adaptateurCmsCrisp,
      adaptateurEnvironnement,
      adaptateurStatistiques,
      adaptateurJWT,
      serviceAnnuaire,
      depotDonnees,
      middleware,
      referentiel,
    })
  );
  app.use(
    '',
    routesConnectePage({
      depotDonnees,
      middleware,
      moteurRegles,
      referentiel,
      adaptateurCsv,
      adaptateurGestionErreur,
      adaptateurHorloge,
    })
  );
  app.use(
    '/api',
    routesNonConnecteApi({
      middleware,
      referentiel,
      depotDonnees,
      serviceAnnuaire,
      adaptateurTracking,
      adaptateurGestionErreur,
      adaptateurMail,
      inscriptionUtilisateur,
      serviceCgu,
    })
  );
  app.use(
    '/oidc',
    routesNonConnecteOidc({
      adaptateurOidc,
      adaptateurJWT,
      depotDonnees,
      middleware,
      adaptateurEnvironnement,
    })
  );
  app.use(
    '/oidc',
    routesConnecteOidc({
      middleware,
      adaptateurOidc,
    })
  );
  app.use(
    '/api',
    middleware.verificationJWT,
    routesConnecteApi({
      middleware,
      adaptateurMail,
      depotDonnees,
      referentiel,
      adaptateurHorloge,
      adaptateurPdf,
      adaptateurCsv,
      adaptateurZip,
      adaptateurJournal,
      procedures,
      serviceAnnuaire,
      serviceSupervision,
      serviceCgu,
    })
  );
  app.use('/bibliotheques', routesNonConnecteApiBibliotheques());
  app.use('/styles', routesNonConnecteApiStyles());

  app.use(
    '/statique',
    express.static('public', {
      setHeaders: (reponse) =>
        reponse.setHeader('cache-control', CACHE_CONTROL_FICHIERS_STATIQUES),
    })
  );

  app.use(adaptateurGestionErreur.controleurErreurs);

  if (avecPageErreur) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((_erreur, _requete, reponse, _suite) => {
      reponse.render('erreur');
    });
  }

  const ecoute = (port, succes) => {
    serveur = app.listen(port, succes);
  };

  const arreteEcoute = () => {
    serveur.close();
  };

  return { ecoute, arreteEcoute };
};

module.exports = { creeServeur };
