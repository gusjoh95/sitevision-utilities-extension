import { registerTabWatchers } from './modules/tabWatchers.js';
import { registerChangelogOnUpdate } from './modules/openChangelogOnUpdate.js';
import { registerBeforeUnloadGuardCleanup } from './modules/beforeUnloadGuardCleanup.js';

registerTabWatchers();
registerChangelogOnUpdate();
registerBeforeUnloadGuardCleanup();
