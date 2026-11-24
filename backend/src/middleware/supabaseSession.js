const HttpError = require('../utils/httpError');
const { verifyAccessToken } = require('../services/supabase.service');
const { getPool } = require('../store/postgres');

const requireSupabaseIdentity = async (request, response, next) => {
  try {
    if (request.supabaseUser && request.supabaseSession?.sessionId) return next();
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization || '');
    if (!match || match[1].length > 8192) throw new HttpError(401, 'Sess\u00e3o inv\u00e1lida ou expirada.');
    const verified = await verifyAccessToken(match[1]);
    if (!verified) throw new HttpError(401, 'Sess\u00e3o inv\u00e1lida ou expirada.');

    const { rows: [activeSession] } = await getPool().query(
      `select u.id, u.email, u.email_confirmed_at, u.confirmed_at,
              u.raw_user_meta_data, u.raw_app_meta_data
       from auth.sessions s
       join auth.users u on u.id = s.user_id
       where s.id = $1 and s.user_id = $2
         and (s.not_after is null or s.not_after > statement_timestamp())
         and (u.banned_until is null or u.banned_until <= statement_timestamp())`,
      [verified.sessionId, verified.user.id],
    );
    if (!activeSession) throw new HttpError(401, 'Sess\u00e3o inv\u00e1lida ou expirada.');

    const appMetadata = activeSession.raw_app_meta_data && typeof activeSession.raw_app_meta_data === 'object'
      ? activeSession.raw_app_meta_data : {};
    const providers = Array.isArray(appMetadata.providers) ? appMetadata.providers : [appMetadata.provider].filter(Boolean);
    request.supabaseUser = {
      id: activeSession.id,
      email: activeSession.email,
      email_confirmed_at: activeSession.email_confirmed_at,
      confirmed_at: activeSession.confirmed_at,
      user_metadata: activeSession.raw_user_meta_data && typeof activeSession.raw_user_meta_data === 'object'
        ? activeSession.raw_user_meta_data : {},
      app_metadata: appMetadata,
      identities: providers.map((provider) => ({ provider })),
    };
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
        if (!result.rowCount) throw new HttpError(403, 'Confirme o c\u00f3digo de seguran\u00e7a para continuar.', undefined, 'ADDITIONAL_VERIFICATION_REQUIRED');

        request.supabaseSession.authorizedAt = result.rows[0].authorized_at;
        next();
      } catch (error) { next(error); }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { requireAuthorizedSupabaseSession, requireSupabaseIdentity };
