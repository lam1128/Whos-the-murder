const fs = require("fs");
const path = require("path");

const dataDir = path.join(process.cwd(), "data");
const generationDir = path.join(process.cwd(), "generation");

const scenarios = [
  {
    label: "第一章｜失踪的货箱",
    sourceDir: path.join(generationDir, "事件1_旧水闸"),
    pattern: /^old_sluice(?:_[a-z0-9]+)*_v(\d+(?:\.\d+)*)\.json$/i,
    targetFile: path.join(dataDir, "old_sluice_current.json"),
  },
  {
    label: "第二章｜妹宝！妹宝！",
    sourceDir: path.join(generationDir, "事件2_初识"),
    pattern: /^first_acquaintance_v(\d+(?:\.\d+)*)\.json$/i,
    targetFile: path.join(dataDir, "first_acquaintance_current.json"),
  },
  {
    label: "第三章｜玄甲林蜥",
    sourceDir: path.join(generationDir, "事件3"),
    pattern: /^xuanjia_lizard_hunt_v(\d+(?:\.\d+)*)\.json$/i,
    targetFile: path.join(dataDir, "xuanjia_lizard_hunt_current.json"),
  },
  {
    label: "支线｜错放的河灯",
    sourceDir: path.join(generationDir, "事件3"),
    pattern: /^misplaced_river_lights_v(\d+(?:\.\d+)*)\.json$/i,
    targetFile: path.join(dataDir, "misplaced_river_lights_current.json"),
  },
  {
    label: "第四章｜添置",
    sourceDir: path.join(generationDir, "事件4_添置"),
    pattern: /^chap\.4_equipment_day_v(\d+(?:\.\d+)*)\.json$/i,
    targetFile: path.join(dataDir, "equipment_day_current.json"),
  },
  {
    label: "第五章｜西原矿区换班路",
    sourceDir: path.join(generationDir, "事件5_西原矿区"),
    pattern: /^chapter5_western_mining_trip_v(\d+(?:\.\d+)*)\.json$/i,
    targetFile: path.join(dataDir, "chapter5_western_mining_trip_current.json"),
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
        fullPath: path.join(sourceDir, entry.name),
        versionText: `v${match[1]}`,
        versionParts: parseVersion(match[1]),
      };
    })
    .filter(Boolean);

  if (!candidates.length) return null;

  candidates.sort((left, right) => compareVersions(right.versionParts, left.versionParts));
  return candidates[0];
}

function readScenarioVersion(content, fallbackVersion) {
  try {
    const parsed = JSON.parse(content);
    return parsed?.metadata?.version ?? parsed?.metadata?.scenarioVersion ?? fallbackVersion;
  } catch {
    return fallbackVersion;
  }
}

function syncScenarioData(config) {
  const selected = selectHighestVersionFile(config.sourceDir, config.pattern);

  if (!selected) {
    return {
      label: config.label,
      version: "missing",
    };
  }

  const sourceContent = fs.readFileSync(selected.fullPath, "utf8");
  const targetContent = fs.existsSync(config.targetFile)
    ? fs.readFileSync(config.targetFile, "utf8")
    : null;
  const resolvedVersion = readScenarioVersion(sourceContent, selected.versionText);

  if (targetContent !== sourceContent) {
    fs.writeFileSync(config.targetFile, sourceContent, "utf8");
  }

  return {
    label: config.label,
    version: resolvedVersion,
  };
}

const results = scenarios.map((scenario) => syncScenarioData(scenario));

for (const result of results) {
  console.log(`- ${result.label}: ${result.version}`);
}
