export type UploadSocialAccountSummaryItem = {
  id: string;
  label: string;
  isDefault: boolean;
  connectionStatus: string;
  connectedAt?: string | null;
  lastError?: string | null;
};

export type UploadSocialAccountProviderResponse = {
  defaultAccountId: string | null;
  total: number;
  items: UploadSocialAccountSummaryItem[];
};

export function getInitialUploadSocialAccountId(
  providerData?: UploadSocialAccountProviderResponse | null,
) {
  return providerData?.defaultAccountId ?? providerData?.items[0]?.id ?? '';
}

export function getUploadSocialAccountStatusLabel(status: string) {
  switch (status) {
    case 'healthy':
      return 'Healthy';
    case 'attention':
      return 'Needs attention';
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