/**
 * THE DEFAULT VOCABULARY FOR DICTATION AND MEETINGS (0.5.3, F16, founder
 * 23 Sep 2026): "add support for custom 100 to 150 additional words by
 * default related to founders, startups, AI, agents, models, popular AI and
 * SaaS companies and tools, so that people who work in a tech company,
 * technical and non technical, are able to dictate and transcribe meetings
 * properly."
 *
 * Every entry is a spelling the engine would otherwise guess at: a name, an
 * acronym said as letters, or a word of the trade. Plain English words are
 * not here; the model knows them. The list is data: whisper gets it as the
 * initial prompt, Apple's engine as contextual strings where it takes them,
 * and the user's own words (transcribe.customWords) come after it.
 *
 * Keep it between 100 and 150 entries (the test pins the range), one spelling
 * per line, no duplicates ignoring case.
 */
export const DEFAULT_TRANSCRIBE_VOCABULARY: readonly string[] = [
  // The product and this office
  'Munder Difflin', 'Stapler', 'Michael', 'Harness',
  // AI labs and the models people say by name
  'Anthropic', 'Claude', 'Claude Code', 'Opus', 'Sonnet', 'Haiku', 'Mythos',
  'OpenAI', 'ChatGPT', 'GPT', 'Codex',
  'Google DeepMind', 'Gemini', 'Antigravity',
  'Meta', 'Llama', 'Mistral', 'DeepSeek', 'Qwen', 'Kimi',
  'xAI', 'Grok', 'Perplexity', 'Hugging Face', 'Whisper', 'Parakeet',
  // Agent and developer tools
  'Cursor', 'Copilot', 'GitHub', 'GitLab', 'Vercel', 'Supabase', 'Firebase',
  'Cloudflare', 'Netlify', 'Replit', 'Lovable', 'Windsurf',
  'LangChain', 'LlamaIndex', 'Ollama', 'vLLM', 'MCP', 'RAG', 'LLM', 'AGI',
  'Kubernetes', 'Docker', 'Postgres', 'MongoDB',
  'TypeScript', 'Node.js', 'React', 'Next.js', 'Electron',
  'Jira', 'Linear', 'Notion', 'Figma', 'Slack', 'Discord', 'Zoom',
  'Granola', 'Wispr Flow', 'Superhuman',
  'HubSpot', 'Salesforce', 'Stripe', 'Razorpay', 'Zapier',
  'Datadog', 'PagerDuty', 'Sentry',
  'AWS', 'GCP', 'Azure', 'Nvidia', 'CUDA', 'Apple Silicon',
  // Startup and founder words, said as letters or as jargon
  'ARR', 'MRR', 'CAC', 'LTV', 'TAM', 'NPS', 'OKR', 'KPI',
  'SaaS', 'B2B', 'PLG', 'GTM', 'ICP', 'PMF', 'MVP', 'YC', 'Y Combinator',
  'SAFE', 'pre seed', 'seed round', 'Series A', 'Series B', 'term sheet', 'cap table',
  'runway', 'burn rate', 'churn', 'freemium',
  'sprint', 'standup', 'retro', 'PR', 'API', 'SDK', 'CLI',
  'SSO', 'SOC 2', 'GDPR', 'HIPAA', 'ESOP', 'CTO', 'CEO', 'CFO'
];

/** The words the engine is told about: the default list (unless switched off)
 *  followed by the user's own, deduplicated ignoring case, blanks dropped. */
export function vocabularyFor(customWords: readonly string[] | undefined, useDefault: boolean): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of [...(useDefault ? DEFAULT_TRANSCRIBE_VOCABULARY : []), ...(customWords ?? [])]) {
    const t = String(w ?? '').trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** whisper.cpp takes the vocabulary as its initial prompt. A comma list reads
 *  as a sentence of names, which is what the model is best at picking up; the
 *  prompt is capped so it cannot eat the decoding window. */
export const WHISPER_PROMPT_MAX_CHARS = 1200;
export function whisperPromptFor(words: readonly string[]): string {
  const s = words.join(', ');
  return s.length <= WHISPER_PROMPT_MAX_CHARS ? s : s.slice(0, WHISPER_PROMPT_MAX_CHARS).replace(/,[^,]*$/, '');
}
