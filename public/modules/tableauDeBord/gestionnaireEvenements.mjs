import gestionnaireBarreOutils from './gestionnaireBarreOutils.mjs';
import { gestionnaireTiroir } from './gestionnaireTiroir.mjs';
import registreDesActions from './registreActions.mjs';
import tableauDesServices, { ORDRE_DE_TRI } from './tableauDesServices.mjs';

const gestionnaireEvenements = {
  brancheComportement: () => {
    $('#recherche-service').on('input', (e) => {
      tableauDesServices.effaceSelection();
      tableauDesServices.modifieRecherche($(e.target).val());
    });

    $('.tableau-services thead th.triable').on('click', (e) => {
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
        gestionnaireEvenements.triContributeurs.bascule();
      } else if ($elementClique.hasClass('tri-contributeur')) {
        gestionnaireEvenements.triContributeurs.applique();
      } else if ($elementClique.hasClass('filtre-contributeur')) {
        tableauDesServices.effaceSelection();
        gestionnaireEvenements.triContributeurs.applique();
      } else if ($elementClique.hasClass('efface-tri-contributeurs')) {
        $('input[name="tri-contributeur"]').prop('checked', false);
        gestionnaireEvenements.triContributeurs.applique();
      }
    });

    $('.tiroir .fermeture-tiroir').on('click', () => {
      gestionnaireTiroir.basculeOuvert(false);
    });

    $('#action-duplication').on('click', () => {
      registreDesActions.duplication
        .execute()
        .then(() => gestionnaireTiroir.basculeOuvert(false))
        .catch(() => {});
    });

    $('#action-suppression').on('click', () => {
      registreDesActions.suppression
        .execute()
        .then(() => gestionnaireTiroir.basculeOuvert(false));
    });

    $('#action-invitation').on('click', () =>
      registreDesActions.invitation
        .execute()
        .then(() =>
          gestionnaireTiroir.afficheContenuAction('invitation-confirmation')
        )
    );

    $('#action-export-csv').on('click', () =>
      registreDesActions.export.execute()
    );
  },
  afficheTiroirAction: ($action, ...args) => {
    $('#barre-outils .action').removeClass('actif');
    $action.addClass('actif');
    gestionnaireTiroir.afficheContenuAction($action.data('action'), ...args);
    gestionnaireEvenements.fermeMenuFlottant();
  },
  triContributeurs: {
    applique: () => {
      const ordre = ORDRE_DE_TRI.depuisString(
        $('input[name="tri-contributeur"]:checked').val()
      );

      const filtreEstProprietaire = $(
        'input.filtre-proprietaire-contributeurs'
      ).is(':checked');

      $('.entete-contributeurs')
        .attr('data-ordre', ordre)
        .attr('data-filtre-proprietaire', filtreEstProprietaire);

      tableauDesServices.appliqueTriContributeurs(ordre, filtreEstProprietaire);
    },
    bascule: () =>
      $('.entete-contributeurs .menu-flotant').toggleClass('invisible'),
  },
  selectionneService: ($checkbox) => {
    const selectionne = $checkbox.is(':checked');
    const idService = $checkbox.parents('.ligne-service').data('id-service');
    tableauDesServices.basculeSelectionService(idService, selectionne);
    gestionnaireEvenements.fermeMenuFlottant();
    tableauDesServices.afficheEtatSelection();
    gestionnaireBarreOutils.afficheOutils();
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
    gestionnaireBarreOutils.afficheOutils();
    gestionnaireTiroir.basculeOuvert(false);
  },
  fermeMenuFlottant: () => {
    $('.action-lien').removeClass('actif');
    $('.conteneur-selection-services').removeClass('actif');
    $('.menu-flotant').addClass('invisible');
  },
};

export default gestionnaireEvenements;
