function getVisibleElements(validatorCallback = () => true) {
  const visibleElements = [];
  const allElements = document.body.querySelectorAll("*");
  const restrictedElements = { SCRIPT: 1, NOSCRIPT: 1, STYLE: 1 };

  allElements.forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (
      validatorCallback(element) &&
      !restrictedElements[element.tagName] &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    ) {
      visibleElements.push(element);
    }
  });

  return visibleElements;
}

function performOperations(element, opType) {
  switch (opType) {
    case "Click": {
      return element?.click();
    }
  }
}

function hexToRgb(hex) {
  // Remove the leading '#' if present
  hex = hex.replace(/^#/, '');

  // Parse the hexadecimal string into its individual RGB components
  let bigint;
  if (hex.length === 3) {
    // Handle shorthand notation (e.g., #03F)
    bigint = parseInt(hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    // Handle full notation (e.g., #0033FF)
    bigint = parseInt(hex, 16);
  } else {
    throw new Error('Invalid hex color format');
  }

  // Extract the individual RGB components
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return [r, g, b];
}

function isColorVariant(rgbColor, baseColor) {
  function rgbStringToArray(rgbString) {
    // Use a regular expression to extract the numbers from the string
    const rgbArray = rgbString.slice(rgbString.indexOf("(") + 1, rgbString.indexOf(")") - 1).split(",").map(x => +x);
    // Convert the extracted strings to numbers
    return rgbArray ? rgbArray.map(Number) : null;
  }
  // https://baeldung.com/cs/compute-similarity-of-colours
  function weightedColorDistance(rgbString1, rgbString2) {
    const rgb1 = Array.isArray(rgbString1) ? rgbString1 : rgbStringToArray(rgbString1);
    const rgb2 = Array.isArray(rgbString2) ? rgbString2 : rgbStringToArray(rgbString2);
    if (!rgb1 || !rgb2) {
      throw new Error("Invalid RGB string format");
    }
    const r1 = rgb1[0],
      g1 = rgb1[1],
      b1 = rgb1[2];
    const r2 = rgb2[0],
      g2 = rgb2[1],
      b2 = rgb2[2];
    const distance = Math.sqrt(
      ((1 || 0.3) * (r1 - r2) ** 2) + ((1 || 0.59) * (g1 - g2) ** 2) + ((1 || 0.11) * (b1 - b2) ** 2)
    );
    return distance;
  }
  // Example usage
  const distance = weightedColorDistance(rgbColor, baseColor);
  return distance < 60;
}

const RESTRICTED_ELEMENTS = { 'SCRIPT': 1, 'NOSCRIPT': 1, 'STYLE': 1, 'IFRAME': 1 };

const domUtils = {
  findElementBasedOnText: function (text = "") {
    if (!text) {
      return;
    }
    const results = getVisibleElements(function (element) {
      const elementText = element.textContent.trim().toLowerCase();
      const elementInnerText = element.innerText.trim().toLowerCase();
      const textToCompareAgainst = text.trim().toLowerCase();
      return (
        elementInnerText === textToCompareAgainst ||
        elementText === textToCompareAgainst
      );
    });
    if (results.length) {
      results.forEach(function (btnElement) {
        btnElement.style.border = "2px solid yellow";
        setTimeout(function () {
          console.log("restoring...");
          btnElement.style.border = "none";
        }, 10000);
      });
    }
    return results;
  },
  findElementBasedOnColor: function (colorName = "") {
    // TODO: This function is rather experimental! And it returning true response is not very likely everytime!
    if (!colorName) {
      return;
    }
    return getVisibleElements(function (element) {
      if (RESTRICTED_ELEMENTS[element.tagName]) {
        return false;
      }
      const elementColor = window.getComputedStyle(element).backgroundColor;
      if (elementColor === "rgba(0, 0, 0, 0)") {
        // The element has transparent background!
        return false;
      }
      if (
        elementColor.toLowerCase() === colorName.toLowerCase()
      ) {
        return true;
      }
      let processedElementColor = elementColor;
      if (processedElementColor.indexOf("rgb") === -1) {
        if (processedElementColor.indexOf("#") !== -1) {
          processedElementColor = hexToRgb(processedElementColor);
        } else {
          processedElementColor = colorMap[processedElementColor];
        }
      }
      if (isColorVariant(colorMap[colorName], processedElementColor)) {
        return true;
      }
      return false;
    });
  },
  findElementBasedOnLink: function (url) {
    if (!url) {
      return;
    }
    return getVisibleElements(function (element) {
      if (element.href === url) {
        return true;
      }
      return false;
    });
  },
  scrollPageDownByShortValue() {
    window.scrollBy(0, 500);
  },
  scrollPageUpByShortValue() {
    window.scrollBy(0, -500);
  },
  goForwardInHistory() {
    history.forward();
  },
  goBackwardInHistory() {
    history.back();
  },
  scrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
  },
  scrollToTop() {
    window.scrollTo(0, 0);
  },
  collectDataFromSiteAndPerformAnalysis() {
    function getAllTextContentWithTags() {
      function getTextContentWithTags(node, depth = 0) {
        let text = '';
        if (node.nodeType === Node.TEXT_NODE) {
            text = node.nodeValue.trim();
            if (text) {
                return `${' '.repeat(depth * 2)}${text}\n`;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && !RESTRICTED_ELEMENTS[node.tagName]) {
            let tagContent = '';
            for (let child of node.childNodes) {
                tagContent += getTextContentWithTags(child, depth + 1);
            }
            if (tagContent.trim()) { // Only include tags with non-empty content
                let tagOpen = `${' '.repeat(depth * 2)}<${node.tagName.toLowerCase()}>\n`;
                let tagClose = `${' '.repeat(depth * 2)}</${node.tagName.toLowerCase()}>\n`;
                text = tagOpen + tagContent + tagClose;
            }
        }
        return text;
      }
      return getTextContentWithTags(document.body);
    }
    const pageData = getAllTextContentWithTags();
    return askAI(pageData, "getPageDetails");
  }
};
