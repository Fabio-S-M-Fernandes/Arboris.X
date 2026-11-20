import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './authMessages';

describe('authErrorMessage', () => {
  it('prioriza códigos estruturados de autenticação e OTP', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'internal' }, 'login')).toBe('E-mail ou senha incorretos.');
    expect(authErrorMessage({ code: 'OTP_INCORRECT' }, 'otp')).toContain('Código incorreto');
  });

  it('não mostra mensagens técnicas desconhecidas ao usuário', () => {
    expect(authErrorMessage({ code: 'DATABASE_CONN', message: 'password=secret' }, 'login')).toBe('Não foi possível entrar agora. Tente novamente.');
    expect(authErrorMessage({ status: 429, message: 'HTTP 429' }, 'recovery')).toContain('Muitas tentativas');
    expect(authErrorMessage({ code: 'email_not_confirmed' }, 'recovery')).toBe('Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.');
    expect(authErrorMessage({ code: 'otp_expired' }, 'link')).toBe('Este link expirou. Solicite outro.');
  });
});
