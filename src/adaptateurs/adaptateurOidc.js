const { Issuer } = require('openid-client');
const { generators } = require('openid-client');
const adaptateurEnvironnement = require('./adaptateurEnvironnement');

const configurationOidc = adaptateurEnvironnement.oidc();

async function recupereClient() {
  const agentConnect = await Issuer.discover(configurationOidc.urlBase());
  return new agentConnect.Client({
    client_id: configurationOidc.clientId(),
    client_secret: configurationOidc.clientSecret(),
    redirect_uris: [configurationOidc.urlRedirectionApresAuthentification()],
    response_types: ['code'],
    id_token_signed_response_alg: 'RS256',
    userinfo_signed_response_alg: 'RS256',
  });
}

const genereDemandeAutorisation = async () => {
  const client = await recupereClient();
  const nonce = generators.nonce(32);
  const state = generators.state(32);
  const url = client.authorizationUrl({
    scope: 'openid email given_name usual_name siret',
    nonce,
    state,
  });

  return {
    url,
    nonce,
    state,
  };
};
module.exports = {
  genereDemandeAutorisation,
};
