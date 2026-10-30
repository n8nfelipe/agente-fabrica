import { defineEval } from "eve/evals";

export default defineEval({
  description: "The root agent consults the backend specialist for a backend review.",
  async test(t) {
    const turn = await t.send(
      "Revise a implementação backend existente neste projeto. Se não houver backend, diga isso. Consulte o especialista backend e apenas relate os achados; não altere arquivos.",
    );
    t.succeeded();
    t.calledAgent("backend_specialist", { status: "completed" });
    t.score(turn.reply?.trim() ? 1 : 0).label("reply_non_empty").gate(1);
  },
});
