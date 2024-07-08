const DOM_Functionality_Config = {
  elementFinderFunctions: [
    "findAndClickOnElementBasedOnText",
    "findAndClickElementBasedOnColor",
    "findAndClickElementBasedOnLink",
    "findElementOnThePageGloballyByText",
    "scrollPageDownByShortValue",
    "scrollPageUpByShortValue",
    "goForwardInHistory",
    "goBackwardInHistory",
    "scrollToBottom",
    "scrollToTop",
    "collectSiteDataAndProcessContent"
  ],
  elementOperators: ["Click", "Scroll"],
};

const generatePromptForPerformingDOMOps = (currentPrompt) => {
  const stringifiedJSObj = JSON.stringify(DOM_Functionality_Config);
  const promptText = `
          Your task is to decipher from the text the intention of the user - if it is a DOM/HTML operation or a general find operation (it can be anything, like 'clicking on a button', 'scrolling the page', 'clicking a button based on color', "find any text's occurrence in the website" etc.), try to match it with the most likely function provided below
          and return the response in chained manner, i.e first return element finders, and its operation type. Here's it: "${currentPrompt}".
          If any appropriate match exists, return the appropriate output object from this JS object: ${stringifiedJSObj} containing the function name & operator, Example,  { result: [{ fn: findElementBasedOnText, input: 'Button text', operation: ''/*operation name*/, elementType: ''/*element type*/ }], additionalInfo: "Anything you'd like to let me know!" }
          Return operation as 'scrollIntoView' in case it doesn't match any other operation. Fill these object keys as applicable and keep them empty if not applicable. If not, return an empty array.
          Note: your response should only be a JSON response. Not plain text whatsover, example response: { result: [], additionalInfo: "Anything you'd like to let me know!" } Also, if the user is trying to perform any activity that didn't match any function, return the empty response!`;
  return promptText;
};

const generatePromptForAnalysingPageDetails = (currentPrompt) => {
  const promptText = `Your task is to analyze the HTML of a website. Summarise the details about the page by gaining context from it HTML.
  Also return things (basically advices for the user) that can be done with these details.`
  return promptText;
};

const generatePromptForFindingElement = (textArray, currentPrompt) => {
  const promptText = `Your task is to find the matching element from this JS array: ${JSON.stringify(textArray)}.
  The user wants to find an element based on the text "${currentPrompt}" (keeping the languages same). Return the index of the closest matching element logically.
  The output should be a JSON object, like so: { idx: 0, additionalInfo: "Anything you'd like to let me know!"}
  If nothing is found return { idx: -1, additionalInfo: "No matching element found!" }.`;
  return promptText;
}

module.exports = { generatePromptForPerformingDOMOps, generatePromptForAnalysingPageDetails, generatePromptForFindingElement };
