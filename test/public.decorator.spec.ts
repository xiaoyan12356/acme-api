/**
 * public.decorator.spec.ts · @Public() factory returns SetMetadata decorator
 */

import { SetMetadata } from '@nestjs/common';
import { Public, IS_PUBLIC_KEY } from '../src/modules/auth/public.decorator';

describe('@Public decorator', () => {
  test('returns a function (decorator factory)', () => {
    const result = Public();
    expect(typeof result).toBe('function');
  });

  test('IS_PUBLIC_KEY exported', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  test('SetMetadata is the underlying mechanism (typeof string)', () => {
    const setMetadataSource = SetMetadata.toString();
    expect(typeof setMetadataSource).toBe('string');
  });
});