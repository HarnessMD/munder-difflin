---
title: "Is Ollama Good for Coding? Yes, for Scoped Work on the Right Model"
description: "Ollama is good for coding on scoped, private work if the model fits your memory. Which models to pull, how much RAM, and where Claude still wins."
date: 2026-09-15
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "is ollama good for coding"
secondaryKeywords: ["is ollama any good for coding", "are ollama models good for coding", "which ollama is best for coding", "ollama vs claude for coding", "how much ram for ollama", "local llm for coding hardware"]
tags: ["Concepts", "Ollama", "Local-First", "Open Source", "Claude Code"]
faq:
  - q: "Which Ollama model is best for coding?"
    a: "The best one that fits your memory with room for context. On Ollama's library pages on 15 Sep 2026, devstral-small-2 (15GB), qwen3.8:27b (18GB) and qwen3-coder:30b (19GB) all list tool calling and by our estimate suit a 32GB machine, while qwen3.5 (6.6GB) suits 16GB. Skip codellama, qwen2.5-coder and Llama 3.x for agent work, because Ollama's own launcher warns against them."
  - q: "Does Ollama send my code to the internet?"
    a: "Not when the model is local. Ollama's FAQ says it does not see your prompts or data when you run locally, while cloud models, tags such as qwen3.5:cloud or gpt-oss:120b-cloud, are processed on Ollama's servers. To rule the cloud out, set OLLAMA_NO_CLOUD=1 and restart Ollama."
  - q: "Does Ollama need a GPU?"
    a: "No, but coding agents slow down badly once the model spills onto the CPU. Ollama can run a model on the CPU, and on Apple Silicon Macs it uses the GPU through Metal. Its context length docs say to avoid offloading onto the CPU for best performance, so for agent work the whole model should fit in GPU or unified memory."
  - q: "Is Ollama free for coding?"
    a: "Running models on your own machine is. Ollama is MIT licensed, and its pricing page on 15 Sep 2026 lists running models locally under the Free plan. Cloud models draw on usage credits instead, with paid plans that include more."
---

Ollama is good for coding on scoped, private work if you pull a recent tool calling model that fits your memory and raise its context window. It does not yet replace Claude or GPT on long agent runs. Ollama only runs the model; the model and your memory decide the rest.

