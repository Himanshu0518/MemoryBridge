# MemoryBridge


# Team Git Workflow Guide

## 📌 Branch Creation

Before starting any new task, always pull the latest changes from the main branch:

```bash
git checkout main
git pull origin main
```

Create a new branch using this naming convention:

```bash
git checkout -b feature/your-task-name
```

Example:

```bash
git checkout -b feature/user-authentication
```

---

## 📌 Working on Code

After making changes, check modified files:

```bash
git status
```

Add files:

```bash
git add .
```

Commit with a clear message:

```bash
git commit -m "Added user authentication API"
```

---

## 📌 Push Branch to Remote

Push your branch to remote repository:

```bash
git push origin feature/your-task-name
```

---

## 📌 Create Pull Request (PR)

After pushing code:

1. Open repository on GitHub
2. Click **Compare & Pull Request**
3. Select:

   * **Base branch:** main
   * **Compare branch:** your feature branch
4. Add clear PR title and description
5. Create PR

---

## 📌 CodeRabbit Review Process

Once PR is created:

* CodeRabbit will automatically review the PR 🤖
* Check all comments carefully
* Resolve requested changes
* Push fixes to same branch

Example after fixes:

```bash
git add .
git commit -m "Resolved CodeRabbit review comments"
git push origin feature/your-task-name
```

---

## 📌 Merge Process

After:

* CodeRabbit review completed ✅
* Team approval received ✅

Then merge PR into main branch.

Preferred merge method:

* **Squash and Merge**

This keeps commit history clean.

---

## 📌 Important Team Rules

* Never push directly to `main` 🚫
* Always create separate branch for each task 🌿
* Keep commit messages clear ✨
* Pull latest main before starting work 🔄
* Resolve conflicts before merge ⚡

---

## 📌 Recommended Branch Naming

```text
feature/task-name
bugfix/task-name
hotfix/task-name
```

Examples:

```text
feature/login-api
bugfix/token-expiry
hotfix/payment-error
```

---

## 📌 PR Checklist Before Merge

* Code runs successfully ✅
* No unnecessary files added ✅
* CodeRabbit comments resolved ✅
* PR description added ✅
* No merge conflicts ✅
