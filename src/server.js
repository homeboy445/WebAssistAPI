require("dotenv").config();
const express = require("express");
const {
  getResponseFromGemini,
  processPromptListAsyncly,
  startChat,
  speechToTextTranscriber,
} = require("./ai");
const {
  generatePromptForPerformingDOMOps,
  generatePromptForAnalysingPageDetails,
  generatePromptForFindingElement,
} = require("./prompts");
const cors = require("cors");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000; // Port to listen on!

app.use(express.json());

// Middleware to parse raw binary data
app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '10mb' }));


// Configure CORS options (adjust origins as needed)
const corsOptions = {
  origin: "*", // Allowed origins
  optionsSuccessStatus: 200, // Optionally customize options success status code
};

app.use(cors(corsOptions)); // Apply CORS middleware with options

app.get("/", (req, res) => {
  res.send(`<h1>The server's working fine!</h1>`);
});

app.get("/ping", (req, res) => {
  res.json("Pong!");
});

app.post("/getResponse", async (req, res) => {
  const { prompt } = req.body;
  console.log("Received a prompt: ", prompt);
  if (!prompt) {
    res.status(400).json("Empty response!");
  } else {
    try {
      const result = await getResponseFromGemini(prompt);
      res.json(result);
    } catch (e) {
      console.log(e);
      res.status(404).json("Failed!");
    }
  }
});

app.post("/getOperationName", async (req, res) => {
  const { userPrompt } = req.body;
  if (!userPrompt) {
    return res.status(400).json("Empty response!");
  }
  const resultantPrompt = generatePromptForPerformingDOMOps(userPrompt);
  // console.log("## ", resultantPrompt);
  try {
    const result = await getResponseFromGemini(resultantPrompt);
    res.json(result);
  } catch (e) {
    console.log(e);
    res.status(500).json("Failed!");
  }
});

app.post("/getPageDetails", async (req, res) => {
  const { promptList } = req.body;
  if (!promptList || !Array.isArray(promptList) || promptList.length === 0) {
    return res.status(400).json("Empty response!");
  }
  // if (!/^<body>[\s\S]*<\/body>\s*$/.test(promptList)) {
  //     return res.status(400).json("Wrong data received! HTML expected!");
  // }
  const resultantPrompt = generatePromptForAnalysingPageDetails(promptList);
  try {
    const result = await processPromptListAsyncly(promptList, resultantPrompt);
    res.json(result);
  } catch (e) {
    console.log(e);
    res.status(500).json("Failed!");
  }
});

app.post("/findElement", async (req, res) => {
  const { textArray, userPrompt } = req.body;
  if (!textArray || !userPrompt) {
    return res.status(400).json("Empty response!");
  }
  const resultantPrompt = generatePromptForFindingElement(
    textArray,
    userPrompt
  );
  // console.log("final prompt: ", resultantPrompt);
  try {
    const result = await getResponseFromGemini(resultantPrompt);
    res.json(result);
  } catch (e) {
    console.log(e);
    res.status(500).json("Failed!");
  }
});

app.post('/transcribe', async (req, res) => {
  const audioBuffer = req.body;
  if (!audioBuffer) {
    return res.status(400).json("Empty response!");
  }
  try {
    const transcribedData = await speechToTextTranscriber(audioBuffer);
    res.json({ transcribedData });
  } catch (e) {
    console.log(e);
    res.status(500).json("Failed!");
  }
});

const server = app.listen(port, () =>
  console.log(`Server listening on port ${port}`)
);

const io = socketIo(server, {
  cors: {
    origin: "*", // Allowed origins
    methods: ["GET", "POST"], // Allowed methods
    allowedHeaders: ["Content-Type"], // Allowed headers
    credentials: true, // Allow credentials
  },
});

const getChannelInfo = (type) => {
  let mainTask;
  switch (type) {
    case "summarise": {
      mainTask = "pageSummarisation";
      break;
    }
    case "query": {
      mainTask = "pageQuery";
      break;
    }
  }
  return {
    startConnection: `${mainTask}.send`,
    endConnection: `${mainTask}.response`
  };
};

const pageSummarisationChannel = getChannelInfo("summarise");
const pageQueryChannel = getChannelInfo("query");

io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });

    let chatInstance = {};
    socket.on(pageSummarisationChannel.startConnection, async (data) => {
      console.log("Received page summarisation chat data!");
      if (data.isStart) {
        console.log("starting chat!");
        chatInstance = await startChat(
          "Summarise the contents of a HTML page! Sending you the response in 1/n manner. Here you go!"
        );
      }
      await chatInstance.sendMessage(data.pageString);
      if (data.isEnd) {
        console.log("ending chat!");
        const result = await chatInstance.getFinalResponse(
          "Return the response of summarisation of the above text in the result key!"
        );
        console.log("sending final response!");
        socket.emit(pageSummarisationChannel.endConnection, { sendingData: 0, result });
        chatInstance = {};
      } else {
        socket.emit(pageSummarisationChannel.endConnection,  { sendingData: 1 });
      }
    });

    socket.on(pageQueryChannel.startConnection, async (data) => {
      console.log("Received page query chat data!");
      if (data.isStart) {
        console.log("starting chat!");
        chatInstance = await startChat(
          "Study the contents of this HTML page and answer queries based on it! Sending you the response in 1/n manner. Here you go!"
        );
      }
      await chatInstance.sendMessage(data.pageString);
      if (data.isEnd) {
        console.log("ending chat!");
        const mainQuery = data.query || "Give basic info about the page!";
        const result = await chatInstance.getFinalResponse(
          `Return the response of this query '${mainQuery}' about this page in the result key! Also, make sure to not entertain this query if this doesn't ask anything related to this website!`
        );
        console.log("sending final response!");
        socket.emit(pageQueryChannel.endConnection, { sendingData: 0, result });
        chatInstance = {};
      } else {
        socket.emit(pageQueryChannel.endConnection, { sendingData: 1 });
      }
    });
});
