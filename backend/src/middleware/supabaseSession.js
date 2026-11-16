const HttpError = require('../utils/httpError');
const { verifyAccessToken } = require('../services/supabase.service');
const { getPool } = require('../store/postgres');

const requireSupabaseIdentity = async (request, response, next) => {
  try {
    if (request.supabaseUser && request.supabaseSession?.sessionId) return next();
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization || '');
    if (!match || match[1].length > 8192) throw new HttpError(401, 'Sessão inválida ou expirada.');
    const verified = await verifyAccessToken(match[1]);
    if (!verified) throw new HttpError(401, 'Sessão inválida ou expirada.');

    const activeSession = await getPool().query(
      `select 1 from auth.sessions
       where id = $1 and user_id = $2
         and (not_after is null or not_after > statement_timestamp())`,
      [verified.sessionId, verified.user.id],
    );
    if (!activeSession.rowCount) throw new HttpError(401, 'Sessão inválida ou expirada.');

    request.supabaseUser = verified.user;
    request.supabaseSession = { sessionId: verified.sessionId, claims: verified.claims };
    next();
  } catch (error) {
    next(error);
  }
};

const requireAuthorizedSupabaseSession = async (request, response, next) => {
  try {
    await requireSupabaseIdentity(request, response, async (identityError) => {
      if (identityError) return next(identityError);

      try {
        const result = await getPool().query(
          `select authorized_at from public.authorized_sessions
           where user_id = $1 and session_id = $2 and revoked_at is null`,
          [request.supabaseUser.id, request.supabaseSession.sessionId],
        );
        if (!result.rowCount) throw new HttpError(403, 'Confirme o código de segurança para continuar.', undefined, 'ADDITIONAL_VERIFICATION_REQUIRED');

        request.supabaseSession.authorizedAt = result.rows[0].authorized_at;
        next();
      } catch (error) { next(error); }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { requireAuthorizedSupabaseSession, requireSupabaseIdentity };
