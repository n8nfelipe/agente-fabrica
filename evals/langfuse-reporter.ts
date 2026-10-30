import { randomUUID } from "node:crypto";
import type { EvalReporter } from "eve/evals/reporters";

export function langfuseReporter(): EvalReporter {
  let credentials:
    | { publicKey: string; secretKey: string; baseUrl: string }
    | undefined;

  return {
    onRunStart() {
      const { LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY } = process.env;
      if (!LANGFUSE_PUBLIC_KEY || !LANGFUSE_SECRET_KEY) {
        console.warn(
          "Langfuse reporting skipped; set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY.",
        );
        return;
      }

      credentials = {
        publicKey: LANGFUSE_PUBLIC_KEY,
        secretKey: LANGFUSE_SECRET_KEY,
        baseUrl: (
          process.env.LANGFUSE_BASE_URL ??
          process.env.LANGFUSE_HOST ??
          "https://cloud.langfuse.com"
        ).replace(/\/+$/, ""),
      };
    },
    onRunComplete() {},
    async onEvalComplete(result, context) {
      if (!credentials) return;

      const trace = context?.traceContexts.find(({ primary }) => primary);
      const sessionId = trace?.sessionId ?? result.result.sessionId;
      if (!trace?.traceId && !sessionId) {
        console.warn(
          `Langfuse reporting skipped for eval ${result.id}; eve did not provide a traceId or sessionId.`,
        );
        return;
      }

      const target = trace?.traceId ? { traceId: trace.traceId } : { sessionId };
      const metadata = {
        evalId: result.id,
        attempt: result.attempt ?? 1,
        verdict: result.verdict,
      };
      const scores = [
        {
          ...target,
          id: randomUUID(),
          name: "eval_passed",
          value: result.verdict === "passed" ? 1 : 0,
          dataType: "BOOLEAN",
          metadata,
        },
        ...result.assertions.flatMap((assertion) =>
          assertion.score === undefined
            ? []
            : [
                {
                  ...target,
                  id: randomUUID(),
                  name: `eval_${(assertion.key ?? assertion.name)
                    .toLowerCase()
                    .replace(/[^a-z0-9_-]+/g, "_")}`,
                  value: assertion.score,
                  dataType: "NUMERIC",
                  comment: assertion.message,
                  metadata: {
                    ...metadata,
                    threshold: assertion.threshold,
                    passed: assertion.passed,
                    severity: assertion.severity,
                  },
                },
              ],
        ),
      ];

      const response = await fetch(`${credentials.baseUrl}/api/public/scores`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${credentials.publicKey}:${credentials.secretKey}`,
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scores),
      });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          `Langfuse score upload failed with HTTP ${response.status}: ${details}`,
        );
      }
    },
  };
}
