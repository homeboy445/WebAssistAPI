
async function sendDataPost(url, data) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Set the content type to JSON
      },
      body: JSON.stringify(data), // Convert data to JSON string for payload
    });

    if (!response.ok) {
      throw new Error(`Error sending data: ${response.status}`);
    }

    return await response.json(); // Parse the JSON response data
  } catch (error) {
    console.error("Error sending data:", error);
    throw error; // Re-throw the error for handling
  }
}

async function askAI(prompt, route = "getOperationName") {
  return await sendDataPost("http://localhost:3000/" + route, {
    userPrompt: prompt,
  });
}

function parseGenAICodeResponse(codeString, type) {
  return codeString.replaceAll("```", "").replaceAll(type, " ");
}

async function performTaskBasedOnPrompt(prompt) {
  const result = await askAI(prompt);
  console.log("result recieved: ", result);
  debugger;
  let data;
  const parsedResponse = JSON.parse(parseGenAICodeResponse(result, "json"));
  (parsedResponse["result"] || []).forEach(({ fn, input, operation }) => {
    const foundElement = domUtils[fn]?.(input);
    if (fn === "collectDataFromSiteAndPerformAnalysis") {
      data = foundElement;
      return;
    }
    (foundElement || []).forEach(element => {
      // TODO: Change this behavior! Only execute this once!
      performOperations(element, operation);
    });
  });
  return await data;
}
