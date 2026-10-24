import { expect, test } from 'vitest';
import { playerHeaders, applicationId } from './identity';

test('identifies only official YouTube embed requests without forwarding app origins', () => {
  expect(
    playerHeaders('https://www.youtube.com/embed/abcdefghijk', {
      Referer: 'file:///private/local/path',
      Other: 'kept',
    }),
  ).toEqual({ Referer: `https://${applicationId}`, Other: 'kept' });
  const headers = { Other: 'kept' };
  expect(playerHeaders('https://www.youtube.com/iframe_api', headers)).toEqual(headers);
  expect(playerHeaders('https://example.com/embed/abcdefghijk', headers)).toEqual(headers);
});
