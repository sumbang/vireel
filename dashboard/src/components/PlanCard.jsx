import { Check, MessageCircle, Share2, X } from "lucide-react";
import { annualSavingsAmount, computeAnnualPrice, normalizeAnnualDiscountPercent } from "../lib/billing";
import { pickLocalizedPlanField, resolvePlanColorStyle, resolvePlanIcon } from "../lib/abonnementDisplay";

// One plan's pricing card -- shared by AbonnementPage.jsx (authenticated
// plan picker, which passes a "Choisir"/checkout button as `children`) and
// LandingPricingSection.jsx (public landing page, which renders the card
// with no `children` at all -- informational only, no payment action).
export default function PlanCard({ plan, billingInterval, t, language, children }) {
    const styles = resolvePlanColorStyle(plan);
    const Icon = resolvePlanIcon(plan);
    const commentCount = Number(plan.commentaire);
    const hasCommentCount = Number.isFinite(commentCount) && commentCount > 0;
    const maxSocialAccounts = Number(plan.max_social_account);
    const hasMaxSocialAccounts = Number.isFinite(maxSocialAccounts) && maxSocialAccounts > 0;
    const cible = pickLocalizedPlanField(plan, "cible", language);
    // description is a JSON array (same shape as features), listed under
    // its own "Fonctionnalites IA incluses dans les credits" heading --
    // tolerate a plain string too in case a row hasn't been migrated to
    // the array shape yet.
    const descriptionValue = pickLocalizedPlanField(plan, "description", language);
    const descriptionItems = Array.isArray(descriptionValue)
        ? descriptionValue
        : (descriptionValue ? [descriptionValue] : []);
    const featureItems = pickLocalizedPlanField(plan, "features", language) || [];
    const discountRate = normalizeAnnualDiscountPercent(plan.reduction_annuelle);
    const displayedPrice = billingInterval === "year"
        ? computeAnnualPrice(plan.price, discountRate)
        : plan.price;
    const savings = billingInterval === "year" ? annualSavingsAmount(plan.price, discountRate) : 0;

    return (
        <div
            className={`relative flex flex-col rounded-2xl border ${styles.border} ${styles.bg} p-7 ${
                plan.highlighted ? "z-10 ring-2 ring-blue-500/40 scale-[1.02]" : ""
            } transition`}
        >
            {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                    {t("abonnement.populaire", "Populaire")}
                </span>
            )}

            {/* Icon + nom */}
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${styles.gradient}`}>
                    <Icon size={20} className={styles.icon} />
                </div>
                <h2 className="text-lg font-bold">{plan.name}</h2>
            </div>

            {/* Cible */}
            {cible && (
                <p className={`lowercase text-[0.65rem] font-medium mb-3 ${styles.icon}`}>
                    {cible}
                </p>
            )}

            {/* Prix */}
            <div className="mb-6">
                <span className="text-3xl font-bold">{displayedPrice}€</span>
                <span className="text-slate-500 dark:text-zinc-400 text-sm"> / {billingInterval === "year" ? t("abonnement.an", "an") : t("abonnement.mois", "mois")}</span>
                {billingInterval === "year" && discountRate > 0 && (
                    <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        {t("abonnement.annualSavings", "Économisez {{amount}}€ par an", { amount: savings })}
                    </p>
                )}
            </div>

            {/* Fonctionnalites IA incluses dans les credits */}
            {descriptionItems.length > 0 && (
                <div className="mb-6">
                    <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-2">
                        {t("abonnement.aiFeaturesHeading", "Fonctionnalités IA incluses dans les crédits")}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                        {descriptionItems.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-zinc-300">
                                <Check size={14} className={`${styles.check} mt-0.5 shrink-0`} />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Liste des services */}
            <ul className="flex flex-col gap-3 mb-8 flex-1">
                {hasCommentCount && (
                    <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-zinc-300">
                        <MessageCircle size={16} className={`${styles.check} mt-0.5 shrink-0`} />
                        <span>{commentCount.toLocaleString()} {t("abonnement.commentsPerPost", "commentaires / publication")}</span>
                    </li>
                )}
                {hasMaxSocialAccounts && (
                    <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-zinc-300">
                        <Share2 size={16} className={`${styles.check} mt-0.5 shrink-0`} />
                        <span>
                            {t(
                                "abonnement.maxSocialAccounts",
                                "Jusqu'à {{count}} compte(s) par réseau social",
                                { count: maxSocialAccounts.toLocaleString() }
                            )}
                        </span>
                    </li>
                )}
                <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-zinc-300">
                    {plan.statistique ? (
                        <>
                            <Check size={16} className={`${styles.check} mt-0.5 shrink-0`} />
                            <span>{t("abonnement.statsIncluded", "Statistiques sociales sur la page d'accueil")}</span>
                        </>
                    ) : (
                        <>
                            <X size={16} className="text-slate-400 dark:text-zinc-600 mt-0.5 shrink-0" />
                            <span className="text-slate-400 dark:text-zinc-500">{t("abonnement.statsExcluded", "Pas de statistiques sociales sur la page d'accueil")}</span>
                        </>
                    )}
                </li>
                {featureItems.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700 dark:text-zinc-300">
                        <Check size={16} className={`${styles.check} mt-0.5 shrink-0`} />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>

            {children ? <div className="mt-auto">{children}</div> : null}
        </div>
    );
}
