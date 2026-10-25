// Shared mensuel/annuel pricing toggle -- used by AbonnementPage.jsx
// (authenticated plan picker) and LandingPricingSection.jsx (public
// landing page) so both offer the same billing-interval switch.
export default function BillingIntervalToggle({ billingInterval, onChange, maxAnnualDiscount, t }) {
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => onChange("month")}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                    billingInterval === "month"
                        ? "border-amber-300 dark:border-yellow-400 bg-amber-100 dark:bg-yellow-400/10 text-amber-800 dark:text-yellow-300"
                        : "border-slate-300 dark:border-white/10 bg-white/5 text-slate-700 dark:text-zinc-300 hover:border-slate-400 dark:hover:border-white/20"
                }`}
            >
                {t("abonnement.billingMonthly", "Mensuel")}
            </button>
            <button
                type="button"
                onClick={() => onChange("year")}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                    billingInterval === "year"
                        ? "border-amber-300 dark:border-yellow-400 bg-amber-100 dark:bg-yellow-400/10 text-amber-800 dark:text-yellow-300"
                        : "border-slate-300 dark:border-white/10 bg-white/5 text-slate-700 dark:text-zinc-300 hover:border-slate-400 dark:hover:border-white/20"
                }`}
            >
                {t("abonnement.billingAnnual", "Annuel")}
                {maxAnnualDiscount > 0 && (
                    <span className="rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 text-[0.65rem] font-semibold">
                        {t("abonnement.annualDiscountBadge", "jusqu'a -{{percent}}%", { percent: Math.round(maxAnnualDiscount) })}
                    </span>
                )}
            </button>
        </div>
    );
}
