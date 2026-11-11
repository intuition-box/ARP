/** A stand-in for the global `fetch`, so no test here reaches a network. Every request is recorded. */
export type Asked = { url: string; init: RequestInit | undefined; body: unknown };

export function stubFetch(
  answer: (url: string, body: unknown) => Response | Promise<Response>,
): Asked[] {
  const asked: Asked[] = [];
  const stub = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    asked.push({ url, init, body });
    return answer(url, body);
  };
  globalThis.fetch = Object.assign(stub, { preconnect: realFetch.preconnect });
  return asked;
}

export const realFetch = globalThis.fetch;

export function restoreFetch(): void {
  globalThis.fetch = realFetch;
}
