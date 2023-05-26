import { gestionnaireTiroir } from './gestionnaireTiroir.mjs';
import tableauDesServices from './tableauDesServices.mjs';
import gestionnaireActionsTiroir from './gestionnaireActionsTiroir.mjs';

const gestionnaireEvenements = {
  brancheComportement: () => {
    $('#recherche-service').on('input', (e) => {
      tableauDesServices.modifieRecherche($(e.target).val());
    });

    $(
      '.tableau-services thead th:not(:first):not(:last):not(.entete-contributeurs)'
    ).on('click', (e) => {
      const colonne = $(e.target).data('colonne');
      tableauDesServices.modifieTri(colonne);
    });

    $('.tableau-services').on('click', (e) => {
      const $elementClique = $(e.target);
      if ($elementClique.hasClass('selection-service')) {
        gestionnaireEvenements.selectionneService($elementClique);
      } else if ($elementClique.hasClass('checkbox-selection-tous-services')) {
        gestionnaireEvenements.selectionneTousServices($elementClique);
      } else if ($elementClique.hasClass('checkbox-tous-services')) {
        gestionnaireEvenements.selectionneTousServices($elementClique);
      } else if ($elementClique.hasClass('action')) {
        gestionnaireEvenements.afficheTiroirAction($elementClique);
      } else if ($elementClique.hasClass('contributeurs')) {
        const idService = $elementClique
          .parents('.ligne-service')
          .data('id-service');
        gestionnaireEvenements.afficheTiroirAction($elementClique, idService);
      } else if ($elementClique.hasClass('entete-contributeurs')) {
        gestionnaireEvenements.afficheTriCollaborateurs();
      } else if ($elementClique.hasClass('tri-collaborateur')) {
        gestionnaireEvenements.appliqueTriContributeurs();
      } else if ($elementClique.hasClass('efface-tri')) {
        $('input[name="tri-collaborateur"]').prop('checked', false);
        gestionnaireEvenements.appliqueTriContributeurs();
      }
    });

    $('.tiroir .fermeture-tiroir').on('click', () => {
      gestionnaireTiroir.basculeOuvert(false);
    });

    $('#action-duplication').on('click', () => {
      gestionnaireActionsTiroir.duplique();
    });

    $('#action-suppression').on('click', () => {
      gestionnaireActionsTiroir.supprime();
    });

    $('#action-invitation').on('click', () => {
      gestionnaireActionsTiroir.invite();
    });

    $('#action-export-csv').on('click', () => {
      gestionnaireActionsTiroir.exporteCsv();
    });
  },
  afficheTiroirAction: ($action, ...args) => {
    $('#barre-outils .action').removeClass('actif');
    $action.addClass('actif');
    gestionnaireTiroir.afficheContenuAction($action.data('action'), ...args);
    gestionnaireEvenements.fermeMenuFlottant();
  },
  afficheTriCollaborateurs: () => {
    $('.entete-contributeurs .menu-flotant').toggleClass('invisible');
  },
  appliqueTriContributeurs: () => {
    const ordre = parseInt(
      $('input[name="tri-collaborateur"]:checked').val(),
      10
    );
    const filtreEstPropriétaire = $(
      'input.filtre-proprietaire-collaborateurs'
    ).is(':checked');

    tableauDesServices.appliqueTriContributeurs(
      Number.isNaN(ordre) ? 0 : ordre,
      filtreEstPropriétaire
    );
  },
  selectionneService: ($checkbox) => {
    const selectionne = $checkbox.is(':checked');
    const idService = $checkbox.parents('.ligne-service').data('id-service');
    tableauDesServices.basculeSelectionService(idService, selectionne);
    gestionnaireEvenements.fermeMenuFlottant();
    tableauDesServices.afficheEtatSelection();
    gestionnaireTiroir.basculeOuvert(false);
  },
  selectionneTousServices: ($checkbox) => {
    const selectionne = $checkbox.is(':checked');
    $checkbox.removeClass('selection-partielle');

    $('.selection-service').each((_, input) => {
      const $checkboxService = $(input);
      tableauDesServices.basculeSelectionService(
        $checkboxService.parents('.ligne-service').data('id-service'),
        selectionne
      );
      $checkboxService.prop('checked', selectionne);
    });

    gestionnaireEvenements.fermeMenuFlottant();
    tableauDesServices.afficheEtatSelection();
    gestionnaireTiroir.basculeOuvert(false);
  },
  fermeMenuFlottant: () => {
    $('.action-lien').removeClass('actif');
    $('.conteneur-selection-services').removeClass('actif');
    $('.menu-flotant').addClass('invisible');
  },
};

export default gestionnaireEvenements;
