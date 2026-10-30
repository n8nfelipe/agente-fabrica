import { defineEval } from "eve/evals";

export default defineEval({
  description: "Consult Context7 for current React API documentation.",
  async test(t) {
    const turn = await t.send(
      "Using the current React documentation, explain the useActionState hook and show its import path.",
    );
    t.succeeded();
    t.calledTool("context7__resolve-library-id").label("context7_library_resolved");
    t.calledTool("context7__query-docs").label("context7_docs_queried");
    t.score(turn.reply?.trim() ? 1 : 0).label("reply_non_empty").gate(1);
  },
});
