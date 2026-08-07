export async function apiClient(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options?: { body?: any; token?: string; params?: Record<string, string> }
) {
  const baseUrl = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api/v1';
  let url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  if (options?.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }

  return {
    status: response.status,
    body: data,
  };
}
