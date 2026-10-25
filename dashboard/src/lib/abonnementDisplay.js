import { Star, Sparkles, Crown, Building2, Zap } from "lucide-react";

// Every value here must be a complete, literal Tailwind class string --
// Tailwind's build-time scanner only picks up classes it can see written
// out in full in source files, so a template literal like
// `bg-gradient-to-br from-${plan.color}-500/30` can never work: whatever
// color name comes back from the DB, Tailwind never generates that class,
// so the icon chip would silently render with no gradient at all.
// Shared between AbonnementPage.jsx (authenticated plan picker) and
// LandingPricingSection.jsx (public landing page) so both render plan
// cards identically without duplicating this mapping.
export const colorStyles = {
    zinc: {
        border: "border-zinc-500/20",
        bg: "bg-zinc-500/10",
        gradient: "bg-gradient-to-br from-zinc-500/30 to-zinc-700/30",
        icon: "text-slate-700 dark:text-zinc-300",
        button: "border-zinc-500/20 bg-zinc-500/10 text-slate-700 dark:text-zinc-300 hover:bg-zinc-500/15",
        check: "text-slate-500 dark:text-zinc-400",
    },
    blue: {
        border: "border-blue-500/30",
        bg: "bg-blue-500/10",
        gradient: "bg-gradient-to-br from-blue-500/30 to-blue-700/30",
        // A dark-mode-only shade (e.g. text-blue-300 with no light-mode
        // pairing) sits almost invisibly light against a light background --
        // every color below pairs a readable light-mode shade with its
        // dark-mode one, matching zinc's pattern.
        icon: "text-blue-700 dark:text-blue-300",
        button: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15",
        check: "text-blue-600 dark:text-blue-400",
    },
    purple: {
        border: "border-purple-500/20",
        bg: "bg-purple-500/10",
        gradient: "bg-gradient-to-br from-purple-500/30 to-purple-700/30",
        icon: "text-purple-700 dark:text-purple-300",
        button: "border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15",
        check: "text-purple-600 dark:text-purple-400",
    },
    amber: {
        border: "border-amber-500/30",
        bg: "bg-amber-500/10",
        gradient: "bg-gradient-to-br from-amber-500/30 to-amber-700/30",
        icon: "text-amber-700 dark:text-amber-300",
        button: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15",
        check: "text-amber-600 dark:text-amber-400",
    },
    green: {
        border: "border-emerald-500/30",
        bg: "bg-emerald-500/10",
        gradient: "bg-gradient-to-br from-emerald-500/30 to-emerald-700/30",
        icon: "text-emerald-700 dark:text-emerald-300",
        button: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15",
        check: "text-emerald-600 dark:text-emerald-400",
    },
    red: {
        border: "border-rose-500/30",
        bg: "bg-rose-500/10",
        gradient: "bg-gradient-to-br from-rose-500/30 to-rose-700/30",
        icon: "text-rose-700 dark:text-rose-300",
        button: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15",
        check: "text-rose-600 dark:text-rose-400",
    },
};

// A plan whose "color" column doesn't match any key above (e.g. a newly
// added plan, or a value not yet mapped) falls back here instead of
// crashing on `styles.border`.
export const defaultColorStyle = colorStyles.zinc;

// The abonnement table's "icon" column hasn't reliably matched any string
// recognized below, leaving every plan to fall back to the same Star icon
// -- indistinguishable from one another. Keying on the plan's exact name
// instead is the one mapping guaranteed to be right, since it's the one
// actually confirmed plan-by-plan.
export const planIconByName = {
    "ViReel Discover": Star,
    "ViReel Publish": Sparkles,
    "ViReel Creator": Crown,
    "ViReel Studio": Building2,
};

// Keyed defensively on common casings (Crown/crown) since the exact
// string in the DB's "icon" column isn't guaranteed to match a
// component's PascalCase export name.
export const iconMap = {
    Crown: Crown, crown: Crown,
    Star: Star, star: Star,
    Sparkles: Sparkles, sparkles: Sparkles,
    Zap: Zap, zap: Zap,
    Building2: Building2, building2: Building2,
};

export function resolvePlanIcon(plan) {
    return planIconByName[plan?.name] || iconMap[plan?.icon] || Star;
}

export function resolvePlanColorStyle(plan) {
    return colorStyles[plan?.color] || defaultColorStyle;
}
