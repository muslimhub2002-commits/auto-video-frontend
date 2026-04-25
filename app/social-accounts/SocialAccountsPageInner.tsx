'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CircleAlert,
  KeyRound,
  Loader2,
  PencilLine,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { HeaderBar } from '../generate/_components/HeaderBar';
import { Sidebar } from '../generate/_components/Sidebar';
import { useAuthGuard } from '../generate/_hooks/useAuthGuard';
import { SocialAccountFormModal } from './_components/SocialAccountFormModal';
import { SocialAccountGuideModal } from './_components/SocialAccountGuideModal';
import {
  getSocialAccountGuideHref,
  socialAccountFieldMap,
  socialAccountSectionMap,
  socialAccountSections,
  type SocialAccountDetailResponse,
  type SocialAccountProviderPayload,
  type SocialAccountsResponse,
  type SocialAccountUpsertPayload,
  type SocialAccountProvider,
} from './social-accounts-data';

function formatDate(value?: string | null) {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getApiMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: unknown } }).response !== null
  ) {
    const responseData = (error as { response?: { data?: unknown } }).response?.data;
    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'message' in responseData
    ) {
      const message = (responseData as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }

      if (Array.isArray(message)) {
        const firstMessage = message.find(
          (item): item is string => typeof item === 'string' && item.trim().length > 0,
        );
        if (firstMessage) {
          return firstMessage.trim();
        }
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

function getConnectionLabel(status: string) {
  switch (status) {
    case 'healthy':
      return 'Healthy';
    case 'attention':
      return 'Attention';
    case 'reconnect_required':
      return 'Reconnect required';
    case 'error':
      return 'Error';
    case 'draft':
      return 'Draft';
    case 'not_connected':
    default:
      return 'Not connected';
  }
}

function getConnectionTone(status: string) {
  switch (status) {
    case 'healthy':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'attention':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'reconnect_required':
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'draft':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'not_connected':
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

type FormState = {
  mode: 'create' | 'edit';
  provider: SocialAccountProvider;
  accountId: string | null;
  initialLabel: string;
  initialFieldValues: Record<string, string | null>;
};

type DeleteState = {
  provider: SocialAccountProvider;
  accountId: string;
  label: string;
} | null;

export function SocialAccountsPageInner() {
  const { user, isLoading, handleLogout } = useAuthGuard();
  const { showToast, ToastContainer } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState<SocialAccountProvider | null>(null);
  const [accountsData, setAccountsData] = useState<SocialAccountsResponse | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyActionKey, setBusyActionKey] = useState<string | null>(null);

  const providerMap = useMemo(
    () =>
      Object.fromEntries(
        (accountsData?.providers ?? []).map((provider) => [provider.provider, provider]),
      ) as Record<SocialAccountProvider, SocialAccountProviderPayload>,
    [accountsData?.providers],
  );

  const loadAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    setPageError(null);

    try {
      const response = await api.get<SocialAccountsResponse>('/social-accounts');
      setAccountsData(response.data);
    } catch (error) {
      setPageError(
        getApiMessage(
          error,
          'Failed to load saved social accounts. Try again in a moment.',
        ),
      );
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    void loadAccounts();
  }, [isLoading, loadAccounts, user]);

  const openCreateModal = (provider: SocialAccountProvider) => {
    setFormState({
      mode: 'create',
      provider,
      accountId: null,
      initialLabel: '',
      initialFieldValues: Object.fromEntries(
        socialAccountFieldMap[provider].map((field) => [field.key, null]),
      ),
    });
  };

  const openEditModal = async (
    provider: SocialAccountProvider,
    accountId: string,
  ) => {
    const actionKey = `edit:${provider}:${accountId}`;
    setBusyActionKey(actionKey);

    try {
      const response = await api.get<SocialAccountDetailResponse>(
        `/social-accounts/${provider}/accounts/${accountId}`,
      );
      setFormState({
        mode: 'edit',
        provider,
        accountId,
        initialLabel: response.data.account.label,
        initialFieldValues: response.data.account.fieldValues,
      });
    } catch (error) {
      showToast(
        getApiMessage(error, 'Failed to load the selected account for editing.'),
        'error',
      );
    } finally {
      setBusyActionKey(null);
    }
  };

  const handleSubmitForm = async (payload: SocialAccountUpsertPayload) => {
    if (!formState) {
      return;
    }

    setIsSavingForm(true);
    try {
      if (formState.mode === 'create') {
        await api.post(
          `/social-accounts/${formState.provider}/accounts`,
          payload,
        );
        showToast(`${socialAccountSectionMap[formState.provider].label} account saved.`, 'success');
      } else if (formState.accountId) {
        await api.patch(
          `/social-accounts/${formState.provider}/accounts/${formState.accountId}`,
          payload,
        );
        showToast(`${socialAccountSectionMap[formState.provider].label} account updated.`, 'success');
      }

      setFormState(null);
      await loadAccounts();
    } catch (error) {
      showToast(
        getApiMessage(error, 'Failed to save the social account.'),
        'error',
      );
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleSetDefault = async (
    provider: SocialAccountProvider,
    accountId: string,
  ) => {
    const actionKey = `default:${provider}:${accountId}`;
    setBusyActionKey(actionKey);

    try {
      await api.patch(`/social-accounts/${provider}/accounts/${accountId}/default`);
      showToast(`${socialAccountSectionMap[provider].label} default account updated.`, 'success');
      await loadAccounts();
    } catch (error) {
      showToast(
        getApiMessage(error, 'Failed to set the default social account.'),
        'error',
      );
    } finally {
      setBusyActionKey(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteState) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(
        `/social-accounts/${deleteState.provider}/accounts/${deleteState.accountId}`,
      );
      showToast(`${deleteState.label} was removed.`, 'success');
      setDeleteState(null);
      await loadAccounts();
    } catch (error) {
      showToast(
        getApiMessage(error, 'Failed to remove the selected account.'),
        'error',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const summary = accountsData?.summary;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.45)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Social Accounts workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        user={user}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.16),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_100%)]">
          <HeaderBar onToggleSidebar={() => setIsSidebarOpen((current) => !current)} />

          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
            <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.55)] lg:p-8">
              <div className="absolute -left-20 top-0 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
              <div className="absolute right-0 top-10 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Social Accounts Hub
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                      Connect accounts per platform, per user
                    </h1>
                    <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                      This workspace is the rollout surface for per-user YouTube, Meta, and TikTok account management. Each section ships with an in-app setup guide and a print-friendly guide page.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-110">
                  <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Saved accounts
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {summary?.totalAccounts ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Providers configured
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {summary?.providersConfigured ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Needs attention
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {summary?.attentionCount ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
              <div className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)]">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  <ShieldCheck className="h-4 w-4" />
                  Rollout Direction
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-600">
                    Each saved account will keep its own credentials, generated tokens, connection health, and reconnect timeline under the signed-in user rather than a shared workspace token.
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-600">
                    Guides, add or edit forms, default-account selection, and delete actions are now live on this page. Upload modals will consume these saved accounts in the next slice.
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-amber-200 bg-amber-50/90 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.45)]">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                  <CircleAlert className="h-4 w-4" />
                  Current Slice
                </div>
                <p className="mt-4 text-sm leading-7 text-amber-900">
                  This implementation pass adds real user-scoped Social Accounts CRUD on top of the new backend storage contract. The next step is threading selected accounts into YouTube, Meta, and TikTok upload flows.
                </p>
              </div>
            </section>

            {pageError ? (
              <section className="rounded-[30px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-700">
                {pageError}
              </section>
            ) : null}

            <section className="grid gap-5 xl:grid-cols-3">
              {socialAccountSections.map((section) => {
                const SectionIcon = section.icon;
                const providerData = providerMap[section.provider];

                return (
                  <article
                    key={section.provider}
                    className="flex h-full flex-col rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-linear-to-br text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.55)] ${section.accentClassName}`}>
                          <SectionIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black tracking-tight text-slate-900">
                            {section.label}
                          </h2>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {section.summary}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openCreateModal(section.provider)}
                        className="rounded-2xl border-slate-200 bg-white"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>

                    <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                        <KeyRound className="h-4 w-4" />
                        Keys To Collect
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {section.requiredKeys.map((key) => (
                          <span
                            key={key}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${section.badgeClassName}`}
                          >
                            {key}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {section.setupNotes.map((note) => (
                        <div
                          key={note.label}
                          className="rounded-[24px] border border-slate-200 bg-white px-4 py-3"
                        >
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                            {note.label}
                          </p>
                          <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                            {note.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-[28px] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Saved Accounts
                        </p>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${section.badgeClassName}`}>
                          {providerData?.total ?? 0}
                        </span>
                      </div>

                      {isLoadingAccounts ? (
                        <div className="mt-4 inline-flex items-center gap-2 text-sm text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading saved accounts...
                        </div>
                      ) : providerData?.items?.length ? (
                        <div className="mt-4 space-y-3">
                          {providerData.items.map((account) => {
                            const editKey = `edit:${section.provider}:${account.id}`;
                            const defaultKey = `default:${section.provider}:${account.id}`;

                            return (
                              <div key={account.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-sm font-black text-slate-900">
                                        {account.label}
                                      </h3>
                                      {account.isDefault ? (
                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${section.badgeClassName}`}>
                                          <Star className="h-3 w-3" />
                                          Default
                                        </span>
                                      ) : null}
                                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getConnectionTone(account.connectionStatus)}`}>
                                        {getConnectionLabel(account.connectionStatus)}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                      Updated {formatDate(account.updatedAt)}
                                      {account.lastValidatedAt
                                        ? ` • validated ${formatDate(account.lastValidatedAt)}`
                                        : ''}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => void openEditModal(section.provider, account.id)}
                                      disabled={busyActionKey === editKey}
                                      className="rounded-2xl border-slate-200 bg-white"
                                    >
                                      {busyActionKey === editKey ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <PencilLine className="h-4 w-4" />
                                      )}
                                      Edit
                                    </Button>

                                    {!account.isDefault ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                          void handleSetDefault(section.provider, account.id)
                                        }
                                        disabled={busyActionKey === defaultKey}
                                        className="rounded-2xl border-slate-200 bg-white"
                                      >
                                        {busyActionKey === defaultKey ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Star className="h-4 w-4" />
                                        )}
                                        Make default
                                      </Button>
                                    ) : null}

                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() =>
                                        setDeleteState({
                                          provider: section.provider,
                                          accountId: account.id,
                                          label: account.label,
                                        })
                                      }
                                      className="rounded-2xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Remove
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  {account.configuredFields.map((field) => (
                                    <span
                                      key={field.key}
                                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${field.configured ? section.badgeClassName : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                    >
                                      {field.label}: {field.configured ? field.maskedValue : 'Missing'}
                                    </span>
                                  ))}
                                </div>

                                {account.lastError ? (
                                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-700">
                                    {account.lastError}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          No {section.label} accounts are saved yet. Add one now so future upload flows can target the correct credentials.
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={() => setActiveGuide(section.provider)}
                        className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                      >
                        Open guide
                      </Button>

                      <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white">
                        <Link
                          href={getSocialAccountGuideHref(section.provider)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open print view
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        </main>
      </div>

      <SocialAccountGuideModal
        provider={activeGuide}
        isOpen={activeGuide !== null}
        onClose={() => setActiveGuide(null)}
      />

      <SocialAccountFormModal
        key={formState ? `${formState.mode}:${formState.provider}:${formState.accountId ?? 'new'}:${formState.initialLabel}` : 'social-account-form-closed'}
        isOpen={formState !== null}
        provider={formState?.provider ?? null}
        mode={formState?.mode ?? 'create'}
        initialLabel={formState?.initialLabel}
        initialFieldValues={formState?.initialFieldValues}
        isSaving={isSavingForm}
        onClose={() => setFormState(null)}
        onSubmit={handleSubmitForm}
      />

      <AlertDialog
        isOpen={deleteState !== null}
        onClose={() => {
          if (!isDeleting) {
            setDeleteState(null);
          }
        }}
        onConfirm={() => void handleDeleteAccount()}
        title="Remove saved social account?"
        description={deleteState ? `This will remove ${deleteState.label} from the saved ${socialAccountSectionMap[deleteState.provider].label} accounts for this user.` : 'Remove the selected account.'}
        confirmText="Remove account"
        cancelText="Keep account"
        variant="warning"
        isLoading={isDeleting}
      />

      <ToastContainer />
    </div>
  );
}