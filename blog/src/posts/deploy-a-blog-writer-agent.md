---
title: "Deploy a Blog Writer Agent: The One That Wrote This Post"
description: "How the Munder Difflin blog is written by agents in our own office: a brief, a house style, a draft in its own worktree, drawings made in code, a pull request, and one human merge. The pipeline, and how to build your own."
date: 2026-06-10
updated: 2026-09-10
category: use-cases
categoryLabel: Use Cases
type: Non-technical
primaryKeyword: "automated blog writer agent"
secondaryKeywords: ["ai blog automation", "content agent", "multi-agent blogging", "automated content pipeline", "ai blog writing workflow"]
tags: ["Use Cases", "Automation", "Content", "Multi-Agent", "Open Source"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "Did an AI actually write the Munder Difflin blog?"
    a: "Mostly, yes. Agents in our own Munder Difflin office draft posts from a brief and a house style, and the illustrations are drawn in code. The change goes up as a pull request, a person reads it and merges it, and the merge publishes it. This post was rewritten that way in September 2026."
  - q: "Is the blog writer agent fully autonomous?"
    a: "Everything before publishing is. Research, drafting, checks and the pull request run without a person. Publishing waits for a human merge on purpose, so nothing unreviewed reaches the live site."
  - q: "How do I build my own blog writer agent?"
    a: "Give one agent a brief, a house style reference and its own workspace. Have a second agent or a checklist review the draft, then send it wherever a human approves changes, like a pull request. Put the loop on a schedule once a few posts come out right."
  - q: "What makes an AI written post worth reading?"
    a: "Something only you can say: a command you ran, a screenshot of the real screen, a result you measured and dated, a mistake you made. Without that, a draft is a summary of whatever already ranks, and readers can tell."
  - q: "Why use a team of agents instead of one prompt?"
    a: "One prompt writes one post. A team runs a content function: one agent researches, one drafts, one reviews, and a schedule starts the loop again. You stop prompting for posts and start reviewing them."
---

<div class="callout tldr"><span class="ic">TL;DR</span><p>The blog you are reading is <strong>mostly
written by agents</strong> in our own office. An agent takes a <strong>brief</strong> and a <strong>house
style</strong>, drafts in its <strong>own worktree</strong>, the draft gets checked, the pictures are
<strong>drawn in code</strong>, and the change goes up as a <strong>pull request</strong>. A person merges
it, and the merge publishes it. <em>This post was rewritten exactly that way.</em></p></div>

Here is a fact that is either a confession or a flex: most of this blog is written by agents. Not "AI
assisted" in the vague marketing sense. Agents in a Munder Difflin office take a brief, write the post and
open the pull request. A human does one thing: reads it and merges it.

This post describes that pipeline, and in September 2026 the pipeline rewrote this post, so it doubles as
the worked example. Here is how it runs and how to build your own.

## What does a blog writer agent actually do?

It turns a brief into a finished change that is ready for review. It reads the brief and the house style,
researches the topic, drafts the post with its frontmatter and the questions a reader would type, checks its
own work, and hands the result on. It does not publish.

## How does the pipeline work, end to end?

Five stages, and only the last one needs a person.

### 1. Brief

Every post starts from a brief: the topic, the question a reader is trying to answer, and the angle. Briefs
come from a backlog, so the agent is always writing something somebody is looking for, not whatever it
happens to feel like.

### 2. Draft, in its own worktree

The writer works in its **own git worktree**, a separate checkout, so a half written draft never collides
with anyone else's files. ([Why that isolation matters](/blog/claude-code-git-worktrees-vs-hive/).) It reads a
handful of existing posts for structure, and it can carry the house style as an installed **skill**, a
checklist it rereads on every draft instead of a prompt we hope it remembers.

Our house style is short and blunt: no dashes, get to the point, one light joke at most, and nothing we cannot
back up. The output is a single markdown file, and its filename becomes the URL.

### 3. Check

A second pass holds the draft against the brief and the style. Are the facts sourced and dated? Does every
heading answer a question a real person asks? Do the links work? A draft that fails goes back with the reason.

### 4. Pictures, drawn in code

Every hero image and inline sketch on this blog is [drawn as code by an agent](/blog/an-agent-redesigned-this-blog/):
a library of SVG parts, a set of scene layouts and one spec file, rendered in a headless browser. No image API
bills. One manifest lists every image, and a post shows a designed placeholder until its drawings land, so a page
never renders broken.

### 5. Pull request, then one human merge

The agent opens a pull request with the new post and the rebuilt pages. A person reads it and merges it. Merging
to main rebuilds the site with [Eleventy](https://www.11ty.dev/), and GitHub Pages serves it at munderdiffl.in/blog.
The build adds the post to the index, its topic and tag pages, the sitemap and the RSS feed, with the structured
data already wired in.

That split is the whole lesson: **writing is automated, publishing is reviewed.** You get an agent's stamina and
a human's final read. Nobody wants a confidently wrong claim on their front page.

{% img "note-1", "Brief in, draft in its own worktree, one human gate at the very end." %}

## How do you build your own blog writer agent?

Five steps, and none of them needs our exact stack.

**1. Keep a backlog of briefs.** One topic, one reader question and one angle per brief.

**2. Write the house style down.** Point the agent at three to five of your best posts and list the rules you
actually care about. Install it as a skill so every draft rereads it. A writer with a sharp reference produces
something publishable. A writer without one produces beige.

**3. Give the draft its own workspace.** A worktree, a branch or a scratch folder. In Munder Difflin this is the
git isolation toggle on the agent.

**4. Check, then gate publishing.** A reviewer agent or a checklist first, then a pull request or an approval that
only a human can complete.

**5. Put it on a schedule.** Once a few posts come out right, open the Triggers tab and create a schedule: a label,
who it goes to, and the prompt that starts the loop. It is the same move that stood up
[an hourly PR reviewer](/blog/one-prompt-automated-pr-review/) for us.

{% img "note-2", "One gate stays human on purpose: publishing. Everything before it runs on its own." %}

## What makes an AI written post worth reading?

Something only you can say. A draft built only from what already ranks is a summary of other people's posts, and
readers smell it quickly. Give the writer real material: a command you ran, a screenshot of the actual screen, a
number you measured and dated, a mistake you made and fixed. The agent brings structure and stamina. You bring the
proof.

Two more rules we follow:

- **Write for a job someone is doing.** "How do I run pi on a local model?" beats "Some thoughts on local AI".
- **Refresh instead of duplicating.** When the product changes, update the post that already exists rather than
  writing a second one that competes with it. This rewrite is that rule in action.

## The meta point

A multi agent office is not only for code. Once you have a writer that drafts, a check that catches mistakes, a build
that publishes and one human gate, you have a content function instead of a one off prompt. The same pipeline can run
[a GTA 6 guide site](/blog/gta-6-guide-site/), with your own play notes as the source the checker holds every claim to.

So this post is exhibit A: briefed, rewritten in a worktree against a house style, checked, and handed to a human as
a pull request.

---

Munder Difflin runs an office of agents on twelve terminal CLIs on your own machine, with worktrees, skills, schedules
and an ASK ME board for the decisions that need you. [Download it free](https://munderdiffl.in/) and put a writer, or
any other worker, on your floor.
