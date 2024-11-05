const Knex = require('knex');

const adaptateurSupervision = ({ adaptateurChiffrement }) => {
  const config = {
    client: 'pg',
    connection: process.env.URL_SERVEUR_BASE_DONNEES_JOURNAL,
    pool: { min: 0, max: 10 },
  };

  const knex = Knex(config);

  return {
    relieSuperviseursAService: async (idService, idSuperviseurs) => {
      const idServiceHash = adaptateurChiffrement.hacheSha256(idService);
      const idSuperviseursHash = idSuperviseurs.map(
        adaptateurChiffrement.hacheSha256
      );

      await knex('journal_mss.superviseurs').insert(
        idSuperviseursHash.map((idSuperviseur) => ({
          id_superviseur: idSuperviseur,
          id_service: idServiceHash,
        }))
      );
    },
  };
};

module.exports = adaptateurSupervision;
