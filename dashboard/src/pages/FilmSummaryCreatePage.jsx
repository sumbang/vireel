import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Pause, Play } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiUrl, fetchAppConfig } from "../config";
import { getAuthHeaders } from "../lib/apiAuth";
import { useAuth } from "../state/AuthContext";
import { useUserCredits } from "../state/UserCreditsContext";
import { useTranslation } from "../state/LanguageContext";
import Breadcrumbs from "../components/Breadcrumbs";
import MediaInput from "../components/MediaInput";
import FilmSummaryProcessingPanel from "../components/FilmSummaryProcessingPanel";
import { errorMessageForCode, normalizeFilmSummaryJobStatus as normalizeStatus } from "../lib/filmSummary";

const NARRATION_STYLE_KEYS = [
    {
        value: "cinematic", labelKey: "filmSummary.narrationStyleCinematic", fallback: "Cinematographique",
        descKey: "filmSummary.narrationStyleCinematicDesc",
        descFallback: "Ton immersif proche d'une bande-annonce, met l'accent sur l'emotion et le suspense.",
    },
    {
        value: "dramatic", labelKey: "filmSummary.narrationStyleDramatic", fallback: "Dramatique",
        descKey: "filmSummary.narrationStyleDramaticDesc",
        descFallback: "Rythme soutenu qui insiste sur les enjeux et les tensions entre les personnages.",
    },
    {
        value: "documentary", labelKey: "filmSummary.narrationStyleDocumentary", fallback: "Documentaire",
        descKey: "filmSummary.narrationStyleDocumentaryDesc",
        descFallback: "Ton neutre et informatif, a la maniere d'une voix off de reportage.",
    },
    {
        value: "energetic", labelKey: "filmSummary.narrationStyleEnergetic", fallback: "Energique",
        descKey: "filmSummary.narrationStyleEnergeticDesc",
        descFallback: "Rythme rapide et dynamique, adapte a un resume court et percutant.",
    },
];

