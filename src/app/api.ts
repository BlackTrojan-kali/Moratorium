export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}${path}`, {
      credentials: 'include', method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new Error('Cannot reach the backend. Check that it is running.'); }
  const contentType = response.headers.get('content-type') || '';
  let data: any = {};
  if (response.status !== 204) {
    const text = await response.text();
    if (text) {
      if (contentType.includes('application/json')) {
        try { data = JSON.parse(text); } catch { throw new Error('The backend returned invalid JSON.'); }
      } else if (!response.ok) {
        data = { error: { message: `Backend error (${response.status}).` } };
      }
    }
  }
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event('auth-expired'));
    throw new ApiError(data.error?.message || 'Request failed.', response.status);
  }
  return data;
}
