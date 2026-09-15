/** Custom OpenAI-compatible hosts must not follow redirects into private space. */
export function compatibleProviderFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // fallow-ignore-next-line security-sink -- hosted URLs are public IP literals; redirect:error blocks private hops
  return fetch(input, { ...init, redirect: 'error' });
}
