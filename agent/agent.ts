import { chatgpt } from "eve/models/openai";
import { defineAgent } from "eve";

export default defineAgent({
  model: chatgpt(),
  reasoning: "high",
});
