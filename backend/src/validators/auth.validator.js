const HttpError = require('../utils/httpError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateCredentials = ({ nome, email, senha, termosAceitos }, isRegistration) => {
  const errors = {};
  if (isRegistration && !String(nome || '').trim()) errors.nome = 'Nome obrigatório.';
  if (!String(email || '').trim()) errors.email = 'E-mail obrigatório.';
  else if (!EMAIL_REGEX.test(String(email).trim())) errors.email = 'Formato de e-mail inválido.';
  if (!senha) errors.senha = 'Senha obrigatória.';
  else if (String(senha).length < 6) errors.senha = 'A senha precisa ter no mínimo 6 caracteres.';
  if (isRegistration && termosAceitos !== true) errors.termos = 'Aceite os Termos de Uso e a Política de Privacidade.';
  if (Object.keys(errors).length) throw new HttpError(422, 'Revise os dados informados.', errors);
};

module.exports = { validateCredentials };
