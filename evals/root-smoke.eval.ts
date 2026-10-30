import { defineEval } from "eve/evals";

export default defineEval({
  description: "The root agent answers a straightforward general question.",
  async test(t) {
    const turn = await t.send("Explique em uma frase para que serve um agente de IA.");
    t.succeeded();
    t.score(turn.reply?.trim() ? 1 : 0).label("reply_non_empty").gate(1);
  },
});
