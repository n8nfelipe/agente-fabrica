import { defineAgent } from "eve";
import { chatgpt } from "eve/models/openai";

export default defineAgent({
  description:
    "Especialista em desenvolvimento backend, padrões de código, testes unitários e segurança de software. Consulte este agente antes de qualquer implementação ou revisão backend; ele pode pesquisar documentação e práticas atuais.",
  model: chatgpt(),
  reasoning: "high",
});
