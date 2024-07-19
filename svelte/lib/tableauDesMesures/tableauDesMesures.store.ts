import { derived, writable } from 'svelte/store';
import type {
  MesureGenerale,
  Mesures,
  MesureSpecifique,
} from './tableauDesMesures.d';
import { Referentiel } from '../ui/types.d';
import {
  IdReferentiel,
  rechercheParReferentiel,
} from './storesDeRecherche/rechercheParReferentiel.store';
import { rechercheTextuelle } from './storesDeRecherche/rechercheTextuelle.store';
import { rechercheParCategorie } from './storesDeRecherche/rechercheParCategorie.store';

const mesuresParDefaut = (): Mesures => ({
  mesuresGenerales: {},
  mesuresSpecifiques: [],
});

const { subscribe, set, update } = writable<Mesures>(mesuresParDefaut());

export const mesures = {
  set,
  subscribe,
  reinitialise: (mesures?: Mesures) => set(mesures ?? mesuresParDefaut()),
  metAJourStatutMesureGenerale: (idMesure: string, statut: string) =>
    update((valeur) => {
      valeur.mesuresGenerales[idMesure].statut = statut;
      return valeur;
    }),
  metAJourStatutMesureSpecifique: (idMesure: number, statut: string) =>
    update((valeur) => {
      valeur.mesuresSpecifiques[idMesure].statut = statut;
      return valeur;
    }),
};

const contientEnMinuscule = (champ: string | undefined, recherche: string) =>
  champ ? champ.toLowerCase().includes(recherche.toLowerCase()) : false;
const estMesureGenerale = (
  mesure: MesureSpecifique | MesureGenerale
): mesure is MesureGenerale =>
  //   On utilise ici un typeguard, et on se base sur une propriété qui est uniquement présente dans les mesures générales
  'descriptionLongue' in mesure && mesure.descriptionLongue !== undefined;

enum IdFiltre {
  rechercheTextuelle,
  rechercheCategorie,
  rechercheReferentiel,
}
type Filtre = (mesure: MesureSpecifique | MesureGenerale) => boolean;
type FiltresPredicats = Record<IdFiltre, Filtre>;

type Predicats = { actifs: IdFiltre[]; filtres: FiltresPredicats };
export const predicats = derived<
  [
    typeof rechercheTextuelle,
    typeof rechercheParCategorie,
    typeof rechercheParReferentiel,
  ],
  Predicats
>(
  [rechercheTextuelle, rechercheParCategorie, rechercheParReferentiel],
  ([$rechercheTextuelle, $rechercheCategorie, $rechercheReferentiel]) => {
    const actifs = [];
    if ($rechercheTextuelle) actifs.push(IdFiltre.rechercheTextuelle);
    if ($rechercheCategorie.length > 0)
      actifs.push(IdFiltre.rechercheCategorie);
    if ($rechercheReferentiel.length > 0)
      actifs.push(IdFiltre.rechercheReferentiel);

    return {
      actifs,
      filtres: {
        [IdFiltre.rechercheTextuelle]: (
          mesure: MesureSpecifique | MesureGenerale
        ) =>
          contientEnMinuscule(mesure.description, $rechercheTextuelle) ||
          contientEnMinuscule(
            (mesure as MesureGenerale).descriptionLongue,
            $rechercheTextuelle
          ) ||
          contientEnMinuscule(mesure.identifiantNumerique, $rechercheTextuelle),
        [IdFiltre.rechercheCategorie]: (
          mesure: MesureSpecifique | MesureGenerale
        ) => $rechercheCategorie.includes(mesure.categorie),
        [IdFiltre.rechercheReferentiel]: (
          mesure: MesureSpecifique | MesureGenerale
        ) =>
          ($rechercheReferentiel.includes(IdReferentiel.MesureAjoutee) &&
            !estMesureGenerale(mesure)) ||
          ($rechercheReferentiel.includes(IdReferentiel.ANSSIIndispensable) &&
            estMesureGenerale(mesure) &&
            mesure.indispensable &&
            mesure.referentiel === Referentiel.ANSSI) ||
          ($rechercheReferentiel.includes(IdReferentiel.CNIL) &&
            estMesureGenerale(mesure) &&
            mesure.referentiel === Referentiel.CNIL) ||
          ($rechercheReferentiel.includes(IdReferentiel.ANSSIRecommandee) &&
            estMesureGenerale(mesure) &&
            !mesure.indispensable &&
            mesure.referentiel === Referentiel.ANSSI),
      },
    };
  }
);

export const mesuresFiltrees = derived<
  [typeof mesures, typeof predicats],
  Mesures
>([mesures, predicats], ([$mesures, $predicats]) => ({
  mesuresGenerales: Object.entries($mesures.mesuresGenerales)
    .filter(([_, m]) =>
      $predicats.actifs
        .map((idPredicat: IdFiltre) => $predicats.filtres[idPredicat])
        .every((p: Filtre) => p(m))
    )
    .reduce((record, [cle, valeur]) => ({ ...record, [cle]: valeur }), {}),
  mesuresSpecifiques: $mesures.mesuresSpecifiques.filter((m) =>
    $predicats.actifs
      .map((idPredicat: IdFiltre) => $predicats.filtres[idPredicat])
      .every((p: Filtre) => p(m))
  ),
}));

type NombreResultats = {
  total: number;
  filtrees: number;
  aucunResultat: boolean;
  aDesFiltresAppliques: boolean;
};
export const nombreResultats = derived<
  [
    typeof mesures,
    typeof mesuresFiltrees,
    typeof rechercheParReferentiel,
    typeof rechercheParCategorie,
  ],
  NombreResultats
>(
  [mesures, mesuresFiltrees, rechercheParReferentiel, rechercheParCategorie],
  ([
    $mesures,
    $mesuresFiltrees,
    $rechercheReferentiel,
    $rechercheCategorie,
  ]) => {
    const nbMesuresGenerales = Object.keys($mesures.mesuresGenerales).length;
    const nbMesuresSpecifiques = $mesures.mesuresSpecifiques.length;
    const nbMesuresTotal = nbMesuresGenerales + nbMesuresSpecifiques;
    const nbMesuresGeneralesFiltrees = Object.keys(
      $mesuresFiltrees.mesuresGenerales
    ).length;
    const nbMesuresSpecifiquesFiltrees =
      $mesuresFiltrees.mesuresSpecifiques.length;
    const nbMesuresFiltreesTotal =
      nbMesuresGeneralesFiltrees + nbMesuresSpecifiquesFiltrees;
    return {
      total: nbMesuresTotal,
      filtrees: nbMesuresFiltreesTotal,
      aucunResultat: nbMesuresFiltreesTotal === 0,
      aDesFiltresAppliques:
        $rechercheReferentiel.length > 0 || $rechercheCategorie.length > 0,
    };
  }
);
