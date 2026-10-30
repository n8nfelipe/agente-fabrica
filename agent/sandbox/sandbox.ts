import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";
import { defineSandbox } from "eve/sandbox";
import {
  defineSandboxProvider,
  SandboxSessionGoneError,
  SANDBOX_AGENT_ENV,
  type SandboxConnection,
} from "eve/sandbox/provider";

const workspace = join(homedir(), "workspace");
const image = `ghcr.io/vercel/eve:${process.env.EVE_SANDBOX_IMAGE_TAG?.trim() || "dockerfile-fc0279bf1664"}`;
const hostUser = typeof process.getuid === "function" && typeof process.getgid === "function"
  ? `${process.getuid()}:${process.getgid()}`
  : undefined;
mkdirSync(workspace, { recursive: true });

function docker(args: readonly string[], options: { signal?: AbortSignal; stdin?: Uint8Array } = {}) {
  const child = spawn(process.env.EVE_DOCKER_PATH || "docker", args, {
    signal: options.signal,
    stdio: [options.stdin !== undefined ? "pipe" : "ignore", "pipe", "pipe"],
  });
  if (options.stdin !== undefined) child.stdin!.end(options.stdin);
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout!.on("data", (chunk: Buffer) => stdout.push(chunk));
  child.stderr!.on("data", (chunk: Buffer) => stderr.push(chunk));
  return new Promise<{ exitCode: number; stdout: Buffer; stderr: Buffer }>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve({
      exitCode: code ?? 1,
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr),
    }));
  });
}

function dockerStream(args: readonly string[], options: { signal?: AbortSignal; stdin?: boolean }) {
  const child = spawn(process.env.EVE_DOCKER_PATH || "docker", args, {
    signal: options.signal,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (!options.stdin) child.stdin!.end();
  const exited = new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
  void exited.catch(() => {});
  return {
    ...(options.stdin ? { stdin: Writable.toWeb(child.stdin!) as WritableStream<Uint8Array> } : {}),
    stdout: Readable.toWeb(child.stdout!) as ReadableStream<Uint8Array>,
    stderr: Readable.toWeb(child.stderr!) as ReadableStream<Uint8Array>,
    async wait() { return { exitCode: await exited }; },
    async kill() { child.kill("SIGKILL"); await exited.catch(() => {}); },
  };
}

function nameFor(sessionId: string) {
  return `eve-workspace-${createHash("sha256").update(sessionId).digest("hex").slice(0, 24)}`;
}

function assertDockerSuccess(result: { exitCode: number; stderr: Buffer }, action: string) {
  if (result.exitCode !== 0) throw new Error(result.stderr.toString("utf8") || `Docker failed to ${action}`);
}

function connect(container: string): SandboxConnection {
  return {
    workspaceRoot: "/workspace",
    async spawn({ command, env, signal, stdin, workingDirectory }) {
      const args = ["exec", ...(stdin ? ["-i"] : []), "-w", workingDirectory];
      for (const [key, value] of Object.entries({ ...SANDBOX_AGENT_ENV, ...env })) args.push("-e", `${key}=${value}`);
      args.push(container, "/bin/bash", "-lc", command);
      return dockerStream(args, { signal, stdin });
    },
    async readFile({ path, signal }) {
      const result = await docker(["exec", container, "/bin/sh", "-c", 'test -f "$1" && cat "$1"', "sh", path], { signal });
      if (result.exitCode !== 0) {
        const exists = await docker(["exec", container, "/bin/sh", "-c", 'test -e "$1"', "sh", path], { signal });
        if (exists.exitCode !== 0 && exists.stderr.length === 0) return null;
        if (exists.exitCode !== 0) throw new Error(exists.stderr.toString("utf8"));
        throw new Error(`Cannot read sandbox file: ${path}`);
      }
      return result.stdout;
    },
    async writeFiles({ files, signal }) {
      for (const file of files) {
        const result = await docker(["exec", "-i", container, "/bin/sh", "-c", 'mkdir -p "$(dirname "$1")" && cat > "$1"', "sh", file.path], { signal, stdin: file.content });
        if (result.exitCode !== 0) throw new Error(result.stderr.toString("utf8") || `Cannot write sandbox file: ${file.path}`);
      }
    },
    async removePath({ path, force, recursive, signal }) {
      const result = await docker(["exec", container, "/bin/rm", ...(recursive ? ["-r"] : []), ...(force ? ["-f"] : []), "--", path], { signal });
      if (result.exitCode !== 0) throw new Error(result.stderr.toString("utf8") || `Cannot remove sandbox path: ${path}`);
    },
    async stop() {
      assertDockerSuccess(await docker(["stop", "-t", "0", container]), `stop ${container}`);
    },
  };
}

const provider = defineSandboxProvider({
  name: "local-docker-workspace",
  stateProtocolVersion: 2,
  environment() {
    return {
      async prepare(ctx) {
        ctx.log(`pulling ${image}`);
        const result = await docker(["pull", image]);
        if (result.exitCode !== 0) throw new Error(result.stderr.toString("utf8") || `Could not pull ${image}`);
        return { image };
      },
      async start(ctx, _options, artifact) {
        const name = nameFor(ctx.session.id);
        const existing = await docker(["container", "inspect", "--format", "{{.State.Running}}", name]);
        if (existing.exitCode !== 0) {
          const result = await docker([
            "run", "-d", "--name", name,
            ...(hostUser ? ["--user", hostUser] : []),
            "--mount", `type=bind,src=${workspace},dst=/workspace`,
            "--workdir", "/workspace", "--entrypoint", "/bin/sh", artifact.image, "-c", "sleep 2147483647",
          ]);
          if (result.exitCode !== 0) {
            const raced = await docker(["container", "inspect", "--format", "{{.State.Running}}", name]);
            if (raced.exitCode !== 0) assertDockerSuccess(result, `start ${name}`);
            if (raced.stdout.toString("utf8").trim() !== "true") assertDockerSuccess(await docker(["start", name]), `restart ${name}`);
          }
        } else if (existing.stdout.toString("utf8").trim() !== "true") {
          const result = await docker(["start", name]);
          if (result.exitCode !== 0) throw new Error(result.stderr.toString("utf8") || `Could not restart ${name}`);
        }
        return { connection: connect(name), state: { name, version: 1 } };
      },
      async resume(_ctx, _artifact, state) {
        const inspect = await docker(["container", "inspect", "--format", "{{.State.Running}}", state.name]);
        if (inspect.exitCode !== 0) {
          const error = inspect.stderr.toString("utf8");
          if (/no such (?:container|object)/iu.test(error)) throw new SandboxSessionGoneError(`Docker sandbox ${state.name} no longer exists.`);
          throw new Error(error || `Could not inspect ${state.name}`);
        }
        if (inspect.stdout.toString("utf8").trim() !== "true") assertDockerSuccess(await docker(["start", state.name]), `restart ${state.name}`);
        return connect(state.name);
      },
      async onSessionEnd(ctx, state) {
        const result = await docker(["rm", "-f", state?.name ?? nameFor(ctx.session.id)]);
        if (result.exitCode !== 0 && !/no such (?:container|object)/iu.test(result.stderr.toString("utf8"))) {
          assertDockerSuccess(result, "remove the sandbox container");
        }
      },
    };
  },
});

export const environment = provider.environment();
export default defineSandbox(() => environment.open());
