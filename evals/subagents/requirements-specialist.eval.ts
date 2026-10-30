import { defineEval } from "eve/evals";

export default defineEval({
  description: "The root agent consults the requirements specialist for a requirements review.",
  async test(t) {
    const turn = await t.send(
      "Consulte o especialista de requisitos para avaliar esta solicitação hipotética: permitir que usuários filtrem uma lista por status. Resuma regras, fluxos alternativos e lacunas nesta resposta; não crie nem altere arquivos.",
    );
    t.succeeded();
    t.calledAgent("requirements_specialist", { status: "completed" });
    t.score(turn.reply?.trim() ? 1 : 0).label("reply_non_empty").gate(1);
  },
});
