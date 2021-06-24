const donnees = require('./jeuDonnees');
const referentiel = require('./referentiel');
const DepotDonnees = require('./src/depotDonnees');
const middleware = require('./src/middleware');
const MSS = require('./src/mss');
const adaptateurJWT = require('./src/adaptateurs/adaptateurJWT');
const adaptateurUUID = require('./src/adaptateurs/adaptateurUUID');

const port = process.env.PORT || 3000;
const depotDonnees = DepotDonnees.creeDepot(donnees, {
  adaptateurJWT, adaptateurUUID, referentiel,
});
const serveur = MSS.creeServeur(depotDonnees, middleware(adaptateurJWT), referentiel);

serveur.ecoute(port, () => {
  /* eslint-disable no-console */

  console.log(`Mon Service Sécurisé est démarré et écoute le port ${port} !…`);

  /* eslint-enable no-console */
});
