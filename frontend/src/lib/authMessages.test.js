import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './authMessages';

describe('authErrorMessage', () => {
  it('prioriza códigos estruturados de autenticação e OTP', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'internal' }, 'login')).toContain('Se ainda não tem conta, crie uma');
    expect(authErrorMessage({ code: 'OTP_INCORRECT' }, 'otp')).toContain('Código incorreto');
  });

  it('orienta quem tenta cadastrar um e-mail já usado sem expor erros técnicos', () => {
    const message = authErrorMessage({ code: 'email_exists' }, 'signup');
    expect(message).toContain('Este e-mail já está cadastrado');
    expect(message).toContain('recupere a senha');
  });

  it('explica o caminho alternativo quando o Supabase oculta se o e-mail existe', () => {
    expect(authErrorMessage({ code: 'invalid_credentials' }, 'login')).toContain('Não foi possível localizar uma conta com esses dados');
    expect(authErrorMessage({ code: 'over_email_send_rate_limit' }, 'recovery')).toContain('Aguarde');
  });

  it('não mostra mensagens técnicas desconhecidas ao usuário', () => {
    expect(authErrorMessage({ code: 'DATABASE_CONN', message: 'password=secret' }, 'login')).toBe('Não foi possível entrar agora. Tente novamente.');
    expect(authErrorMessage({ status: 429, message: 'HTTP 429' }, 'recovery')).toContain('Muitas tentativas');
    expect(authErrorMessage({ code: 'email_not_confirmed' }, 'recovery')).toBe('Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.');
    expect(authErrorMessage({ code: 'otp_expired' }, 'link')).toBe('Este link expirou. Solicite outro.');
  });
});
