import { defineEvalConfig } from "eve/evals";
import { langfuseReporter } from "./langfuse-reporter.js";

export default defineEvalConfig({ reporters: [langfuseReporter()] });
