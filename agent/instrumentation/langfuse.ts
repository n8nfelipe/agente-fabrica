import { LangfuseSpanProcessor, isDefaultExportSpan } from "@langfuse/otel";
import { otelIntegration } from "eve/instrumentation/otel";

export default otelIntegration({
  spanProcessors: [
    new LangfuseSpanProcessor({
      shouldExportSpan: ({ otelSpan }) =>
        isDefaultExportSpan(otelSpan) ||
        ["gen_ai", "eve"].includes(otelSpan.instrumentationScope.name),
    }),
  ],
});
