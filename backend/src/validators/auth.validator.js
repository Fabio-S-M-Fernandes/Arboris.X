const HttpError = require('../utils/httpError');
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateCredentials = (data, isRegistration) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(422, 'Revise os dados informados.');
  const { nome, email, senha, termosAceitos } = data;
  const errors = {};
  if (isRegistration && (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 120)) errors.nome = 'Informe um nome de até 120 caracteres.';
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_REGEX.test(email.trim())) errors.email = 'Informe um e-mail válido.';
  if (typeof senha !== 'string' || senha.length < 6) errors.senha = 'A senha precisa ter no mínimo 6 caracteres.';
  // bcrypt considera somente 72 bytes. Não mudamos a comparação de senhas legadas.
  else if (isRegistration && Buffer.byteLength(senha, 'utf8') > 72) errors.senha = 'A senha deve ter no máximo 72 bytes em UTF-8.';
  else if (senha.length > 1024) errors.senha = 'Senha inválida.';
  if (isRegistration && termosAceitos !== true) errors.termos = 'Aceite os Termos de Uso e a Política de Privacidade.';
  if (Object.keys(errors).length) throw new HttpError(422, 'Revise os dados informados.', errors);
};
module.exports = { validateCredentials };
