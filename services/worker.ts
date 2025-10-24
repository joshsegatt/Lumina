import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// This is the entry point for the web worker.
// It's a boilerplate file required by the WebLLM library to run the
// AI model in a background thread.
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
