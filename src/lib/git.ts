import simpleGit from "simple-git";
import type { GitDiffResult } from "./types.js";

export async function collectGitData(
  cwd: string,
  diffRange?: string
): Promise<GitDiffResult> {
  const git = simpleGit(cwd);

  const [diff, log, status] = await Promise.all([
    git.diff(diffRange ? [diffRange] : ["HEAD~1..HEAD"]),
    git.log({ maxCount: 10 }),
    git.status(),
  ]);

  const changedFiles = status.files.map((f) => ({
    status: f.index !== " " ? "staged" : "modified",
    path: f.path,
  }));

  return {
    diff: diff || "(无代码变更)",
    changed_files: changedFiles,
    log: log.all
      .map((c) => `- ${c.hash.slice(0, 7)} ${c.message}`)
      .join("\n"),
  };
}
