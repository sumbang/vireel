import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    BarChart3,
    Coins,
    Facebook,
    Instagram,
    Linkedin,
    Loader2,
    Minus,
    RefreshCw,
    Twitch,
    TrendingDown,
    TrendingUp,
    Youtube,
} from "lucide-react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from "recharts";
import { useAuth } from "../../state/AuthContext";
import { useUserCredits } from "../../state/UserCreditsContext";
import { getApiUrl } from "../../config";
import { getAuthHeaders } from "../../lib/apiAuth";
import { useTranslation } from "../../state/LanguageContext";

// "linkedin" itself (the publishing connection) has no analytics scope --
// LinkedIn requires a separate app/connection for r_member_postAnalytics,
// stored as its own "linkedin_analytics" platform (see Settings.jsx and
// PLATFORM_CONFIG["linkedin_analytics"] in app.py).
const INSIGHTS_PLATFORMS = ["facebook", "instagram", "youtube", "tiktok", "linkedin_analytics"];
const COMING_SOON_PLATFORMS = [];

const PLATFORM_ICONS = { facebook: Facebook, instagram: Instagram, youtube: Youtube, linkedin: Linkedin, linkedin_analytics: BarChart3, tiktok: Twitch };
const PLATFORM_LABELS = { facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", linkedin: "LinkedIn", linkedin_analytics: "LinkedIn (Analytics)", tiktok: "TikTok" };

const METRIC_DEFS = [
    { key: "followers", labelKey: "dashboard.metricFollowers", fallback: "Abonnés" },
    { key: "impressions", labelKey: "dashboard.metricImpressions", fallback: "Impressions" },
    { key: "reach", labelKey: "dashboard.metricReach", fallback: "Portée" },
    { key: "engagement", labelKey: "dashboard.metricEngagement", fallback: "Engagement" },
    { key: "profile_views", labelKey: "dashboard.metricProfileViews", fallback: "Vues du profil" },
    { key: "views", labelKey: "dashboard.metricViews", fallback: "Vues" },
    { key: "follows_gained", labelKey: "dashboard.metricFollowsGained", fallback: "Nouveaux abonnés" },
    { key: "follows_lost", labelKey: "dashboard.metricFollowsLost", fallback: "Abonnés perdus" },
    { key: "watch_time_minutes", labelKey: "dashboard.metricWatchTime", fallback: "Minutes visionnées" },
    { key: "subscribers_gained", labelKey: "dashboard.metricSubscribersGained", fallback: "Abonnés gagnés" },
    { key: "subscribers_lost", labelKey: "dashboard.metricSubscribersLost", fallback: "Abonnés perdus" },
    { key: "likes", labelKey: "dashboard.metricLikes", fallback: "Mentions J'aime" },
    { key: "comments", labelKey: "dashboard.metricComments", fallback: "Commentaires" },
];

const CARD_CLASS = "rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.03]";

// A diverse categorical palette for the per-account chart's series -- one
// hue per line so metrics stay visually distinct even when a platform
// exposes many of them at once (e.g. YouTube's 6 metrics), rather than
// shades of a single platform brand color which read as near-identical.
const CHART_LINE_COLORS = [
    "#3b82f6", // blue
    "#f59e0b", // amber
    "#10b981", // emerald
    "#ef4444", // red
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#ec4899", // pink
    "#84cc16", // lime
];

function formatChangePct(pct) {
    if (pct === null || pct === undefined || Number.isNaN(pct)) return null;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
}

function formatCentsToCurrency(cents) {
    if (cents === null || cents === undefined || Number.isNaN(cents)) return null;
    return `$${(cents / 100).toFixed(2)}`;
}

function TrendBadge({ trend }) {
    if (!trend) return null;
    const { direction, change_pct } = trend;
    const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
    const colorClass =
        direction === "up"
            ? "text-emerald-500"
            : direction === "down"
            ? "text-red-500"
            : "text-slate-400 dark:text-zinc-500";
    const pctLabel = formatChangePct(change_pct);
    return (
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold shrink-0 ${colorClass}`}>
            <Icon size={12} />
            {pctLabel ? <span>{pctLabel}</span> : null}
        </span>
    );
}

function MonetizationCard({ monetization, t }) {
    // supported === false means the platform's API doesn't offer this at
    // all (e.g. Instagram has no public monetization API) -- hide the
    // block entirely rather than explain that absence. available === false
    // with supported === true means the feature could work but has no data
    // right now (not enrolled in the program, missing scope, no data for
    // the period) -- that's still worth a quiet explanatory note.
    if (!monetization || monetization.supported === false) return null;

    if (monetization.available === false) {
        return (
            <div className={`${CARD_CLASS} p-4 flex items-center gap-3 bg-slate-50 dark:bg-white/[0.02]`}>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400 shrink-0">
                    <Coins size={16} />
                </span>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {monetization.reason ||
                        t("dashboard.monetizationUnavailable", "Donnees de monetisation non disponibles pour ce compte.")}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className={`${CARD_CLASS} p-4`}>
                <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {monetization.ad_impressions ?? 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {t("dashboard.monetizationAdImpressions", "Impressions publicitaires")}
                </p>
            </div>
            <div className={`${CARD_CLASS} p-4`}>
                <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {formatCentsToCurrency(monetization.ad_earnings_cents) ?? "—"}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {t("dashboard.monetizationAdEarnings", "Revenus publicitaires estimes")}
                </p>
            </div>
            <div className={`${CARD_CLASS} p-4`}>
                <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {formatCentsToCurrency(monetization.ad_cpm_cents) ?? "—"}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {t("dashboard.monetizationAdCpm", "CPM publicitaire moyen")}
                </p>
            </div>
        </div>
    );
}

async function fetchSocialAccounts(userId) {
    const response = await fetch(getApiUrl("/api/social/accounts"), {
        headers: getAuthHeaders(userId),
    });
    if (!response.ok) throw new Error("Unable to load social accounts");
    const data = await response.json();
    return Array.isArray(data?.accounts) ? data.accounts : [];
}

async function fetchInsights(userId, accountId, range) {
    const response = await fetch(getApiUrl(`/api/social/insights?account_id=${accountId}&range=${range}`), {
        headers: getAuthHeaders(userId),
    });
    if (!response.ok) throw new Error("Unable to load insights");
    return response.json();
}

async function refreshInsights(userId, accountId) {
    const response = await fetch(getApiUrl(`/api/social/insights/refresh?account_id=${accountId}`), {
        method: "POST",
        headers: getAuthHeaders(userId),
    });
    if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail || "Unable to refresh insights");
    }
    return response.json();
}

function formatLastSynced(isoString, t) {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return null;
    return t("dashboard.analyticsLastSynced", "Mis a jour {time}").replace(
        "{time}",
        date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
    );
}

// Ticks down to 0 once last_synced_at + cooldownSeconds is reached, so the
// refresh button can disable itself proactively instead of letting the
// user click it repeatedly and hit POST /refresh's 429 every time.
function useRefreshCooldownRemaining(lastSyncedAt, cooldownSeconds) {
    const [remaining, setRemaining] = useState(0);

    useEffect(() => {
        if (!lastSyncedAt || !cooldownSeconds) {
            setRemaining(0);
            return undefined;
        }
        const nextAllowedAt = new Date(lastSyncedAt).getTime() + cooldownSeconds * 1000;
        const tick = () => setRemaining(Math.max(0, Math.ceil((nextAllowedAt - Date.now()) / 1000)));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [lastSyncedAt, cooldownSeconds]);

    return remaining;
}

function ComingSoonCard({ platform, t }) {
    const Icon = PLATFORM_ICONS[platform];
    return (
        <div className={`${CARD_CLASS} p-4 flex items-center gap-3`}>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400">
                {Icon ? <Icon size={16} /> : null}
            </span>
            <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">{PLATFORM_LABELS[platform]}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {t("dashboard.analyticsComingSoon", "Bientot disponible, en cours de developpement")}
                </p>
            </div>
        </div>
    );
}

function AccountPicker({ accounts, selectedId, onSelect }) {
    if (accounts.length <= 1) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {accounts.map((account) => {
                const Icon = PLATFORM_ICONS[account.platform];
                const active = account.id === selectedId;
                return (
                    <button
                        key={account.id}
                        onClick={() => onSelect(account.id)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                            active
                                ? "bg-primary/15 border-primary/30 text-primary"
                                : "border-slate-300 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5"
                        }`}
                    >
                        {Icon ? <Icon size={14} /> : null}
                        {account.platform_account_name || PLATFORM_LABELS[account.platform] || account.platform}
                    </button>
                );
            })}
        </div>
    );
}

