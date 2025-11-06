import sdg1 from '@assets/stock_images/un_sustainable_devel_4732cbf0.jpg';
import sdg2 from '@assets/stock_images/un_sustainable_devel_61562165.jpg';
import sdg3 from '@assets/stock_images/un_sustainable_devel_acd81cc2.jpg';
import sdg4 from '@assets/stock_images/un_sustainable_devel_abf3d6f4.jpg';
import sdg5 from '@assets/stock_images/un_sustainable_devel_210b94f1.jpg';
import sdg6 from '@assets/stock_images/un_sustainable_devel_3115715a.jpg';
import sdg7 from '@assets/stock_images/un_sustainable_devel_902b0e2f.jpg';
import sdg8 from '@assets/stock_images/un_sustainable_devel_93656344.jpg';
import sdg9 from '@assets/stock_images/un_sustainable_devel_5cc4a17f.jpg';
import sdg10 from '@assets/stock_images/un_sustainable_devel_32667b78.jpg';
import sdg11 from '@assets/stock_images/un_sustainable_devel_41ca1d7c.jpg';
import sdg12 from '@assets/stock_images/un_sustainable_devel_80b15523.jpg';
import sdg13 from '@assets/stock_images/un_sustainable_devel_87c0c1cd.jpg';
import sdg14 from '@assets/stock_images/un_sustainable_devel_425b17ed.jpg';
import sdg15 from '@assets/stock_images/un_sustainable_devel_6c788a8e.jpg';
import sdg16 from '@assets/stock_images/un_sustainable_devel_0326ec38.jpg';
import sdg17 from '@assets/stock_images/un_sustainable_devel_dd6cec50.jpg';

export const UN_SDG_ICONS: Record<number, string> = {
  1: sdg1,
  2: sdg2,
  3: sdg3,
  4: sdg4,
  5: sdg5,
  6: sdg6,
  7: sdg7,
  8: sdg8,
  9: sdg9,
  10: sdg10,
  11: sdg11,
  12: sdg12,
  13: sdg13,
  14: sdg14,
  15: sdg15,
  16: sdg16,
  17: sdg17,
};

export function getSDGIcon(sdgNumber: number): string | undefined {
  return UN_SDG_ICONS[sdgNumber];
}

export default UN_SDG_ICONS;
