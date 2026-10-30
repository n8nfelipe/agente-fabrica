import { defineEval } from "eve/evals";

export default defineEval({
  description: "Do not consult Context7 for a stable programming concept.",
  async test(t) {
    const turn = await t.send("In one sentence, what does a for loop do in programming?");
    t.succeeded();
    t.notCalledTool("context7__resolve-library-id").label("context7_not_needed");
    t.score(turn.reply?.trim() ? 1 : 0).label("reply_non_empty").gate(1);
  },
});
