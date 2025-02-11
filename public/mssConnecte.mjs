import initialiseComportementModale from './modules/interactions/modale.mjs';
import lanceDecompteDeconnexion from './modules/deconnexion.js';
import lisDonneesPartagees from './modules/donneesPartagees.mjs';

$(() => {
  initialiseComportementModale($('.rideau#deconnexion'));

  document.body.dispatchEvent(
    new CustomEvent('svelte-recharge-centre-notifications')
  );

  document.body.dispatchEvent(new CustomEvent('svelte-recharge-tiroir'));

  const etatVisiteGuidee = lisDonneesPartagees('etat-visite-guidee');
  if (etatVisiteGuidee.dejaTerminee === false) {
    document.body.dispatchEvent(
      new CustomEvent('svelte-recharge-visite-guidee', {
        detail: etatVisiteGuidee,
      })
    );
  }

  $('#lien-reinitialise-visite-guidee').on('click', () => {
    axios
      .post('/api/visiteGuidee/reinitialise')
      .then(() => {
        window.location.href = '/tableauDeBord';
      })
      /* eslint-disable no-console */
      .catch(() =>
        console.warn('Impossible de réinitialiser la visite guidée')
      );
  });

  axios
    .get('/api/dureeSession')
    .then((reponse) => {
      const duree = reponse.data.dureeSession
        ? parseInt(reponse.data.dureeSession, 10)
        : 0;
      return lanceDecompteDeconnexion(duree);
    })
    /* eslint-disable no-console */
    .catch(() =>
      console.warn(
        "Impossible d'initialiser la modale de déconnexion, causé par une erreur pendant la récupération du délai de déconnexion"
      )
    );
  /* eslint-enable no-console */
});
