export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      missingTooltip:
        "Elements with the 'tooltipped' class must have either a 'data-tooltip' or 'aria-label' attribute.",
    },
  },

  create(context) {
    return {
      Tag(node) {
        const classAttribute = node.attributes.find((attribute) => attribute.key.value === 'class');

        if (!classAttribute) {
          return;
        }

        const classValue = classAttribute.value?.value ?? '';

        if (!/\btooltipped\b/.test(classValue)) {
          return;
        }

        const hasAriaLabel = node.attributes.some(
          (attribute) => attribute.key.value === 'aria-label'
        );

        const hasDataTooltip = node.attributes.some(
          (attribute) => attribute.key.value === 'data-tooltip'
        );

        if (!hasAriaLabel && !hasDataTooltip) {
          context.report({
            node: classAttribute,
            messageId: 'missingTooltip',
          });
        }
      },
    };
  },
};
