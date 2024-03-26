class EvenementUtilisateurInscrit {
  constructor({ utilisateur }) {
    if (!utilisateur)
      throw Error("Impossible d'instancier l'événement sans utilisateur");

    this.utilisateur = utilisateur;
  }
}

module.exports = EvenementUtilisateurInscrit;
