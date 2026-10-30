import { defineEval } from "eve/evals";

export default defineEval({
  description: "The root agent consults the frontend specialist for a frontend review.",
  async test(t) {
    const turn = await t.send(
      "Revise a interface frontend existente neste projeto. Se não houver interface, diga isso. Consulte o especialista frontend e apenas relate os achados; não altere arquivos.",
    );
    t.succeeded();
    t.calledAgent("frontend_specialist", { status: "completed" });
    t.score(turn.reply?.trim() ? 1 : 0).label("reply_non_empty").gate(1);
  },
});
