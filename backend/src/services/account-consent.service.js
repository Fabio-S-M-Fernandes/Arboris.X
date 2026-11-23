const { getPool } = require('../store/postgres');
const HttpError = require('../utils/httpError');

const TERMS_VERSION = '2026-11-22';
const PRIVACY_VERSION = '2026-11-22';

const status = async (userId) => {
  const { rows: [row] } = await getPool().query(
    'select accepted_at, optional_cookies_accepted from public.account_consent where user_id = $1', [userId],
  );
  return { required: Boolean(row && !row.accepted_at), optionalCookiesAccepted: row?.optional_cookies_accepted === true };
};

const requireAccepted = async (userId) => {
  if ((await status(userId)).required) {
    throw new HttpError(403, 'Confirme os Termos de Uso e a Política de Privacidade para continuar.', undefined, 'TERMS_REQUIRED');
  }
};

const accept = async (userId, optionalCookiesAccepted) => {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const { rows: [row] } = await client.query(
      'select accepted_at from public.account_consent where user_id = $1 for update', [userId],
    );
    if (!row) throw new HttpError(409, 'Esta conta não possui um aceite pendente.', undefined, 'CONSENT_NOT_PENDING');
    if (!row.accepted_at) {
      await client.query(
        'update public.account_consent set accepted_at = now(), optional_cookies_accepted = $2 where user_id = $1',
        [userId, optionalCookiesAccepted === true],
      );
      await client.query(
        `insert into public.terms_acceptances (user_id, terms_version, privacy_version)
         values ($1, $2, $3) on conflict (user_id, terms_version, privacy_version) do nothing`,
        [userId, TERMS_VERSION, PRIVACY_VERSION],
      );
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release(); }
};

const decline = async (userId) => {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const { rows: [row] } = await client.query(
      'select accepted_at from public.account_consent where user_id = $1 for update', [userId],
    );
    if (!row || row.accepted_at) throw new HttpError(409, 'Esta conta não possui um aceite pendente.', undefined, 'CONSENT_NOT_PENDING');
    const authorization = await client.query('select 1 from public.authorized_sessions where user_id = $1 limit 1', [userId]);
    if (authorization.rowCount) throw new HttpError(409, 'Esta conta já possui acesso autorizado.', undefined, 'ACCOUNT_ALREADY_AUTHORIZED');
    // Deleting the auth user also removes project rows and Supabase sessions via FKs.
    const deleted = await client.query('delete from auth.users where id = $1', [userId]);
    if (deleted.rowCount !== 1) throw new HttpError(409, 'Não foi possível excluir esta conta.', undefined, 'ACCOUNT_DELETE_FAILED');
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release(); }
};

module.exports = { status, requireAccepted, accept, decline };
