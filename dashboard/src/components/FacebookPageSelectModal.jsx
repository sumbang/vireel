import React, { useMemo, useState } from 'react';
import { X, Search, Facebook as FacebookIcon } from 'lucide-react';
import { useTranslation } from '../state/LanguageContext';

// A real picker for the Facebook page-selection step -- window.prompt() was
// used here before, but its message gets silently truncated by the browser
// past roughly twenty lines (shows "..." with no way to scroll or see the
// rest), making pages beyond that point impossible to select for anyone
// managing more than a couple dozen Facebook Pages.
export default function FacebookPageSelectModal({ pages, onSelect, onCancel, isSubmitting }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');

    const filteredPages = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return pages;
        return pages.filter((page) => (page.page_name || '').toLowerCase().includes(normalized));
    }, [pages, query]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white dark:bg-[#121214] border border-slate-300 dark:border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl relative max-h-[85vh] flex flex-col">
                <button
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="absolute top-4 right-4 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white disabled:opacity-40"
                >
                    <X size={20} />
                </button>

                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 pr-8">
                    {t('settings.selectFacebookPageTitle', 'Select a Facebook page')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
                    {t('settings.selectFacebookPageSubtitle', 'Choose which page to connect.')}
                </p>

                <div className="relative mb-3 shrink-0">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('settings.searchFacebookPages', 'Search a page...')}
                        className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/20 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 space-y-1">
                    {filteredPages.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 py-4 text-center">
                            {t('settings.noFacebookPageMatch', 'No page matches your search.')}
                        </p>
                    ) : (
                        filteredPages.map((page) => (
                            <button
                                key={page.page_id}
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => onSelect(page.page_id)}
                                className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40"
                            >
                                {page.page_picture ? (
                                    <img src={page.page_picture} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0">
                                        <FacebookIcon size={16} className="text-slate-500 dark:text-zinc-400" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{page.page_name || page.page_id}</p>
                                    {page.page_category ? (
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{page.page_category}</p>
                                    ) : null}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
