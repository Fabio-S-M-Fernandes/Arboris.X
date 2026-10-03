import { describe, it, expect } from 'vitest'
import { validarEmail, validarSenha, validarNome, validarLogin, validarCadastro } from './validacao'

describe('validacao', () => {
  it('exige e-mail e valida o formato', () => {
    expect(validarEmail('')).toBe('E-mail obrigatório.')
    expect(validarEmail('   ')).toBe('E-mail obrigatório.')
    expect(validarEmail('invalido@')).toBe('Formato de e-mail inválido.')
    expect(validarEmail(' user@arboris.x ')).toBeNull()
  })

  it('exige senha com no mínimo 6 caracteres', () => {
    expect(validarSenha('')).toBe('Senha obrigatória.')
    expect(validarSenha('12345')).toMatch(/mínimo 6/)
    expect(validarSenha('123456')).toBeNull()
  })

  it('exige nome não vazio', () => {
    expect(validarNome('  ')).toBe('Nome obrigatório.')
    expect(validarNome('Ana')).toBeNull()
  })

  it('validarLogin retorna só os campos com erro', () => {
    expect(validarLogin({ email: 'a@b.co', senha: '123' })).toEqual({
      senha: expect.stringMatching(/mínimo/),
    })
    expect(validarLogin({ email: 'a@b.co', senha: '123456' })).toEqual({})
  })

  it('validarCadastro exige aceite dos termos', () => {
    const dados = { nome: 'Ana', email: 'a@b.co', senha: '123456' }
    expect(Object.keys(validarCadastro(dados, false))).toEqual(['termos'])
    expect(validarCadastro(dados, true)).toEqual({})
  })
})