function RefreshInsightsButton({ onRefresh, refreshing, lastSyncedLabel, cooldownRemaining, t }) {
    const onCooldown = cooldownRemaining > 0;
    const cooldownLabel = t("dashboard.analyticsRefreshCooldown", "Disponible dans {s}s").replace("{s}", cooldownRemaining);
    return (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-500 dark:text-zinc-400">
            {lastSyncedLabel ? <span>{lastSyncedLabel}</span> : null}
            <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing || onCooldown}
                title={onCooldown ? cooldownLabel : undefined}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-300 dark:border-white/10 font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50"
            >
                <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                {onCooldown ? cooldownLabel : t("dashboard.analyticsRefresh", "Actualiser")}
            </button>
        </div>
    );
}

function AccountInsightsCard({ insights, loading, refreshing, refreshError, onRefresh, t }) {
    const availableMetrics = useMemo(() => {
        if (!insights?.metrics) return [];
        return METRIC_DEFS.filter((def) => insights.metrics[def.key] !== null && insights.metrics[def.key] !== undefined);
    }, [insights]);

    const dailySeriesKeys = useMemo(() => {
        const daily = Array.isArray(insights?.daily) ? insights.daily : [];
        if (daily.length === 0) return [];
        const keys = new Set();
        for (const entry of daily) {
            for (const [key, value] of Object.entries(entry)) {
                if (key === "date") continue;
                if (typeof value === "number") keys.add(key);
            }
        }
        return Array.from(keys);
    }, [insights]);

    const cooldownRemaining = useRefreshCooldownRemaining(insights?.last_synced_at, insights?.refresh_cooldown_seconds);

    if (loading) {
        return (
            <div className={`${CARD_CLASS} p-8 flex items-center justify-center`}>
                <Loader2 size={24} className="text-primary animate-spin" />
            </div>
        );
    }

    if (!insights) return null;

    // Structurally unsupported for this platform (a disabled feature toggle
    // like TIKTOK_INSIGHTS_ENABLED, or a platform with no insights scope at
    // all) -- no refresh button here, since POST /refresh would just 400
    // for the same reason (see refresh_social_insights in app.py).
    if (insights.supported === false) {
        return (
            <div className={`${CARD_CLASS} p-4 flex items-start gap-2`}>
                <AlertTriangle size={16} className="text-slate-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-500 dark:text-zinc-400">
                    {t("dashboard.analyticsPlatformUnsupported", "Analytics are not available yet for this platform.")}
                </p>
            </div>
        );
    }

    const lastSyncedLabel = formatLastSynced(insights.last_synced_at, t);

    if (insights.error) {
        return (
            <div className="space-y-2">
                <RefreshInsightsButton onRefresh={onRefresh} refreshing={refreshing} lastSyncedLabel={lastSyncedLabel} cooldownRemaining={cooldownRemaining} t={t} />
                <div className={`${CARD_CLASS} p-4 flex items-start gap-2`}>
                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                        {t("dashboard.analyticsAccountError", "Impossible de recuperer les statistiques (reconnectez ce compte dans Parametres).")}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <RefreshInsightsButton onRefresh={onRefresh} refreshing={refreshing} lastSyncedLabel={lastSyncedLabel} cooldownRemaining={cooldownRemaining} t={t} />
                {refreshError ? (
                    <p className="text-right text-xs text-amber-600 dark:text-amber-400">{refreshError}</p>
                ) : null}
            </div>

            {availableMetrics.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {availableMetrics.map((def) => {
                        const trend = insights?.trends?.[def.key];
                        return (
                            <div key={def.key} className={`${CARD_CLASS} p-4`}>
                                <div className="flex items-baseline justify-between gap-2">
                                    <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                                        {insights.metrics[def.key]}
                                    </p>
                                    <TrendBadge trend={trend} />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-zinc-400">{t(def.labelKey, def.fallback)}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {insights?.monetization !== undefined && (
                <MonetizationCard monetization={insights.monetization} t={t} />
            )}

            {dailySeriesKeys.length > 0 && (
                <div className={`${CARD_CLASS} p-4`}>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={insights.daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-white/10" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                {dailySeriesKeys.map((key, index) => {
                                    const metricDef = METRIC_DEFS.find((def) => def.key === key);
                                    return (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            name={metricDef ? t(metricDef.labelKey, metricDef.fallback) : key}
                                            stroke={CHART_LINE_COLORS[index % CHART_LINE_COLORS.length]}
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    );
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

function AnalyticsBody({ range, t }) {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [accountsError, setAccountsError] = useState("");
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [insightsByAccount, setInsightsByAccount] = useState({});
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [refreshingAccountId, setRefreshingAccountId] = useState("");
    const [refreshErrorsByAccount, setRefreshErrorsByAccount] = useState({});
    // Tracks which accounts already had an auto-refresh attempt this
    // session, so a never-synced account only gets auto-refreshed once
    // (the backend's own cooldown still protects against repeated manual
    // clicks, but this avoids firing one on every re-render/effect rerun).
    const autoRefreshedAccountsRef = useRef(new Set());

    useEffect(() => {
        if (!user?.id) return undefined;
        let cancelled = false;
        (async () => {
            try {
                setAccountsLoading(true);
                setAccountsError("");
                const all = await fetchSocialAccounts(user.id);
                if (cancelled) return;
                setAccounts(all);
                const insightAccounts = all.filter((a) => INSIGHTS_PLATFORMS.includes(a.platform));
                setSelectedAccountId((prev) => prev || insightAccounts[0]?.id || "");
            } catch (err) {
                if (!cancelled) setAccountsError(err.message || t("dashboard.analyticsAccountsError", "Impossible de charger les comptes sociaux."));
            } finally {
                if (!cancelled) setAccountsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id, t]);

    const insightAccounts = useMemo(
        () => accounts.filter((a) => INSIGHTS_PLATFORMS.includes(a.platform)),
        [accounts]
    );
    const comingSoonAccounts = useMemo(
        () => accounts.filter((a) => COMING_SOON_PLATFORMS.includes(a.platform)),
        [accounts]
    );

    const refreshAccount = useCallback(async (accountId) => {
        if (!user?.id || !accountId) return;
        setRefreshingAccountId(accountId);
        setRefreshErrorsByAccount((prev) => ({ ...prev, [accountId]: "" }));
        try {
            await refreshInsights(user.id, accountId);
            const data = await fetchInsights(user.id, accountId, range);
            setInsightsByAccount((prev) => ({ ...prev, [accountId]: data }));
        } catch (err) {
            setRefreshErrorsByAccount((prev) => ({
                ...prev,
                [accountId]: err.message || t("dashboard.analyticsRefreshFailed", "Actualisation impossible."),
            }));
        } finally {
            setRefreshingAccountId("");
        }
    }, [user?.id, range, t]);

    useEffect(() => {
        if (!user?.id || !selectedAccountId) return undefined;
        let cancelled = false;
        (async () => {
            try {
                setInsightsLoading(true);
                const data = await fetchInsights(user.id, selectedAccountId, range);
                if (cancelled) return;
                setInsightsByAccount((prev) => ({ ...prev, [selectedAccountId]: data }));

                // Never been synced (fresh connection, or synced before this
                // periodic-sync/weekly-trends feature existed) -- refresh
                // right away instead of waiting for the next periodic tick
                // or a manual click, so opening the dashboard or this
                // section always shows real data.
                const neverSynced = data?.supported !== false && !data?.error && !data?.last_synced_at;
                if (neverSynced && !autoRefreshedAccountsRef.current.has(selectedAccountId)) {
                    autoRefreshedAccountsRef.current.add(selectedAccountId);
                    refreshAccount(selectedAccountId);
                }
            } catch {
                if (!cancelled) {
                    setInsightsByAccount((prev) => ({
                        ...prev,
                        [selectedAccountId]: { error: "fetch_failed", metrics: null, daily: [] },
                    }));
                }
            } finally {
                if (!cancelled) setInsightsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id, selectedAccountId, range, refreshAccount]);

    const handleRefresh = () => refreshAccount(selectedAccountId);

    if (accountsLoading) {
        return (
            <div className="flex items-center justify-center h-40">
                <Loader2 size={28} className="text-primary animate-spin" />
            </div>
        );
    }

    if (accountsError) {
        return <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{accountsError}</div>;
    }

    const selectedAccount = insightAccounts.find((a) => a.id === selectedAccountId);

    return (
        <div className="space-y-4">
            {insightAccounts.length === 0 && comingSoonAccounts.length === 0 ? (
                <div className={`${CARD_CLASS} p-8 text-center text-sm text-slate-500 dark:text-zinc-400`}>
                    {t("dashboard.analyticsNoAccount", "Connectez un reseau social dans Parametres pour voir vos analyses.")}
                </div>
            ) : null}

            {insightAccounts.length > 0 && (
                <div className="space-y-3">
                    <AccountPicker accounts={insightAccounts} selectedId={selectedAccountId} onSelect={setSelectedAccountId} />
                    {selectedAccount && (
                        <AccountInsightsCard
                            insights={insightsByAccount[selectedAccountId]}
                            loading={insightsLoading}
                            refreshing={refreshingAccountId === selectedAccountId}
                            refreshError={refreshErrorsByAccount[selectedAccountId]}
                            onRefresh={handleRefresh}
                            t={t}
                        />
                    )}
                </div>
            )}

            {comingSoonAccounts.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                    {comingSoonAccounts.map((account) => (
                        <ComingSoonCard key={account.id} platform={account.platform} t={t} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function DashboardAnalyticsSection({ range }) {
    const { hasAnalyticsAccess } = useUserCredits();
    const { t } = useTranslation();

    // No active subscription, or a plan below priorite 2 (e.g. Silver),
    // doesn't get an upsell card here -- the whole block (including its
    // header) is simply absent for them.
    if (hasAnalyticsAccess === false) return null;

    return (
        <section className="space-y-6 rounded-3xl border border-slate-300 dark:border-white/10 p-6 bg-slate-50/60 dark:bg-white/[0.02]">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-zinc-500">
                    {t("dashboard.analyticsEyebrow", "Reseaux sociaux")}
                </p>
                <h3 className="mt-2 text-xl font-bold">{t("dashboard.analyticsTitle", "Analyses des reseaux sociaux")}</h3>
            </div>

            {hasAnalyticsAccess === null ? null : <AnalyticsBody range={range} t={t} />}
        </section>
    );
}
