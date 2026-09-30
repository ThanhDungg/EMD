import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  addCascadeLists,
  splitNameId,
  withIdSuffix,
} from './excel.js';

describe('splitNameId', () => {
  it('bóc được "Tên (id)"', () => {
    expect(splitNameId('Phòng kế toán (12)')).toEqual({
      name: 'Phòng kế toán',
      id: 12,
    });
  });

  it('bóc được đường dẫn vị trí kèm (id) ở cuối', () => {
    expect(splitNameId('Tầng 1 > Phòng kế toán (12)')).toEqual({
      name: 'Tầng 1 > Phòng kế toán',
      id: 12,
    });
  });

  it('tên thuần không có hậu tố thì id null', () => {
    expect(splitNameId('Phòng kế toán')).toEqual({
      name: 'Phòng kế toán',
      id: null,
    });
  });

  it('ngoặc không phải số thì vẫn là tên thuần', () => {
    expect(splitNameId('Máy bơm (2HP)')).toEqual({
      name: 'Máy bơm (2HP)',
      id: null,
    });
    expect(splitNameId('Kho ()')).toEqual({ name: 'Kho ()', id: null });
  });

  it('chỉ có "(id)" thì tên rỗng', () => {
    expect(splitNameId('(7)')).toEqual({ name: '', id: 7 });
  });

  it('chịu được khoảng trắng thừa', () => {
    expect(splitNameId('  Phòng A   ( 12 )  ')).toEqual({
      name: 'Phòng A',
      id: 12,
    });
  });
});

describe('withIdSuffix', () => {
  it('ghép "Tên (id)"', () => {
    expect(withIdSuffix('Phòng kế toán', 12)).toBe('Phòng kế toán (12)');
  });

  it('chưa có id thì giữ nguyên tên', () => {
    expect(withIdSuffix('Phòng kế toán', null)).toBe('Phòng kế toán');
    expect(withIdSuffix('Phòng kế toán', undefined)).toBe('Phòng kế toán');
  });

  it('round-trip với splitNameId', () => {
    const text = withIdSuffix('Tầng 1 > Phòng A', 5);
    expect(splitNameId(text)).toEqual({ name: 'Tầng 1 > Phòng A', id: 5 });
  });
});

describe('addCascadeLists', () => {
  it('siteLabel tùy biến chuỗi hiện trong dropdown Dự án', () => {
    const workbook = new ExcelJS.Workbook();
    const cascade = addCascadeLists(
      workbook,
      [{ id: 3, name: 'Tòa A' }],
      [{ id: 12, name: 'Phòng A', siteId: 3, parentId: null }],
      { siteLabel: (site) => withIdSuffix(site.name, site.id) },
    );
    expect(cascade).not.toBeNull();
    const lists = workbook.getWorksheet('_lists');
    expect(lists?.getCell('A2').value).toBe('Tòa A (3)');
    expect(cascade?.locationFormulaByName('B', 2)).toBe(
      'INDIRECT("LOC_"&MATCH($B2,SITE_NAMES,0))',
    );
  });

  it('mặc định vẫn hiện tên thuần (module vị trí không đổi)', () => {
    const workbook = new ExcelJS.Workbook();
    addCascadeLists(
      workbook,
      [{ id: 3, name: 'Tòa A' }],
      [{ id: 12, name: 'Phòng A', siteId: 3, parentId: null }],
    );
    expect(workbook.getWorksheet('_lists')?.getCell('A2').value).toBe('Tòa A');
  });
});
