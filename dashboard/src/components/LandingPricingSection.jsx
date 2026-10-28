import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getApiUrl } from "../config";
import { normalizeAnnualDiscountPercent } from "../lib/billing";
import PlanCard from "./PlanCard";
import BillingIntervalToggle from "./BillingIntervalToggle";

// Public, read-only counterpart to AbonnementPage.jsx's plan picker: same
// GET /api/abonnements (no auth required, already ordered by "ordre" --
// see list_abonnements in supabase_request.py and its /api/abonnements
// endpoint in app.py) and the same PlanCard presentation, but with no
// `children` passed in, so no "Choisir"/checkout button ever renders here
// -- this section only presents the offers and their details, it never
// lets a logged-out visitor start a payment.
export default function LandingPricingSection({ t, language }) {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [billingInterval, setBillingInterval] = useState("month");

    useEffect(() => {
        let active = true;
        async function loadPlans() {
            setLoading(true);
            setError("");
            try {
                const response = await fetch(getApiUrl("/api/abonnements"));
                if (!response.ok) {
                    if (active) setError(t("landing.pricingError", "Impossible de charger les offres pour le moment."));
                    return;
                }
                const data = await response.json();
                const items = Array.isArray(data.plans) ? data.plans : [];
                // Belt-and-suspenders: the backend already returns plans
                // ordered by "ordre" ascending, but sorting defensively
                // here guarantees display order never depends on that
                // staying true server-side.
                items.sort((a, b) => Number(a.ordre ?? 0) - Number(b.ordre ?? 0));
                if (active) setPlans(items);
            } catch {
                if (active) setError(t("landing.pricingError", "Impossible de charger les offres pour le moment."));
            } finally {
                if (active) setLoading(false);
            }
        }
        loadPlans();
        return () => {
            active = false;
        };
    }, [t]);

    const maxAnnualDiscount = plans.reduce((max, plan) => Math.max(max, normalizeAnnualDiscountPercent(plan.reduction_annuelle)), 0);

    return (
        <section id="comparison" className="py-20 px-6 bg-surface/20">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("landing.priceTitle")}</h2>
                    <p className="text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto">{t("landing.priceDesc")}</p>
                </div>

                <div className="flex justify-center mb-10">
                    <BillingIntervalToggle billingInterval={billingInterval} onChange={setBillingInterval} maxAnnualDiscount={maxAnnualDiscount} t={t} />
                </div>

                {loading ? (
                    <div className="flex justify-center">
                        <span className="inline-flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                            <Loader2 size={16} className="animate-spin" /> {t("app.loading", "Chargement...")}
                        </span>
                    </div>
                ) : error ? (
                    <p className="text-center text-sm text-red-400">{error}</p>
                ) : plans.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 dark:text-zinc-400">
                        {t("landing.noPlans", "Aucune offre n'est disponible pour le moment.")}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 items-start">
                        {plans.map((plan) => (
                            <PlanCard key={plan.id || plan.name} plan={plan} billingInterval={billingInterval} t={t} language={language} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
