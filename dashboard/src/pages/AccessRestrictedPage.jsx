import { ShieldAlert, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { useTranslation } from "../state/LanguageContext";

// Rendered by ProtectedRoute INSTEAD OF any dashboard route -- including a
// deep-linked/directly-typed URL -- whenever AuthContext's
// isAccessRestricted is true (this account's email isn't in
// DEMO_ALLOWED_EMAILS on this reserved deployment). Every authenticated
// backend call already 403s for this account, so this screen's only job
// is to stop the UI from trying to render broken pages around those
// failures and instead show one clear, deliberate message with a way out.
export default function AccessRestrictedPage() {
    const { logout } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-5">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
                    <ShieldAlert size={28} className="text-red-400" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-xl font-bold text-white">
                        {t("demoAccess.title", "Environnement réservé")}
                    </h1>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                        {t(
                            "demoAccess.description",
                            "Cet environnement est réservé et l'accès y est restreint. Contactez un administrateur si vous pensez devoir y avoir accès."
                        )}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
                >
                    <LogOut size={16} />
                    {t("demoAccess.logout", "Se déconnecter")}
                </button>
            </div>
        </div>
    );
}
