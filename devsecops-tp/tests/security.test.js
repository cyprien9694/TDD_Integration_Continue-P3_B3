// Tests de régression de sécurité : chacun échoue avec l'ancien code, passe avec le correctif.
const request = require('supertest');
const app = require('../src/app');

describe('XSS réfléchie sur /hello', () => {
  test('should escape HTML when name contains a script tag', async () => {
    const payload = '<script>alert(1)</script>';
    const res = await request(app).get('/hello').query({ name: payload });
    expect(res.text).not.toContain('<script>');
    expect(res.text).toContain('&lt;script&gt;');
  });

  test('should escape attribute-breaking characters when name contains quotes', async () => {
    const res = await request(app).get('/hello').query({ name: '"><img src=x onerror=alert(1)>' });
    expect(res.text).not.toContain('<img');
  });
});

describe('Injection de commande sur /ping', () => {
  test.each([
    ['semicolon chaining', '127.0.0.1; echo PWNED'],
    ['command substitution', '$(echo PWNED)'],
    ['backticks', '`echo PWNED`'],
    ['pipe', '127.0.0.1 | echo PWNED'],
    ['option injection', '-c 100 127.0.0.1'],
  ])('should reject the host with 400 when using %s', async (_label, host) => {
    const res = await request(app).get('/ping').query({ host });
    expect(res.status).toBe(400);
    expect(res.text).not.toContain('PWNED');
  });

  test('should reject the request with 400 when host is repeated (array)', async () => {
    const res = await request(app).get('/ping?host=a.com&host=b.com');
    expect(res.status).toBe(400);
  });
});

describe('Pollution de prototype / mass assignment sur /prefs', () => {
  test('should not pollute Object.prototype when query contains constructor.prototype', async () => {
    await request(app).get('/prefs?constructor[prototype][polluted]=yes');
    await request(app).get('/prefs?__proto__[polluted]=yes');
    expect({}.polluted).toBeUndefined();
  });

  test('should ignore unknown keys when query contains extra parameters', async () => {
    const res = await request(app).get('/prefs?theme=dark&isAdmin=true&constructor[prototype][x]=1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ theme: 'dark', lang: 'fr' });
  });

  test('should return defaults when no parameter is given', async () => {
    const res = await request(app).get('/prefs');
    expect(res.body).toEqual({ theme: 'light', lang: 'fr' });
  });

  test('should reject the value with 400 when theme is not allowed', async () => {
    const res = await request(app).get('/prefs?theme=<script>');
    expect(res.status).toBe(400);
  });
});
