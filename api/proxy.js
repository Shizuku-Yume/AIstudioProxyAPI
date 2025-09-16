// api/proxy.js

export const config = {
  runtime: 'edge', // 关键配置：告诉 Vercel 这是一个 Edge Function
};

const AISTUDIO_BASE_URL = 'https://aistudio.baidu.com';

export default async function handler(request) {
  const url = new URL(request.url);

  // 从请求路径中移除 Vercel 添加的 /api/proxy 前缀
  // 例如：/api/proxy/llm/lmapi/v1/... -> /llm/lmapi/v1/...
  const apiPath = url.pathname.replace('/api/proxy', '');

  // 构建目标 URL
  const targetUrl = new URL(apiPath + url.search, AISTUDIO_BASE_URL);

  // 从 Vercel 环境变量中读取 Authorization 和 Cookie
  const authorization = process.env.AISTUDIO_Authorization;
  const cookie = process.env.AISTUDIO_Cookie;

  if (!authorization || !cookie) {
    return new Response('Missing AISTUDIO_Authorization or AISTUDIO_Cookie in Vercel environment variables.', { status: 500 });
  }

  const headers = new Headers(request.headers);
  headers.set('Authorization', authorization);
  headers.set('Cookie', cookie);
  headers.set('Host', 'aistudio.baidu.com');
  headers.set('Origin', AISTUDIO_BASE_URL);
  headers.set('Referer', AISTUDIO_BASE_URL + '/');

  // 创建一个新的请求，发往目标 URL
  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'follow',
  });

  // 发送请求并返回响应
  try {
    const response = await fetch(newRequest);
    return response;
  } catch (e) {
    return new Response('Error fetching the target API: ' + e.message, { status: 502 });
  }
}