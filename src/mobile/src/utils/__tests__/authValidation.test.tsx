import {
  getPasswordRequirements,
  getPasswordStrength,
  isPasswordStrong,
  isValidEmail,
  isValidUsername,
} from '@/utils/authValidation';

describe('isValidEmail', () => {
  it('accepts well-formed addresses and trims whitespace', () => {
    expect(isValidEmail(' user@example.com ')).toBe(true);
    expect(isValidEmail('user@example.co.uk')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });
});

describe('isValidUsername', () => {
  it('accepts 3-30 alphanumeric usernames', () => {
    expect(isValidUsername('johndoe')).toBe(true);
    expect(isValidUsername('abc')).toBe(true);
    expect(isValidUsername('Jane123')).toBe(true);
  });

  it('rejects invalid usernames', () => {
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('a'.repeat(31))).toBe(false);
    expect(isValidUsername('john!doe')).toBe(false);
    expect(isValidUsername('john doe')).toBe(false);
  });
});

describe('getPasswordRequirements', () => {
  /**
   * Verify every standard password rule is evaluated independently.
   */
  it('evaluates length, case, number, and special rules', () => {
    expect(getPasswordRequirements('short')).toEqual({
      length: false,
      uppercase: false,
      lowercase: true,
      number: false,
      special: false,
    });
    expect(getPasswordRequirements('Password1!')).toEqual({
      length: true,
      uppercase: true,
      lowercase: true,
      number: true,
      special: true,
    });
  });
});

describe('isPasswordStrong', () => {
  /**
   * Verify a password must satisfy every strength rule to be considered strong.
   */
  it('requires length, uppercase, lowercase, number, and special', () => {
    expect(isPasswordStrong('Password1')).toBe(false);
    expect(isPasswordStrong('password1!')).toBe(false);
    expect(isPasswordStrong('PASSWORD1!')).toBe(false);
    expect(isPasswordStrong('Password!')).toBe(false);
    expect(isPasswordStrong('Password1!')).toBe(true);
  });
});

describe('getPasswordStrength', () => {
  /**
   * Verify the strength meter normalizes rule coverage into a 0-4 score.
   */
  it('maps rule coverage to a score and label', () => {
    expect(getPasswordStrength('')).toEqual({ score: 0, label: '' });
    expect(getPasswordStrength('short')).toEqual({ score: 0, label: 'Weak' });
    expect(getPasswordStrength('password')).toEqual({ score: 1, label: 'Weak' });
    expect(getPasswordStrength('Password1')).toEqual({ score: 3, label: 'Good' });
    expect(getPasswordStrength('Password1!')).toEqual({ score: 4, label: 'Strong' });
  });
});
