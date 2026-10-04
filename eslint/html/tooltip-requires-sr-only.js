export default {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      missingSrOnly:
        "Elements with a 'data-tooltip' attribute should contain a descendant with the 'sr-only' class or an 'aria-label' attribute.",
    },
  },

  create(context) {
    const hasSrOnlyDescendant = (tagNode) => {
      if (!tagNode.children) {
        return false;
      }

      return tagNode.children.some((child) => {
        const classAttr = child.attributes?.find((attr) => attr.key.value === 'class');
        const classVal = classAttr?.value?.value ?? '';

        if (/\bsr-only\b/.test(classVal)) {
          return true;
        }

        return hasSrOnlyDescendant(child);
      });
    };

    return {
      Tag(node) {
        const dataTooltipAttr = node.attributes.find(
          (attribute) => attribute.key.value === 'data-tooltip'
        );

        if (!dataTooltipAttr) {
          return;
        }

        // Check if the element has an aria-label attribute
        const hasAriaLabel = node.attributes.some(
          (attribute) => attribute.key.value === 'aria-label'
        );

        // Only report if both aria-label and sr-only descendant are missing
        if (!hasAriaLabel && !hasSrOnlyDescendant(node)) {
          context.report({
            node: dataTooltipAttr,
            messageId: 'missingSrOnly',
          });
        }
      },
    };
  },
};
