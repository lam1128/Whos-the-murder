const fs = require("fs");
const path = require("path");

const dataDir = path.join(process.cwd(), "data");
const generationDir = path.join(process.cwd(), "generation");

const scenarios = [
  {
    label: "first acquaintance",
    sourceDir: path.join(generationDir, "事件2_初识"),
    pattern: /^first_acquaintance_v(\d+(?:\.\d+)*)\.json$/i,
    targetFile: path.join(dataDir, "first_acquaintance_current.json"),
  },
  {
    label: "old sluice",
    sourceDir: path.join(generationDir, "事件1_旧水闸"),
    pattern: /^old_sluice(?:_[a-z0-9]+)*_v(\d+(?:\.\d+)*)\.json$/i,
    targetFile: path.join(dataDir, "old_sluice_current.json"),
  },
];

function parseVersion(versionText) {
  return versionText.split(".").map((part) => Number.parseInt(part, 10));
}

function compareVersions(left, right) {
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;

    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
}

function selectHighestVersionFile(sourceDir, pattern) {
  if (!fs.existsSync(sourceDir)) return null;

  const candidates = fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const match = entry.name.match(pattern);
      if (!match) return null;

      return {
        name: entry.name,
        fullPath: path.join(sourceDir, entry.name),
        versionParts: parseVersion(match[1]),
      };
    })
    .filter(Boolean);

  if (!candidates.length) return null;

  candidates.sort((left, right) => compareVersions(right.versionParts, left.versionParts));
  return candidates[0];
}

function syncScenarioData(config) {
  const selected = selectHighestVersionFile(config.sourceDir, config.pattern);

  if (!selected) {
    console.log(
      `[scenario-sync] No ${config.label} version JSON found; keeping ${path.basename(config.targetFile)}`,
    );
    return;
  }

  const sourceContent = fs.readFileSync(selected.fullPath, "utf8");
  const targetContent = fs.existsSync(config.targetFile)
    ? fs.readFileSync(config.targetFile, "utf8")
    : null;

  if (targetContent === sourceContent) {
    console.log(
      `[scenario-sync] ${config.label} is already up to date: ${selected.name} -> ${path.basename(config.targetFile)}`,
    );
    return;
  }

  fs.writeFileSync(config.targetFile, sourceContent, "utf8");
  console.log(
    `[scenario-sync] Synced ${config.label}: ${selected.name} -> ${path.basename(config.targetFile)}`,
  );
}

for (const scenario of scenarios) {
  syncScenarioData(scenario);
}
