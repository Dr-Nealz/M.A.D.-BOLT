# Git & GitHub

M.A.D. BOLT-REMIX includes built-in **Git** integration so you can version-control and share your projects directly from the browser.

## Supported Remotes

- **GitHub**
- **GitLab**

## Connecting an Account

1. Open the **Git** panel (the branch icon in the sidebar).
2. Choose **GitHub** or **GitLab** and sign in.
3. Authorize M.A.D. to access your repositories.

M.A.D. uses the `octokit` / GitLab API clients to handle authentication and API access, so you never need to handle tokens yourself.

## Core Operations

From the Git panel you can:

- **Clone** a repository into your WebContainer project.
- **Stage** and **commit** changes with a message.
- **Pull** the latest from the remote.
- **Push** your commits back to GitHub/GitLab.
- View **status** and **diff** between working tree and HEAD.

## How It Works Under the Hood

Browser-based Git is powered by [`isomorphic-git`](https://isomorphic-git.org), a pure-JS Git implementation that works in the browser without a native binary. This is what lets the whole workflow — clone, status, diff, commit, push — run inside WebContainer.

> **Tip:** Because WebContainer is ephemeral, committing and pushing your work frequently is the safest way to make sure it survives.

## Related

- [WebContainer](/guide/webcontainer) — the sandbox your Git repos live in.
- [Deploy](/guide/deploy) — ship the code you've committed.
