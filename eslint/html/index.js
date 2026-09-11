import tooltipRequiresNestedSrOnly from './tooltip-requires-sr-only.js';
import tooltipTextMatch from './tooltip-text-match.js';

export default {
  rules: {
    'tooltip-requires-nested-sronly': tooltipRequiresNestedSrOnly,
    'tooltip-text-match': tooltipTextMatch,
  },
  configs: {
    recommended: {
      rules: {
        'custom/tooltip-requires-nested-sronly': 'warn',
        'custom/tooltip-text-match': 'warn',
      },
    },
  },
};
