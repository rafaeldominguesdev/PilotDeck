const EMAIL = /^[^\s@]+@[^\s@]+$/;

export function canCreateFirstAdmin(userCount: number): boolean {
  return userCount === 0;
}

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}
