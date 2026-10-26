import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import { setCachedAccessToken, getAuthHeaders } from "../lib/apiAuth";
import { associateReferralCode, getStoredReferralCode } from "../lib/referral";
import { getApiUrl } from "../config";
import { isDemoAccessRestrictedResponse } from "../lib/demoAccess";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // null = not checked yet (or not logged in), true = this account is
    // blocked on this reserved deployment (DEMO_ALLOWED_EMAILS), false =
    // allowed. ProtectedRoute renders AccessRestrictedPage instead of any
    // dashboard route -- even a direct/deep-linked URL -- while this is
    // true, so this must resolve before any dashboard content is shown.
    const [isAccessRestricted, setIsAccessRestricted] = useState(null);

    useEffect(() => {
        const supabase = getSupabaseBrowserClient();
        let mounted = true;

        supabase.auth.getSession().then(({ data, error }) => {
            if (!mounted) return;

            if (error) {
                setCachedAccessToken(null);
                setSession(null);
                setUser(null);
                setLoading(false);
                return;
            }

            // Security: pushed synchronously, in this same callback and
            // before the state update below triggers dependent effects
            // elsewhere (useEffects keyed on `isAuthenticated`/`user.id`) --
            // otherwise those effects' first fetch races an independent,
            // still-pending token lookup and gets sent without a token,
            // failing auth (see apiAuth.js for the full race explanation).
            setCachedAccessToken(data.session?.access_token ?? null);
            setSession(data.session ?? null);
            setUser(data.session?.user ?? null);
            setLoading(false);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setCachedAccessToken(nextSession?.access_token ?? null);
            setSession(nextSession ?? null);
            setUser(nextSession?.user ?? null);
            setLoading(false);
        });

        return () => {
            mounted = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Retries the referral association on every authenticated session this
    // browser gets, as long as a code is still stored -- covers OAuth
    // signup, and email/password signup when Supabase requires email
    // confirmation (signUp() returns no session, so Login.jsx's own
    // immediate attempt 401s before a session exists; the code is only
    // cleared on a terminal response, see associateReferralCode, so it
    // survives for this effect to pick up once the user actually confirms
    // and signs in). No freshness heuristic needed here: the backend
    // independently re-verifies the account is new enough before granting
    // anything, so attempting this for a long-stale code is harmless --
    // it just comes back {"associated": false} and clears it.
    useEffect(() => {
        if (!user) return;
        const referralCode = getStoredReferralCode();
        if (!referralCode) return;
        associateReferralCode(user.id, referralCode);
    }, [user]);

    // Any authenticated endpoint 403s with this exact detail when
    // DEMO_ALLOWED_EMAILS is set and this account's email isn't in it (see
    // _verify_supabase_jwt in app.py) -- /api/user/credits is used here
    // purely as a cheap, already-always-called-on-login probe for that,
    // not for its own data. Resolved as soon as a user exists, before any
    // dashboard route is allowed to render.
    useEffect(() => {
        if (!user?.id) {
            setIsAccessRestricted(null);
            return;
        }
        let active = true;
        fetch(getApiUrl("/api/user/credits"), { headers: getAuthHeaders(user.id) })
            .then(async (res) => {
                if (!active) return;
                if (res.status === 403) {
                    const data = await res.json().catch(() => ({}));
                    setIsAccessRestricted(isDemoAccessRestrictedResponse(res.status, data?.detail));
                    return;
                }
                setIsAccessRestricted(false);
            })
            .catch(() => {
                // A transient network/server error must never strand a
                // legitimate user on the restricted screen -- only an
                // explicit, confirmed 403 with the demo-block detail does.
                if (active) setIsAccessRestricted(false);
            });
        return () => {
            active = false;
        };
    }, [user?.id]);

    async function logout() {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
    }

    const value = useMemo(
        () => ({
            session,
            user,
            loading,
            isAuthenticated: Boolean(user),
            isAccessRestricted,
            logout,
        }),
        [session, user, loading, isAccessRestricted]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);

    if (!ctx) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return ctx;
}