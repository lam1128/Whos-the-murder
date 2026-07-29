import { Weapon } from "./oldSluiceTypes";

export const weaponLabels: Record<Weapon, string> = {
  剑: "剑",
  匕首: "匕首",
  枪: "长枪",
  体: "体术",
};

export function getWeaponLabel(weapon: Weapon): string {
  return weaponLabels[weapon];
}
