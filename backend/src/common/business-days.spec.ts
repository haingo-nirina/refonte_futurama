import { addBusinessDays } from './business-days';

describe('addBusinessDays', () => {
  it('saute le week-end', () => {
    // vendredi 23/10/2026 + 1 jour ouvre -> lundi 26/10
    expect(addBusinessDays(new Date(2026, 9, 23), 1)).toEqual(
      new Date(2026, 9, 26),
    );
  });

  it('saute les jours feries', () => {
    // vendredi 30/10/2026 + 1 -> lundi 02/11 (le 01/11 tombe un dimanche)
    expect(addBusinessDays(new Date(2026, 9, 30), 1)).toEqual(
      new Date(2026, 10, 2),
    );
    // jeudi 24/12/2026 + 1 -> lundi 28/12 (Noel le vendredi)
    expect(addBusinessDays(new Date(2026, 11, 24), 1)).toEqual(
      new Date(2026, 11, 28),
    );
  });

  it('rend le jour meme pour un delai nul', () => {
    const today = new Date(2026, 9, 23);
    expect(addBusinessDays(today, 0)).toEqual(today);
  });
});
