# CloakBrowser MCP

[![GitHub stars](https://img.shields.io/github/stars/vutranHS/cloakmcp?style=flat-square)](https://github.com/vutranHS/cloakmcp/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/vutranHS/cloakmcp?style=flat-square)](https://github.com/vutranHS/cloakmcp/forks)
[![GitHub issues](https://img.shields.io/github/issues/vutranHS/cloakmcp?style=flat-square)](https://github.com/vutranHS/cloakmcp/issues)
[![GitHub repo size](https://img.shields.io/github/repo-size/vutranHS/cloakmcp?style=flat-square)](https://github.com/vutranHS/cloakmcp)
[![Node.js 20+](https://img.shields.io/badge/node-20%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Claude Code MCP](https://img.shields.io/badge/Claude%20Code-MCP-6B5B95?style=flat-square)](https://code.claude.com/)

This repo includes a Claude Code MCP server named `cloakbrowser`.

It exposes `cloakbrowser_read_url`, a cross-platform tool that reads public web page text with CloakBrowser while blocking CSS, images, fonts, and media.

Use it when normal `WebFetch` is blocked or returns unusable content.

## Requirements

- Claude Code
- Node.js 20+
- npm
- Internet access on first real use

Supported OS:

- Windows x86_64
- macOS arm64 / x86_64
- Linux arm64 / x86_64

## Install dependencies

From the project root:

```bash
npm install --prefix .claude/mcp/cloakbrowser
```

Windows PowerShell:

```powershell
npm install --prefix ".claude\mcp\cloakbrowser"
```

CloakBrowser downloads its Chromium binary on first real use. Expect roughly 200MB.

## Verify server

```bash
node .claude/mcp/cloakbrowser/smoke-test.mjs
```

Expected output:

```text
mcp smoke ok
```

This only verifies that the MCP server starts and registers `cloakbrowser_read_url`; it does not launch Chromium.

## Install scopes

Claude Code MCP has three useful scopes:

- `user`: global for every project on this machine
- `project`: shared through this repo's `.mcp.json`
- `local`: only for the current project on this machine

### Option A: project scope, recommended for GitHub repos

Use this if you want other people to clone the repo and get the MCP config.

From the project root:

```bash
claude mcp add --scope project --transport stdio cloakbrowser -- node .claude/mcp/cloakbrowser/server.mjs
```

This writes `.mcp.json`:

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "node",
      "args": [
        ".claude/mcp/cloakbrowser/server.mjs"
      ]
    }
  }
}
```

Commit `.mcp.json` with the repo.

On another machine:

```bash
git clone <repo>
cd <repo>
npm install --prefix .claude/mcp/cloakbrowser
claude
```

Approve the project MCP server if Claude Code asks.

### Option B: user scope, global on one machine

Use this if you want the MCP server and companion skill available in all projects on your machine.

Install the MCP server and the global skill together.

macOS/Linux:

```bash
repo=/absolute/path/to/repo
npm install --prefix "$repo/.claude/mcp/cloakbrowser"
mkdir -p ~/.claude/skills
cp -R "$repo/.claude/skills/fetch-article" ~/.claude/skills/fetch-article
claude mcp add --scope user --transport stdio cloakbrowser -- node "$repo/.claude/mcp/cloakbrowser/server.mjs"
```

Windows PowerShell:

```powershell
$repo = "C:\path\to\repo"
npm install --prefix "$repo\.claude\mcp\cloakbrowser"
New-Item -ItemType Directory -Force -Path "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse -Force "$repo\.claude\skills\fetch-article" "$HOME\.claude\skills\fetch-article"
claude mcp add --scope user --transport stdio cloakbrowser -- node "$repo\.claude\mcp\cloakbrowser\server.mjs"
```

The MCP exposes the tool. The global skill teaches Claude when to use it, including the Reddit `old.reddit.com` rewrite rule.

Check:

```bash
claude mcp list
claude mcp get cloakbrowser
```

### Option C: local scope, private to one project

Use this if you do not want to commit `.mcp.json`.

```bash
claude mcp add --scope local --transport stdio cloakbrowser -- node .claude/mcp/cloakbrowser/server.mjs
```

`local` is also the default, so this is equivalent:

```bash
claude mcp add --transport stdio cloakbrowser -- node .claude/mcp/cloakbrowser/server.mjs
```

## Claude Code settings

This repo may also include `.claude/settings.json` to pre-enable the project MCP server:

```json
{
  "enabledMcpjsonServers": [
    "cloakbrowser"
  ]
}
```

If `/mcp` says no servers are configured, make sure Claude Code was opened from the project root, then restart Claude Code.

If project approval gets stuck:

```bash
claude mcp reset-project-choices
```

## First real use

Ask Claude Code to read a public page that `WebFetch` cannot access. Claude should call:

```text
mcp__cloakbrowser__cloakbrowser_read_url
```

Example input:

```json
{
  "url": "https://old.reddit.com/r/example/comments/example/post/",
  "timeoutMs": 60000
}
```

For Reddit links, prefer `old.reddit.com` instead of `www.reddit.com`.

## Files to commit

Recommended for a shareable repo:

```text
.mcp.json
.claude/settings.json
.claude/mcp/cloakbrowser/package.json
.claude/mcp/cloakbrowser/package-lock.json
.claude/mcp/cloakbrowser/server.mjs
.claude/mcp/cloakbrowser/smoke-test.mjs
.claude/skills/fetch-article/SKILL.md
README.md
```

Do not commit:

```text
.claude/mcp/cloakbrowser/node_modules/
```

## Safety limits

Do not use this MCP tool to bypass:

- Paywalls
- CAPTCHA
- Login walls
- Private/internal network URLs
- Explicit access controls

The server only accepts public `http` and `https` URLs and blocks localhost/private-network targets.

## Troubleshooting

### `No MCP servers configured`

Make sure Claude Code was opened from this project root and `.mcp.json` exists there.

Then restart Claude Code.

### `Cannot find module`

Run install again:

```bash
npm install --prefix .claude/mcp/cloakbrowser
```

### First call is slow

Normal. CloakBrowser downloads Chromium on first use.

### macOS Gatekeeper blocks Chromium

Approve the downloaded CloakBrowser Chromium binary once in macOS security settings, then retry.

### Need custom browser binary

macOS/Linux:

```bash
export CLOAKBROWSER_BINARY_PATH=/absolute/path/to/browser
```

Windows PowerShell:

```powershell
$env:CLOAKBROWSER_BINARY_PATH = "C:\\path\\to\\browser.exe"
```
