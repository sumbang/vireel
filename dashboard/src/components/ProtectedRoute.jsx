import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import AccessRestrictedPage from "../pages/AccessRestrictedPage";

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, loading, isAccessRestricted } = useAuth();

    // Also wait out the access-restriction check once a user exists --
    // isAccessRestricted stays null until it resolves, so a dashboard
    // route (or AccessRestrictedPage itself) never renders even briefly
    // before this is known either way.
    if (loading || (isAuthenticated && isAccessRestricted === null)) {
        return (
            <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
                Verification de la session...
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Blocks every dashboard route -- including a direct/deep-linked URL
    // -- for an account not in DEMO_ALLOWED_EMAILS on this reserved
    // deployment. See AuthContext's isAccessRestricted effect.
    if (isAccessRestricted) {
        return <AccessRestrictedPage />;
    }

    return children;
}