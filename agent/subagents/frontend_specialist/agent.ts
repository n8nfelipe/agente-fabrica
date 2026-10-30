import { defineAgent } from "eve";
import { chatgpt } from "eve/models/openai";

export default defineAgent({
  description:
    "Especialista em desenvolvimento frontend, design de interfaces, acessibilidade e padrões de código. Consulte este agente antes de qualquer implementação ou revisão frontend; ele pode pesquisar referências atuais na web.",
  model: chatgpt(),
  reasoning: "high",
});
