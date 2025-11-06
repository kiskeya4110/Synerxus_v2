import sdg1 from '@assets/stock_images/E_SDG_PRINT-01.jpg';
import sdg2 from '@assets/stock_images/E_SDG_PRINT-02.jpg';
import sdg3 from '@assets/stock_images/E_SDG_PRINT-03.jpg';
import sdg4 from '@assets/stock_images/E_SDG_PRINT-04.jpg';
import sdg5 from '@assets/stock_images/E_SDG_PRINT-05.jpg';
import sdg6 from '@assets/stock_images/E_SDG_PRINT-06.jpg';
import sdg7 from '@assets/stock_images/E_SDG_PRINT-07.jpg';
import sdg8 from '@assets/stock_images/E_SDG_PRINT-08.jpg';
import sdg9 from '@assets/stock_images/E_SDG_PRINT-09.jpg';
import sdg10 from '@assets/stock_images/E_SDG_PRINT-10.jpg';
import sdg11 from '@assets/stock_images/E_SDG_PRINT-11.jpg';
import sdg12 from '@assets/stock_images/E_SDG_PRINT-12.jpg';
import sdg13 from '@assets/stock_images/E_SDG_PRINT-13.jpg';
import sdg14 from '@assets/stock_images/E_SDG_PRINT-14.jpg';
import sdg15 from '@assets/stock_images/E_SDG_PRINT-15.jpg';
import sdg16 from '@assets/stock_images/E_SDG_PRINT-16.jpg';
import sdg17 from '@assets/stock_images/E_SDG_PRINT-17.jpg';

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
