<script lang="ts">
  import Bouton from '../ui/Bouton.svelte';
  import { tiroirStore } from '../ui/stores/tiroir.store';
  import TiroirDuplication from '../ui/tiroirs/TiroirDuplication.svelte';
  import TiroirExportServices from '../ui/tiroirs/TiroirExportServices.svelte';
  import type { Service } from './tableauDeBord.d';
  import TiroirTelechargementDocumentsService from '../ui/tiroirs/TiroirTelechargementDocumentsService.svelte';
  import TiroirGestionContributeurs from '../ui/tiroirs/TiroirGestionContributeurs.svelte';

  export let selection: Service[];

  $: actionsDisponibles = selection.length !== 0;
  $: selectionUnique = selection.length === 1;
  $: estProprietaireDesServicesSelectionnes = selection.every(
    (s) => s.estProprietaire
  );
  $: ontDesDocuments = selection.every((s) => s.documentsPdfDisponibles.length);
</script>

<div class="conteneur-actions" class:avec-nombre-lignes={actionsDisponibles}>
  {#if actionsDisponibles}
    {@const pluriel = selection.length > 1 ? 's' : ''}
    <span class="nombre-selection">
      {selection.length}
      ligne{pluriel}
      sélectionnée{pluriel}
    </span>
  {/if}
  <div class="boutons-actions">
    <Bouton
      titre="Gérer les contributeurs"
      icone="contributeurs"
      type="lien"
      actif={actionsDisponibles && estProprietaireDesServicesSelectionnes}
      on:click={() =>
        tiroirStore.afficheContenu(
          TiroirGestionContributeurs,
          { services: selection },
          {
            titre: 'Gérer les contributeurs',
            sousTitre: selectionUnique
              ? 'Gérer la liste des personnes invitées à contribuer au service.'
              : 'Gérer la liste des personnes invitées à contribuer aux services.',
          }
        )}
    />
    <Bouton
      titre="Télécharger PDFs"
      icone="telechargement"
      type="lien"
      actif={actionsDisponibles && selectionUnique && ontDesDocuments}
      on:click={() =>
        tiroirStore.afficheContenu(
          TiroirTelechargementDocumentsService,
          { service: selection[0] },
          {
            titre: 'Télécharger les PDF',
            sousTitre:
              "Obtenir les documents utiles à la sécurisation et à l'homologation du service sélectionné.",
          }
        )}
    />
    <Bouton
      titre="Exporter la sélection"
      icone="export"
      type="lien"
      actif={actionsDisponibles}
      on:click={() =>
        tiroirStore.afficheContenu(
          TiroirExportServices,
          { services: selection },
          {
            titre: 'Exporter la sélection',
            sousTitre: selectionUnique
              ? 'Télécharger les données du service sélectionné dans le tableau de bord.'
              : 'Télécharger la liste des services sélectionnés dans le tableau de bord.',
          }
        )}
    />
    <Bouton
      titre="Dupliquer"
      icone="copie"
      type="lien"
      actif={actionsDisponibles &&
        selectionUnique &&
        estProprietaireDesServicesSelectionnes}
      on:click={() =>
        tiroirStore.afficheContenu(
          TiroirDuplication,
          { service: selection[0] },
          {
            titre: 'Dupliquer',
            sousTitre:
              "Créer une ou plusieurs copies du services sélectionné. Cette copie n'inclut pas les données concernant son homologation.",
          }
        )}
    />
  </div>
</div>

<style>
  .conteneur-actions {
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: end;
  }

  .conteneur-actions.avec-nombre-lignes {
    justify-content: space-between;
  }

  .nombre-selection {
    font-size: 0.875rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.5rem;
    color: var(--gris-texte-additionnel);
  }

  .boutons-actions {
    display: flex;
    gap: 16px;
  }
</style>
