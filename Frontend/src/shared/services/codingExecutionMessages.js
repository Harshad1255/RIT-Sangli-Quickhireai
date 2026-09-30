const serviceMessages = {
  disabled: 'Code execution is disabled on this server. Contact your instructor.',
  missing_key: 'The execution provider is not configured. Contact the platform administrator.',
  missing_url: 'The execution provider is not configured. Contact the platform administrator.',
  misconfigured: 'The execution provider is not configured. Contact the platform administrator.',
  timeout: 'The execution provider timed out. Please try again shortly.',
  provider_5xx: 'The execution provider is temporarily unavailable. Please try again shortly.',
  provider_unavailable: 'The execution provider is temporarily unavailable. Please try again shortly.'
};

export const getExecutionServiceMessage = (reason) => (
  serviceMessages[reason] || serviceMessages.provider_unavailable
);

export const getExecutionRequestError = (error, action) => {
  const response = error?.response;
  const errorBody = response?.data?.error;

  if (errorBody?.code === 'INTERNAL_ERROR') {
    return `An unexpected server error occurred. Reference: ${errorBody.requestId || 'unavailable'}.`;
  }
  if (response?.status === 404) return 'This problem is no longer available.';
  if (response?.status === 400 || errorBody?.code === 'VALIDATION_ERROR') {
    return 'Check that a language and solution are provided.';
  }
  return `Unable to ${action} your code right now. Please try again.`;
};