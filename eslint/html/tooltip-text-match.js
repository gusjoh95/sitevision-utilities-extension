export default {
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    schema: [],
    messages: {
      tooltipMismatch:
        "The text content of the 'sr-only' element does not match the tooltip attribute.",
      syncText: "Sync 'sr-only' text with tooltip attribute",
    },
  },

  create(context) {
    const getSrOnlyNodeAndText = (tagNode) => {
      if (!tagNode.children) return null;

      for (const child of tagNode.children) {
        const classAttr = child.attributes?.find((attr) => attr.key.value === 'class');
        const classVal = classAttr?.value?.value ?? '';

        if (/\bsr-only\b/.test(classVal)) {
          const text =
            child.children
              ?.map((c) => c.value ?? '')
              .join('')
              .trim() ?? '';
          return { node: child, text };
        }

        const nested = getSrOnlyNodeAndText(child);
        if (nested !== null) return nested;
      }
      return null;
    };

    return {
      Tag(node) {
        const ariaLabelAttr = node.attributes.find((attr) => attr.key.value === 'aria-label');
        const dataTooltipAttr = node.attributes.find((attr) => attr.key.value === 'data-tooltip');

        const activeTooltipAttr = dataTooltipAttr || ariaLabelAttr;
        if (!activeTooltipAttr) return;

        const srOnlyResult = getSrOnlyNodeAndText(node);
        if (!srOnlyResult) return;

        const tooltipText = activeTooltipAttr.value?.value ?? '';

        if (tooltipText !== srOnlyResult.text) {
          context.report({
            node: activeTooltipAttr,
            messageId: 'tooltipMismatch',
            suggest: [
              {
                messageId: 'syncText',
                fix(fixer) {
                  const textNode = srOnlyResult.node.children?.[0];
                  if (!textNode) return null;
                  return fixer.replaceText(textNode, tooltipText);
                },
              },
            ],
          });
        }
      },
    };
  },
};