You can pick, size and wire local models by hand, or use [Munder Difflin](https://harnessmd.com/download), a free and open source desktop app that runs several coding agents side by side, each on its own engine and model. As of 0.5.2, its Add agent screen offers eight local Ollama models for OpenCode, Crush and Pi agents, each tooltip showing a rough memory figure and the `ollama pull` command, while Claude Code agents stay on your Claude login. It will not pull the model or set Ollama's context for you; the [install guide](/blog/how-to-install-and-use-munder-difflin/) covers the rest of setup.

## Can Ollama write code?

Not on its own: Ollama is a model runner, and the model you load writes the code. It downloads open weight models, serves them on `localhost:11434`, and gives coding tools an API to call.

One recent change blurs that. Since 0.32.0 (11 July 2026), typing `ollama` opens an agent that helps you code, and the release notes show it on `glm-5.2:cloud`, a model on Ollama's servers rather than yours. Any tag with cloud in it, such as `gpt-oss:120b-cloud`, sends your prompts off the machine.

## Are Ollama models good for coding?

The recent ones are, the old favourites are not, and the gap is wide. The independent [SWE-bench leaderboard](https://www.swebench.com/) has a Bash Only view of SWE-bench Verified that runs every model in the same small agent, "so scores compare models rather than harnesses", though the runs below used different versions of that agent. Checked on 15 Sep 2026 (its newest runs date from February 2026, so the latest models on both sides are missing), Qwen2.5 Coder 32B resolved 9% of the 500 GitHub issues in an August 2025 run. Devstral Small 2512, a 24B model Ollama ships as a 15GB download, resolved 56.4% in December 2025. The leaderboard did not test Ollama's 4 bit build.

Ollama draws the same line in code. Its launcher, `ollama launch`, warns before starting a tool on an old model; this is the list in [`cmd/launch/deprecated_models.go`](https://github.com/ollama/ollama/blob/v0.34.0/cmd/launch/deprecated_models.go) at v0.34.0, the current release:

```go
var deprecatedLaunchModels = map[string]struct{}{
	"codellama":     {},
	"qwen2.5":       {},
	"qwen2.5-coder": {},
	"llama3":        {},
	"llama3.1":      {},
	"llama3.2":      {},
	"llama3.3":      {},
	"mistral":       {},
	"starcoder":     {},
}
```

DeepSeek R1 tags up to `32b` are flagged too. The prompt says the model "does not work well with" your tool, then offers "Launch anyway" or "Pick another model". Ollama will not stop you, it just asks if you are sure. Our own list would earn the same warning: Munder Difflin 0.5.2's local picks still include two flagged models, Llama 3.3 70B and DeepSeek R1 32B, so for coding take Qwen3 Coder 30B or gpt-oss 20B from it.

## How much RAM do you need for Ollama coding models?

Enough to hold the model plus its context window: by our estimate 16GB for the small picks and 32GB for 24B to 30B coding models. The only primary figures for these models are on Ollama's [gpt-oss page](https://ollama.com/library/gpt-oss), where the 20B model runs in as little as 16GB of memory and the 120B model fits on a single 80GB GPU. Quantization stores each weight in fewer bits, which is why one model comes in several sizes: on Ollama's [qwen3-coder tags page](https://ollama.com/library/qwen3-coder/tags), the 30B model is 19GB at 4 bit, 32GB at 8 bit and 61GB at 16 bit.

These all list tool calling on their Ollama library pages, checked 15 Sep 2026. The gpt-oss memory figures are Ollama's; the rest are our estimates from download size plus context:

| Memory | Model tag | Download | Max context |
|---|---|---|---|
| 16GB | `qwen3.5` (9B) | 6.6GB | 256K |
| 16GB, tight | `gpt-oss:20b` | 14GB | 128K |
| 32GB | `devstral-small-2` (24B) | 15GB | 384K |
| 32GB | `qwen3.8:27b` | 18GB | 256K |
| 32GB | `qwen3-coder:30b` | 19GB | 256K |
| 80GB GPU | `gpt-oss:120b` | 65GB | 128K |

The last column is the model's ceiling, not what you get. Ollama's [context length docs](https://docs.ollama.com/context-length) pick the default from GPU memory, 4k tokens below 24 GiB, and ask for at least 64,000 for coding tools, noting that a larger window needs more memory. So on a machine under that line, an agent starts with a sliver of your repo in view and looks dumber than the model is. After raising it, run `ollama ps`: PROCESSOR should read `100% GPU`, since the same page says to avoid offloading onto the CPU for best performance.

{% img "note-1" %}

## Is Ollama as good as Claude for coding?

Not on long agent runs, as of September 2026. On the same Bash Only leaderboard, Claude 4.5 Opus resolved 76.8% of issues in a February 2026 run, about 20 points above Devstral Small, and it averaged about 33 model calls per issue against Devstral's 87. When the model is local, every one of those calls runs on your own GPU, so a long loop costs time even when it costs no tokens.

Tool calling is the other soft spot. It only works on models built for it, and it depends on each model's template: Ollama 0.32.3 (23 July 2026) fixed "GLM tool calls being silently dropped at the end of generation". Hosted frontier models also keep their big windows without touching your RAM.

In our judgement, local models hold up on the short loop: explain this function, write tests for one module, rename across a file, draft a regex or a SQL query, review a diff before you push. The code fits in the window, the task takes a few turns, and Ollama's [FAQ](https://docs.ollama.com/faq) is plain about privacy: "We don't see your prompts or data when you run locally."

## When is Ollama good enough for coding?

When the task is small or the code cannot leave your machine. By use case:

* **Private or offline code:** yes. Use local tags, and set `OLLAMA_NO_CLOUD=1` to switch off cloud features.
* **Tests, explanations and single file edits on 32GB:** likely, with a 24B to 30B coding model and a 64K window. Check `ollama ps`, and if it offloads to the CPU, pick a smaller model rather than cutting the window below 64K.
* **A 16GB laptop:** fine for questions and small edits, cramped for agents.
* **Long agent jobs across a repo:** use a hosted model through Claude Code, or an Ollama cloud model if your code may leave the machine.

Mixing is the practical answer: a local model takes the routine turns and a hosted one takes the hard ones. The [open models guide](/blog/run-munder-difflin-on-open-models/) has the wiring for each engine, and if you want Claude Code itself on a local model, [connecting Ollama to Claude Code](/blog/how-to-connect-ollama-to-claude-code/) covers the variables and what stops working.

{% img "note-2" %}
