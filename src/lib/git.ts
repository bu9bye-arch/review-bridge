import { execFileSync } from "child_process";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import simpleGit from "simple-git";
import type { GitDiffResult } from "./types.js";

const EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
const RECENT_COMMITS_COUNT = 10;

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function findGitRoot(cwd: string): string {
  // 先尝试当前目录/父目录
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf-8",
    }).trim();
  } catch {
    // 继续
  }

  // 搜索直接子目录中的 git 仓库
  const matches: string[] = [];
  try {
    const entries = readdirSync(cwd, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        const gitDir = join(cwd, entry.name, ".git");
        if (existsSync(gitDir)) {
          matches.push(join(cwd, entry.name));
        }
      }
    }
  } catch {
    // 继续
  }

  if (matches.length === 1) {
    return matches[0]!;
  }

  if (matches.length > 1) {
    throw new Error(
      `找到多个子目录 Git 仓库，请提供明确项目路径：${matches.join(", ")}`
    );
  }

  throw new Error(`找不到 git 仓库：${cwd} 及其父目录、子目录均不是 git 仓库`);
}

function validateDiffRange(range: string): void {
  if (/^-/.test(range)) {
    throw new Error(`diff_range 不能以 - 开头（当前值: "${range}"），避免被 git 解析为选项`);
  }
  if (/[\x00-\x1f\x7f]/.test(range)) {
    throw new Error("diff_range 不能包含控制字符");
  }
}

function gitDiff(cwd: string, range: string): string | null {
  try {
    validateDiffRange(range);
    return execFileSync("git", ["diff", range], {
      cwd,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    console.warn(`[review-bridge] git diff ${range} failed: ${formatError(err)}`);
    return null;
  }
}

function getSafeDiff(cwd: string, diffRange?: string): string {
  // diffRange === undefined: 使用默认范围（来自 config）
  // diffRange === "": 审查工作区变更 (git diff HEAD)
  // 其他值: 使用显式范围
  const isExplicit = diffRange !== undefined;
  const range = diffRange === undefined || diffRange === "" ? "HEAD" : diffRange;

  const diff = gitDiff(cwd, range);
  if (diff !== null) return diff;

  // git diff 失败，仅在非显式指定时尝试 fallback
  if (isExplicit) return "";

  // 默认范围失败，尝试初始提交（1 个 commit 的仓库）
  console.warn(`[review-bridge] "${range}" failed, trying initial commit fallback`);
  return gitDiff(cwd, `${EMPTY_TREE_SHA}..HEAD`) ?? "";
}

export async function collectGitData(
  cwd: string,
  diffRange?: string
): Promise<GitDiffResult> {
  const gitRoot = findGitRoot(cwd);
  const git = simpleGit(gitRoot);

  const diff = getSafeDiff(gitRoot, diffRange);

  const [log, status] = await Promise.all([
    git.log({ maxCount: RECENT_COMMITS_COUNT }).catch((err) => {
      console.warn(`[review-bridge] git log failed: ${formatError(err)}`);
      return { all: [] };
    }),
    git.status(),
  ]);

  const changedFiles = status.files.map((f) => {
    let status: string;
    if (f.index === "?" && f.working_dir === "?") {
      status = "untracked";
    } else if (f.index !== " " && f.index !== "?") {
      status = "staged";
    } else {
      status = "modified";
    }
    return { status, path: f.path };
  });

  return {
    diff: diff || "",
    changed_files: changedFiles,
    log: log.all
      .map((c) => `- ${c.hash.slice(0, 7)} ${c.message}`)
      .join("\n"),
  };
}
