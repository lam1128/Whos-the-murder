const compoundSurnames = [
  "欧阳",
  "司马",
  "上官",
  "诸葛",
  "夏侯",
  "东方",
  "皇甫",
  "尉迟",
  "公孙",
  "慕容",
  "长孙",
  "宇文",
  "司徒",
  "司空",
];

export function getPlayerAddress(name: string): {
  formal: string;
  familiar: string;
} {
  const cleanName = name.trim();
  if (!cleanName) {
    return {formal: "姑娘", familiar: "姑娘"};
  }

  const isChineseName = /^[\u3400-\u9fff]+$/u.test(cleanName);
  if (!isChineseName || cleanName.length === 1) {
    return {
      formal: `${cleanName}姑娘`,
      familiar: cleanName,
    };
  }

  const compoundSurname = compoundSurnames.find((surname) => cleanName.startsWith(surname));
  const surname = compoundSurname ?? cleanName.slice(0, 1);
  const familiar = cleanName.slice(surname.length) || cleanName;

  return {
    formal: `${surname}姑娘`,
    familiar,
  };
}
