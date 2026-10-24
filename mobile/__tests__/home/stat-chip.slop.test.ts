// K3 touch targets: a stat chip keeps its look while compact and takes the missing height from the gaps around it.
import { statSlop } from '../../src/screens/home/parts/stat-chip';

describe('statSlop', () => {
  test('a compact chip shorter than 44 pt grows evenly above and below', () => {
    // 8 + 20 + 8 = 36 pt drawn → 4 pt each side
    expect(statSlop(20)).toEqual({ top: 4, bottom: 4 });
  });

  test('no slop once the line alone makes the chip 44 pt, nor before the line is measured (still tall)', () => {
    expect(statSlop(28)).toEqual({ top: 0, bottom: 0 });
    expect(statSlop(34)).toEqual({ top: 0, bottom: 0 });
    expect(statSlop(0)).toEqual({ top: 0, bottom: 0 });
  });
});
