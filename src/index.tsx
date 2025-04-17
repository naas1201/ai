import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { renderer } from "./renderer";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { Ai } from "@cloudflare/workers-types";

type Bindings = {
  AI: Ai;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(renderer);

app.get("/", (c) => {
  // Render the main chat interface
  return c.render(
    <>
      {/* Use chat-container for overall structure, centering, and background */}
      <div className="chat-container">
        {/* Message display area */}
        <div
          id="chat-history"
          // Use message-list for specific styling, keep functional classes/ID
          // Removed p-6, space-y-4, bg-white (handled by CSS now)
          className="message-list flex-1 overflow-y-auto flex flex-col-reverse messages-container"
        >
          {/* Messages will be dynamically inserted here by script.js */}
          {/* Example Initial Message (Optional) */}
          {/*
          <div class="message-assistant">
            <span class="message-content">Hello! I'm your AI Teacher. Ask me anything!</span>
            <span class="message-model">(Model: TeacherBot 1.0)</span>
          </div>
          */}
        </div>

        {/* Input area */}
        {/* Use chat-input-area for styling */}
        <div className="chat-input-area">
          <form className="flex items-center w-full" id="chat-form">
            {/* Removed Tailwind classes handled by .chat-input-area textarea in CSS */}
            <textarea
              id="message-input"
              className="flex-grow" // Keep flex-grow for layout
              placeholder="Type a message..."
              rows={2} // Example starting rows
            ></textarea>
            {/* Removed Tailwind classes handled by .chat-input-area button in CSS */}
            <button type="submit">
              Send
            </button>
          </form>
          {/* Model display and hidden input remain for potential JS use */}
          <div className="text-xs text-gray-500 mt-1 text-center w-full"> {/* Centered text */}
            <p className="model-display">-</p>
            {/* This hidden input seems intended to ensure Tailwind generates these classes */}
            <input
              type="hidden"
              className="message-user message-assistant message-model"
            />
          </div>
        </div>
      </div>
      {/* Settings Panel Div REMOVED */}

      {/* Include the script for dynamic chat functionality */}
      <script src="/static/script.js"></script>
    </>
  );
});

app.post("/api/chat", async (c) => {
  const payload = await c.req.json();
  const messages = [...payload.messages];

  // Prepend the systemMessage - Keep using system message if provided via payload
  // Note: The UI to *set* this is removed, but the API can still accept it.
  // You might set a default system message here if needed.
  const systemMessage = payload?.config?.systemMessage || "You are a helpful AI Teacher."; // Example default
  messages.unshift({ role: "system", content: systemMessage });


  // Default model if not specified in payload (UI removed)
  const model = payload?.config?.model || "@cf/meta/llama-3-8b-instruct"; // Example default

  console.log("Using Model:", model);
  // console.log("Messages", JSON.stringify(messages));

  let eventSourceStream;
  let retryCount = 0;
  let successfulInference = false;
  let lastError;
  const MAX_RETRIES = 3;

  while (successfulInference === false && retryCount < MAX_RETRIES) {
    try {
      eventSourceStream = (await c.env.AI.run(model, { // Use the determined model
        messages,
        stream: true,
      })) as ReadableStream;
      successfulInference = true;
    } catch (err) {
      lastError = err;
      retryCount++;
      console.error(err);
      console.log(`Retrying #${retryCount}...`);
    }
  }

  if (eventSourceStream === undefined) {
    if (lastError) {
      // Consider sending a user-friendly error message back
      console.error("AI inference failed after retries:", lastError);
      // Hono context 'c' might allow setting status and returning an error JSON
      c.status(500);
      return c.json({ error: "Failed to get response from AI model." });
      // throw lastError; // Or re-throw if higher level handler exists
    }
    // throw new Error(`Problem with model`); // Generic error
     c.status(500);
     return c.json({ error: "Failed to get response from AI model after retries." });
  }

  // EventSource stream is handy for local event sources, but we want to just stream text
  const tokenStream = eventSourceStream
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream());

  return streamText(c, async (stream) => {
    // Optionally send the model name back to the client at the start of the stream?
    // stream.write(`MODEL:${model}\n`); // Example custom protocol
    for await (const msg of tokenStream) {
      if (msg.data !== "[DONE]") {
        try {
           const data = JSON.parse(msg.data);
           if (data.response) { // Check if response field exists
             stream.write(data.response);
           }
        } catch(e) {
            console.error("Failed to parse AI stream data:", msg.data, e);
            // Decide how to handle parse errors, maybe ignore?
        }
      }
    }
  });
});

export default app;
