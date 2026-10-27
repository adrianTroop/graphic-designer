# Hermes setup

This repository targets Nous Research Hermes Agent. It does not overwrite your existing global persona or copy credentials into the repository.

## Use the existing Hermes profile

1. Install the Node dependency with `npm ci` inside this repository.
2. Run `hermes skills trust` from the repository root to enable its project-local skill.
3. Start `hermes chat -s brand-designer` from the same root.

The root `.hermes.md` supplies project instructions. `.hermes/skills/brand-designer/SKILL.md` supplies the reusable procedure. The brand files are read on demand rather than stuffed into the system prompt. A whole-repository checkout is required; installing only the skill file is insufficient.

Hermes discovers project skills relative to the nearest Git root. This handoff initializes a local Git repository. If using an extracted source ZIP without `.git`, run `git init` in its root before trusting project skills.

## Optional dedicated designer profile

Create a **new** profile rather than overwriting an existing one. These are setup commands for the user to run; they have not been executed by the handoff.

```bash
hermes profile create graphic-designer --no-alias --description "Creates graphics for any brand from briefs, evidence and configurable assets."
hermes -p graphic-designer setup
```

After successful creation, copy `profiles/graphic-designer/SOUL.md` into the new profile's `SOUL.md`. For the standard Hermes home, that destination is `~/.hermes/profiles/graphic-designer/SOUL.md`. If the profile already existed, inspect its persona and choose deliberately before replacing it. A custom Hermes home changes this path.

From the repository root:

```bash
hermes -p graphic-designer skills trust
hermes -p graphic-designer chat -s brand-designer
```

Use Hermes's normal setup/auth flow for provider credentials. Do not place `.env`, OAuth state, messages, memories or gateway credentials in Git. The project does not choose or purchase a model provider.

## What was verified

- Hermes is installed locally and its source supports `.hermes.md`, project-local skills, skill trust, `chat -s`, named profiles and `SOUL.md`.
- The supplied renderer and automated checks run independently; see `docs/verification.md` for results.
- A live Hermes model session was **not** run. The installed launcher stopped before startup because the execution environment could not write its installation-state lock. No live profile, global persona, provider configuration or messaging gateway was changed.

Run the sample request in README after setup to verify the complete natural-language path on your Hermes installation. A working renderer does not by itself prove that the agent chose and used it correctly.

## Official references

- [Context files and configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration)
- [Project-local skills and trust](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [Profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles)

Validated against the local source on 27 October 2026. Check these references again when upgrading Hermes.
