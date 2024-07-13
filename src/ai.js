const { GoogleGenerativeAI } = require("@google/generative-ai");
const { AssemblyAI } = require("assemblyai");

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const getResponseFromGemini = async (prompt = "Give some random story!") => {
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return text.trim();
};

const processPromptListAsyncly = async (promptList, queryPromptString) => {
  const chatInstance = model.startChat();
  await chatInstance.sendMessage(queryPromptString);
  for (const prompt of promptList) {
    await chatInstance.sendMessage("Store this text for now: " + prompt);
  }
  const result = await chatInstance.sendMessage("Now summarise the content of the previously sent text!");
  return result.response.text().trim();
}

const startChat = async (initialPrompt) => {
  const chatInstance = model.startChat();
  const handler = {
    sendMessage: async (prompt) => {
      try {
        const result = await chatInstance.sendMessage(prompt);
        return result.response.text().trim();
      } catch (e) {
        console.log("## error at sendMessage! ", e);
        return "Failed!";
      }
    },
    getFinalResponse: async (additionalPrompt = "") => {
      try {
        return handler.sendMessage(additionalPrompt + " Now return the final response in JSON format only. for example: { result: /*the result*/'', additionalInfo: /*additional info*/'' }. Make sure the result field is well formatted for better display.");
      } catch (e) {
        return "Failed!";
      }
    }
  }
  if (typeof initialPrompt !== "string" || initialPrompt.trim() === "") {
    await handler.sendMessage(initialPrompt);
  }
  return handler;
}

const speechToTextTranscriber = async (audioArrayBuffer) => {
    const client = new AssemblyAI({
      apiKey: process.env.ASSEMBLY_AI_API,
    });
    const transcript = await client.transcripts.transcribe({ audio: audioArrayBuffer });
    return transcript.text;
}

module.exports = { getResponseFromGemini, processPromptListAsyncly, startChat, speechToTextTranscriber };
