import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { ApiError, NetworkError, request } from './client'

describe('request', () => {
  it('throws ApiError with status and detail on non-2xx', async () => {
    server.use(
      http.get('http://localhost:8000/boom', () =>
        HttpResponse.json({ detail: 'Patient not found' }, { status: 404 }),
      ),
    )
    await expect(request('/boom')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      detail: 'Patient not found',
    })
    await expect(request('/boom')).rejects.toBeInstanceOf(ApiError)
  })

  it('throws NetworkError when fetch rejects', async () => {
    server.use(http.get('http://localhost:8000/down', () => HttpResponse.error()))
    await expect(request('/down')).rejects.toBeInstanceOf(NetworkError)
  })
})
