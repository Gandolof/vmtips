import fs from "fs";
import path from "path";

function copyDirectory(source, target) {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(source, target, { recursive: true, force: true });
}

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");

copyDirectory(
  path.join(rootDir, ".next", "static"),
  path.join(standaloneDir, ".next", "static")
);

copyDirectory(path.join(rootDir, "public"), path.join(standaloneDir, "public"));
