// Matches app.py's _DEMO_ACCOUNT_NOT_AUTHORIZED verbatim -- the backend
// raises this exact 403 (via _verify_supabase_jwt, so it applies to every
// endpoint behind get_user_id_header) when DEMO_ALLOWED_EMAILS is set and
// the authenticated account's email isn't in it. Kept as a plain string
// match (not a structured error code) to stay a drop-in, non-breaking
// addition to the existing `detail` convention used throughout app.py.
export const DEMO_ACCESS_RESTRICTED_DETAIL = "This account is not authorized on this deployment.";

export function isDemoAccessRestrictedResponse(status, detail) {
    return status === 403 && detail === DEMO_ACCESS_RESTRICTED_DETAIL;
}
