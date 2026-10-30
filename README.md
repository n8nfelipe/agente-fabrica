# meu-agente

Agente de uso geral desenvolvido com [eve](https://eve.dev), framework da Vercel para agentes duráveis. O agente principal responde a solicitações, consulta documentação técnica atual quando necessário e encaminha trabalhos especializados aos subagentes configurados.

## Como o agente trabalha

- **Agente principal:** usa o modelo `chatgpt()` com nível de raciocínio `high`. Suas regras de comportamento, segurança e autorização estão em [`agent/instructions.md`](agent/instructions.md).
- **Especialista frontend (`frontend_specialist`):** apoia implementação e revisão de interfaces, acessibilidade, design e qualidade de código.
- **Especialista backend (`backend_specialist`):** apoia implementação e revisão backend, testes, padrões de código e segurança.
- **Especialista de requisitos (`requirements_specialist`):** analisa requisitos, fluxos, regras de negócio, exceções, critérios de aceite e lacunas. As especificações que produzir devem ser salvas em `docs/`.

O agente consulta Context7 para documentação atual de bibliotecas e serviços. A conexão principal está em `agent/connections/context7.ts`; o especialista backend tem sua própria conexão. `CONTEXT7_API_KEY` é opcional no código: quando definida, é enviada ao serviço.

A extensão de automodificação local está configurada, mas desativada (`enabled: false`).

## Requisitos

- Node.js 24 ou superior, conforme `package.json`.
- pnpm.
- Docker disponível para o sandbox local configurado em `agent/sandbox/sandbox.ts`.
- Credenciais de modelo configuradas conforme o ambiente eve/Vercel utilizado.

## Instalação e desenvolvimento

Instale as dependências e inicie o ambiente de desenvolvimento:

```bash
pnpm install
pnpm dev
```

O terminal interativo do eve permite conversar com o agente. Para alterar seu comportamento, edite `agent/instructions.md`; para ajustar o modelo, consulte `agent/agent.ts`.

## Testes de comportamento (evals)

Os evals em `evals/` exercitam o agente por meio de sessões reais do eve. Há cenários para uma resposta básica, consulta ao Context7 e delegação aos especialistas. Como usam o modelo configurado, precisam de credenciais válidas desse modelo.

```bash
pnpm eval
pnpm eval -- --list
pnpm typecheck
```

Os resultados podem ser enviados ao Langfuse quando `LANGFUSE_PUBLIC_KEY` e `LANGFUSE_SECRET_KEY` estiverem configuradas. A URL pode ser definida por `LANGFUSE_BASE_URL` ou `LANGFUSE_HOST`; sem as chaves, o reporter ignora o envio.

## Build e execução

```bash
pnpm build
pnpm start
```

Para publicar na Vercel, vincule o projeto e use o comando de deploy do eve:

```bash
pnpm deploy
```

Consulte a [documentação do eve](https://eve.dev/docs) para detalhes de configuração, autenticação, sandbox e deploy.

## Estrutura principal

```text
agent/
  agent.ts                    configuração do agente principal
  instructions.md             comportamento e regras do agente
  connections/                conexões externas, incluindo Context7
  subagents/                  especialistas frontend, backend e requisitos
  sandbox/                    ambiente Docker isolado para execução
  channels/                   canal HTTP do eve e autenticação
  instrumentation/            exportação de traces para Langfuse
  extensions/                 extensão de automodificação local
evals/                         testes de comportamento do agente
```

## Licença

Este projeto está sob a licença MIT. Consulte [`LICENSE`](LICENSE).
