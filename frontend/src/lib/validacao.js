export const SENHA_MIN = 6

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validarEmail = (email = '') => {
  const valor = email.trim()
  if (!valor) return 'E-mail obrigatório.'
  if (!EMAIL_REGEX.test(valor)) return 'Formato de e-mail inválido.'
  return null
}

export const validarSenha = (senha = '') => {
  if (!senha) return 'Senha obrigatória.'
  if (senha.length < SENHA_MIN) return `A senha precisa ter no mínimo ${SENHA_MIN} caracteres.`
  return null
}

export const validarNome = (nome = '') => {
  if (!nome.trim()) return 'Nome obrigatório.'
  return null
}

// Remove as chaves sem erro, para `Object.keys(erros).length === 0` significar "válido".
const compactar = (erros) =>
  Object.fromEntries(Object.entries(erros).filter(([, msg]) => msg))

export const validarLogin = ({ email, senha }) =>
  compactar({
    email: validarEmail(email),
    senha: validarSenha(senha),
  })

export const validarCadastro = ({ nome, email, senha }, termosAceitos) =>
  compactar({
    nome: validarNome(nome),
    email: validarEmail(email),
    senha: validarSenha(senha),
    termos: termosAceitos ? null : 'Aceite os Termos de Uso e a Política de Privacidade.',
  })
