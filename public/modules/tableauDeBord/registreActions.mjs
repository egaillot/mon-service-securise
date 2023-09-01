import ActionContributeurs from './actions/ActionContributeurs.mjs';
import ActionDuplication from './actions/ActionDuplication.mjs';
import ActionExport from './actions/ActionExport.mjs';
import ActionInvitation from './actions/ActionInvitation.mjs';
import ActionSuppression from './actions/ActionSuppression.mjs';
import ActionTelechargement from './actions/ActionTelechargement.mjs';

const registreDesActions = {
  contributeurs: new ActionContributeurs(),
  duplication: new ActionDuplication(),
  export: new ActionExport(),
  invitation: new ActionInvitation(),
  suppression: new ActionSuppression(),
  telechargement: new ActionTelechargement(),
};

export default registreDesActions;
