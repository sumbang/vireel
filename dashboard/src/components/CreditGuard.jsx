/**
 * CreditGuard – wraps an action button with a credit check.
 *
 * If the user doesn't have enough credits the button is greyed out
 * and a warning tooltip/message is shown.
 *
 * Usage:
 *   <CreditGuard requiredCredits={reelCost}>
 *     <button onClick={...}>Générer</button>
 *   </CreditGuard>
 */
import React from "react";
import { AlertTriangle } from "lucide-react";
import { useUserCredits } from "../state/UserCreditsContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../state/LanguageContext";

export default function CreditGuard({
    children,
    requiredCredits = 1,
    operationLabel,
}) {
    const { credits, totalCredits, canAfford, loading } = useUserCredits();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const resolvedOperationLabel = operationLabel ?? t("creditGuard.defaultOperation", "cette opération");

    // While credits haven't loaded yet we allow the action (optimistic).
    const sufficient = canAfford(requiredCredits);
    if (loading || sufficient === null) return <>{children}</>;

    if (sufficient) return <>{children}</>;

    const availableCredits = Number(totalCredits ?? credits ?? 0);

    return (
        <div className="flex flex-col gap-2">
            {/* Render children but disabled */}
            <div className="pointer-events-none opacity-40 select-none">
                {children}
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                <AlertTriangle size={13} className="shrink-0" />
                <span>
                    {t("creditGuard.insufficientCredits", "Crédits insuffisants pour {{operation}}.", { operation: resolvedOperationLabel })}
                    {" "}
                    {t("creditGuard.required", "Il vous faut au moins {{required}} cr (solde total : {{available}} cr).", {
                        required: requiredCredits.toLocaleString(),
                        available: availableCredits.toLocaleString(),
                    })}
                </span>
                <button
                    onClick={() => navigate("/dashboard/settings?buy=1")}
                    className="ml-auto whitespace-nowrap font-semibold underline hover:text-amber-200"
                >
                    {t("creditGuard.reload", "Recharger")}
                </button>
            </div>
        </div>
    );
}

