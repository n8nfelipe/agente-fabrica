import { defineMemory } from "eve/memory";
import { fileMemory } from "eve/memory/file";
import { byPrincipal } from "eve/memory/scope";
import { sqliteMemoryBackend } from "../lib/sqlite-memory-backend";

const provider = process.env.VERCEL
  ? fileMemory()
  : fileMemory({ backend: sqliteMemoryBackend() });

export default defineMemory({
  description: "Preferências estáveis e fatos duráveis úteis em conversas futuras com este usuário.",
  provider,
  scope: byPrincipal,
});
