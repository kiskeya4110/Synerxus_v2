export const UN_SDG_ICONS: Record<number, string | undefined> = {};

export function getSDGIcon(sdgNumber: number): string | undefined {
  return UN_SDG_ICONS[sdgNumber];
}

export default UN_SDG_ICONS;
