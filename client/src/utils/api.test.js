/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

// Create a mock for the global fetch function
global.fetch = vi.fn();

describe('api utility', () => {
  // Clear localStorage and fetch mocks before every test
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. GET request automatically attaches Bearer token from localStorage', async () => {
    // Setup fake token and fake successful response
    localStorage.setItem('token', 'fake-jwt-token-123');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: 'test data' })
    });

    // Run the API call
    const result = await api.get('/test-endpoint');

    // Assert that fetch was called with the exact right headers
    expect(global.fetch).toHaveBeenCalledWith('/api/test-endpoint', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        'Authorization': 'Bearer fake-jwt-token-123',
        'Content-Type': 'application/json'
      })
    }));
    
    // Assert the data came back intact
    expect(result.data).toBe('test data');
  });

  it('2. upload() automatically removes Content-Type wrapper for FormData', async () => {
    const fakeFormData = new FormData();
    fakeFormData.append('file', new Blob());

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await api.upload('/files', fakeFormData);

    // Asserting that the Content-Type header was DELETED so the browser can calculate the boundary
    const fetchArgs = global.fetch.mock.calls[0][1];
    expect(fetchArgs.headers['Content-Type']).toBeUndefined();
    expect(fetchArgs.body).toBe(fakeFormData);
  });

  it('3. Throws a normalized ApiError when the server returns a 400 Bad Request', async () => {
    // Simulate a failure response from the backend
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ status: 'fail', message: 'Invalid input provided' })
    });

    // Assert that the function rejects with exactly the error format we expect
    await expect(api.post('/users', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Invalid input provided'
    });
  });
});
