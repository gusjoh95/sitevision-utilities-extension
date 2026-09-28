import { registerTabWatchers } from './modules/tabWatchers.js';
import { registerChangelogOnUpdate } from './modules/openChangelogOnUpdate.js';
import { registerBeforeUnloadGuard } from './modules/beforeUnloadGuard.js';

registerTabWatchers();
registerChangelogOnUpdate();
registerBeforeUnloadGuard();