// Single-step creation: the user picks only the source video, the narration
// theme, the narrator voice and whether to burn in subtitles -- title and
// target duration are no longer asked for (see app.py's create_film_summary:
// the title is derived from the source filename/YouTube title, same
// convention reels/captions already use, and the duration is always
// auto-computed, capped around 8 minutes). Analysis and rendering now chain
// automatically server-side under a single job_id, with no manual review
// step in between.
export default function FilmSummaryCreatePage() {
    const { user } = useAuth();
    const { hasCredits } = useUserCredits();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const projectIdFromUrl = useMemo(() => new URLSearchParams(location.search || "").get("project_id") || "", [location.search]);

    const [jobId, setJobId] = useState("");
    const [status, setStatus] = useState(projectIdFromUrl ? "processing" : "idle");
    const [currentStep, setCurrentStep] = useState("");
    const [rawProgress, setRawProgress] = useState(null);
    const [error, setError] = useState("");
    const [projectJobLoading, setProjectJobLoading] = useState(false);
    const pollFailureCountRef = useRef(0);

    // Populated from GET /api/config -- drives the voice picker (see
    // FILM_SUMMARY_* env-backed settings in app.py). Sensible defaults are
    // kept until the config resolves so the form is usable immediately.
    const [allowedVoices, setAllowedVoices] = useState([]);
    const [defaultVoice, setDefaultVoice] = useState("cedar");

    const [narrationStyle, setNarrationStyle] = useState("cinematic");
    const [voiceId, setVoiceId] = useState("");
    const [addSubtitles, setAddSubtitles] = useState(true);

    // Voice preview playback (GET /api/film-summaries/voice-previews/{voice})
    // -- a short demo line synthesized once server-side and cached, so the
    // user can hear each narrator voice before picking one instead of
    // guessing from a bare id in a dropdown.
    const [playingVoiceId, setPlayingVoiceId] = useState("");
    const [loadingVoiceId, setLoadingVoiceId] = useState("");
    const [voicePreviewError, setVoicePreviewError] = useState("");
    const voicePreviewUrlsRef = useRef({});
    const voiceAudioRef = useRef(null);

    useEffect(() => {
        return () => {
            voiceAudioRef.current?.pause();
        };
    }, []);

    const handlePlayVoicePreview = async (voice) => {
        setVoicePreviewError("");
        if (playingVoiceId === voice) {
            voiceAudioRef.current?.pause();
            setPlayingVoiceId("");
            return;
        }
        try {
            let previewUrl = voicePreviewUrlsRef.current[voice];
            if (!previewUrl) {
                setLoadingVoiceId(voice);
                const response = await fetch(getApiUrl(`/api/film-summaries/voice-previews/${voice}`), {
                    headers: getAuthHeaders(user?.id),
                });
                if (!response.ok) throw new Error("preview_unavailable");
                const data = await response.json();
                previewUrl = getApiUrl(data.preview_url);
                voicePreviewUrlsRef.current[voice] = previewUrl;
            }
            if (!voiceAudioRef.current) voiceAudioRef.current = new Audio();
            const audio = voiceAudioRef.current;
            audio.src = previewUrl;
            audio.onended = () => setPlayingVoiceId("");
            await audio.play();
            setPlayingVoiceId(voice);
        } catch {
            setVoicePreviewError(t("filmSummary.voicePreviewError", "Apercu audio indisponible pour le moment."));
            setPlayingVoiceId("");
        } finally {
            setLoadingVoiceId("");
        }
    };

    const hasCreditsAvailable = hasCredits !== false;

    useEffect(() => {
        let active = true;
        fetchAppConfig()
            .then((cfg) => {
                if (!active || !cfg) return;
                if (Array.isArray(cfg.filmSummaryAllowedVoices)) setAllowedVoices(cfg.filmSummaryAllowedVoices);
                if (cfg.filmSummaryDefaultVoice) {
                    setDefaultVoice(cfg.filmSummaryDefaultVoice);
                    setVoiceId((prev) => prev || cfg.filmSummaryDefaultVoice);
                }
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    // Resume an in-progress project opened back from the projects list --
    // same recovery flow as AnonymousStoryCreatePage, adapted to the
    // dedicated film-summaries collection: GET /api/projects/{id}/job (the
    // generic job-by-project lookup) only tells us a job is running, not
    // the film summary's own id/status, so we go straight to the
    // project-scoped film-summaries endpoint instead.
    useEffect(() => {
        if (!projectIdFromUrl || !user?.id) return undefined;
        let cancelled = false;
        const restoreProjectJob = async () => {
            setProjectJobLoading(true);
            try {
                const response = await fetch(getApiUrl(`/api/projects/${projectIdFromUrl}/film-summaries`), {
                    headers: getAuthHeaders(user.id),
                });
                const payload = await response.json().catch(() => ({}));
                if (cancelled) return;
                if (!response.ok) {
                    setStatus("error");
                    setError(payload?.detail || t("filmSummary.genericError", "Une erreur est survenue."));
                    return;
                }
                const found = Array.isArray(payload?.film_summaries) ? payload.film_summaries[0] : null;
                if (!found) {
                    setStatus("error");
                    setError(t("filmSummary.genericError", "Une erreur est survenue."));
                    return;
                }
                if (found.status === "queued" || found.status === "processing") {
                    setJobId(String(found.job_id || ""));
                    setCurrentStep(String(found.stage || ""));
                    setStatus("processing");
                    return;
                }
                // Any other status (rendering, rejected, failed, completed,
                // cancelled, or a legacy awaiting_review row) is best
                // presented by the detail page's own state machine.
                navigate(`/dashboard/film-summaries/projects/${projectIdFromUrl}`);
            } catch {
                if (!cancelled) {
                    setStatus("error");
                    setError(t("filmSummary.genericError", "Une erreur est survenue."));
                }
            } finally {
                if (!cancelled) setProjectJobLoading(false);
            }
        };
        restoreProjectJob();
        return () => {
            cancelled = true;
        };
    }, [projectIdFromUrl, user?.id, navigate, t]);

    useEffect(() => {
        if (!jobId) return undefined;
        let timerId = null;
        let cancelled = false;

        const poll = async () => {
            try {
                const response = await fetch(getApiUrl(`/api/status/${jobId}`), { headers: getAuthHeaders(user?.id) });
                if (!response.ok) {
                    // A session that expires mid-operation (this can run well
                    // past an hour) previously left this loop polling
                    // forever, hitting the same 401 on every retry with
                    // nothing ever shown to the user -- stop immediately and
                    // say so, since no amount of retrying fixes an expired
                    // session. Other failures still get a few tries first.
                    if (response.status === 401) {
                        if (timerId) globalThis.clearInterval(timerId);
                        setError(t("filmSummary.sessionExpired", "Ta session a expire. Reconnecte-toi puis reviens sur cette page pour continuer le suivi."));
                        return;
                    }
                    pollFailureCountRef.current += 1;
                    if (pollFailureCountRef.current >= 5) {
                        if (timerId) globalThis.clearInterval(timerId);
                        setError(t("filmSummary.genericError", "Une erreur est survenue."));
                    }
                    return;
                }
                pollFailureCountRef.current = 0;
                const data = await response.json();
                if (cancelled) return;
                setStatus(normalizeStatus(data.status));
                setCurrentStep(String(data.current_step || ""));
                setRawProgress(Number.isFinite(data.progress) ? data.progress : null);

                if (data.status === "failed") {
                    setError(errorMessageForCode(t, data?.error?.code, data?.error?.message || t("filmSummary.genericError", "Une erreur est survenue.")));
                }

                if (data.status === "completed" || data.status === "failed") {
                    // The film summary row (rejected, failed or completed)
                    // and its project both exist by this point -- the detail
                    // page is the single source of truth for how to present
                    // whichever terminal state was reached.
                    const resultProjectId = data?.result?.project_id || projectIdFromUrl;
                    setTimeout(() => {
                        if (resultProjectId) {
                            navigate(`/dashboard/film-summaries/projects/${resultProjectId}`);
                        } else {
                            navigate("/dashboard/film-summaries");
                        }
                    }, 500);
                }
            } catch {
                // Keep polling on transient network errors.
            }
        };

        poll();
        timerId = globalThis.setInterval(poll, 2500);
        return () => {
            cancelled = true;
            if (timerId) globalThis.clearInterval(timerId);
        };
    }, [jobId, user?.id, navigate, projectIdFromUrl, t]);

    const handleProcess = async (data) => {
        if (!user?.id) {
            setError("Authentication required. Please reconnect your session.");
            return;
        }
        if (!hasCreditsAvailable) {
            const message = t("common.insufficientCreditsStart", "Credits insuffisants pour initier cette operation.");
            setError(message);
            globalThis.alert(message);
            return;
        }

        setError("");
        setStatus("processing");
        setCurrentStep("");
        try {
            const headers = getAuthHeaders(user.id);
            let body;
            if (data.type === "url") {
                headers["Content-Type"] = "application/json";
                body = JSON.stringify({
                    url: data.payload,
                    acknowledged: !!data.acknowledged,
                    narration_style: narrationStyle,
                    voice_id: voiceId,
                    add_subtitles: addSubtitles,
                });
            } else {
                body = new FormData();
                body.append("file", data.payload);
                body.append("acknowledged", data.acknowledged ? "true" : "false");
                if (narrationStyle) body.append("narration_style", narrationStyle);
                if (voiceId) body.append("voice_id", voiceId);
                body.append("add_subtitles", addSubtitles ? "true" : "false");
            }

            const response = await fetch(getApiUrl("/api/film-summaries"), {
                method: "POST",
                headers,
                body,
            });

            if (!response.ok) {
                const raw = await response.text();
                let detail = raw;
                try {
                    const parsed = JSON.parse(raw)?.detail;
                    detail = (parsed && typeof parsed === "object" ? parsed.message : parsed) || raw;
                } catch {
                    // Keep raw server detail.
                }
                setStatus("error");
                setError(detail || t("filmSummary.genericError", "Une erreur est survenue."));
                if (response.status === 402) {
                    globalThis.alert(detail || t("filmSummary.errorInsufficientCredits", "Credits insuffisants."));
                }
                return;
            }

            const payload = await response.json();
            setJobId(payload.job_id || "");
            setStatus("processing");
        } catch (err) {
            setStatus("error");
            setError(err.message || t("filmSummary.genericError", "Une erreur est survenue."));
        }
    };

    // Analysis and rendering now chain under the same job_id (see app.py's
    // _finalize_film_summary_analysis) -- the step list itself switches
    // automatically from buildFilmSummaryProcessSteps' stage-based phase
    // inference, so the panel title is switched the same simple way here
    // rather than needing the row's own status (not available from job
    // polling alone).
    const isRenderStage = ["generating_voice", "rendering_preview", "rendering_final", "adding_subtitles"].includes(currentStep);
    const isProcessing = normalizeStatus(status) === "processing";
    const breadcrumbItems = [
        { label: t("breadcrumbs.dashboard", "Dashboard"), href: "/dashboard" },
        { label: t("breadcrumbs.filmSummaries", "Film summaries"), href: "/dashboard/film-summaries" },
        { label: t("breadcrumbs.create", "Create") },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <Breadcrumbs items={breadcrumbItems} ariaLabel={t('breadcrumbs.ariaLabel', 'Breadcrumb')} />
                    <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">{t("filmSummary.createSubtitle", "Importe un film complet ou colle un lien YouTube. Seuls les films narratifs sont pris en charge.")}</p>
                </div>
                <div className="shrink-0" />
            </div>

            {!jobId && !projectIdFromUrl ? (
                <section className="rounded-2xl border border-slate-300 dark:border-white/10 bg-white/5 p-4 md:p-5 space-y-4">
                    {error ? (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
                    ) : null}
                    <div className="rounded-lg border border-slate-300 dark:border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-500 dark:text-zinc-400">
                        {t("filmSummary.sourceNotice", "Seuls les films narratifs complets sont acceptes -- les courts extraits, publicites ou contenus non fictionnels seront rejetes apres analyse.")}
                    </div>
                    {!hasCreditsAvailable ? (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                            {t("common.insufficientCreditsStart", "Credits insuffisants pour initier cette operation.")}
                        </div>
                    ) : null}

                    <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-zinc-500">
                            {t("filmSummary.narrationStyleLabel", "Style de narration")}
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {NARRATION_STYLE_KEYS.map((option) => {
                                const isSelected = narrationStyle === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setNarrationStyle(option.value)}
                                        aria-pressed={isSelected}
                                        className={`relative rounded-xl border p-3 text-left transition ${
                                            isSelected
                                                ? "border-primary bg-primary/10"
                                                : "border-slate-300 dark:border-white/10 bg-black/10 hover:bg-white/5"
                                        }`}
                                    >
                                        {isSelected ? (
                                            <span className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                                                <Check size={10} />
                                            </span>
                                        ) : null}
                                        <p className="pr-5 text-sm font-semibold text-slate-900 dark:text-white">{t(option.labelKey, option.fallback)}</p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-400">{t(option.descKey, option.descFallback)}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-zinc-500">
                            {t("filmSummary.voiceLabel", "Voix du narrateur")}
                        </label>
                        {voicePreviewError ? (
                            <p className="text-xs text-amber-500 dark:text-amber-400">{voicePreviewError}</p>
                        ) : null}
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {(allowedVoices.length ? allowedVoices : [defaultVoice]).map((voice) => {
                                const isSelected = (voiceId || defaultVoice) === voice;
                                const isPlaying = playingVoiceId === voice;
                                const isLoading = loadingVoiceId === voice;
                                return (
                                    <div
                                        key={voice}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setVoiceId(voice)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") setVoiceId(voice);
                                        }}
                                        aria-pressed={isSelected}
                                        className={`relative flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition cursor-pointer ${
                                            isSelected
                                                ? "border-primary bg-primary/10"
                                                : "border-slate-300 dark:border-white/10 bg-black/10 hover:bg-white/5"
                                        }`}
                                    >
                                        <span className="flex items-center gap-2 text-sm font-semibold capitalize text-slate-900 dark:text-white">
                                            {isSelected ? (
                                                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                                                    <Check size={10} />
                                                </span>
                                            ) : null}
                                            {voice}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePlayVoicePreview(voice);
                                            }}
                                            disabled={isLoading}
                                            title={t("filmSummary.voiceListenLabel", "Ecouter un extrait")}
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 dark:border-white/10 bg-white/5 text-slate-700 dark:text-zinc-200 hover:bg-white/10 disabled:opacity-50"
                                        >
                                            {isLoading ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : isPlaying ? (
                                                <Pause size={14} />
                                            ) : (
                                                <Play size={14} />
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-300 dark:border-white/10 bg-black/10 p-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("filmSummary.addSubtitlesLabel", "Ajouter des sous-titres")}</p>
                            <p className="text-xs text-slate-500 dark:text-zinc-400">{t("filmSummary.addSubtitlesHint", "Incruste des sous-titres avec le style par defaut dans la video generee.")}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={addSubtitles}
                                onChange={(e) => setAddSubtitles(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <MediaInput
                        onProcess={handleProcess}
                        isProcessing={isProcessing}
                        isCreditBlocked={!hasCreditsAvailable}
                        disableActions={!hasCreditsAvailable}
                        creditWarning={!hasCreditsAvailable ? t("common.insufficientCreditsStart", "Credits insuffisants pour initier cette operation.") : ""}
                        submitLabel={t("filmSummary.generateCta", "Analyser le film")}
                        processingLabel={t("mediaInput.processing", "Processing Video...")}
                    />
                </section>
            ) : (
                <div className="space-y-4">
                    {error ? (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
                    ) : null}

                    <FilmSummaryProcessingPanel
                        status={normalizeStatus(status)}
                        stage={currentStep}
                        title={isRenderStage ? t("filmSummary.renderingTitle", "Generation de ta video") : t("filmSummary.processingTitle", "Analyse de ton film")}
                        isLoadingStatus={projectJobLoading}
                        rawProgress={rawProgress}
                    />
                </div>
            )}
        </div>
    );
}
