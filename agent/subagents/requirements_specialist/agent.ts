import { defineAgent } from "eve";
import { chatgpt } from "eve/models/openai";

export default defineAgent({
  description:
    "Especialista em requisitos de sistema e documentação funcional. Lê o código existente de frontend e backend para descrever o comportamento atual e produz especificações detalhadas com regras de negócio, fluxos alternativos, exceções, critérios de aceite e lacunas a esclarecer antes da implementação.",
  model: chatgpt(),
  reasoning: "high",
});
