import { NextRequest, NextResponse } from 'next/server';

const ODPT_BASE_URL = 'https://api.odpt.org/api/v4';
const ODPT_KEY = process.env.NEXT_PUBLIC_ODPT_API_KEY;

export async function GET(request: NextRequest) {
  if (!ODPT_KEY) {
    return NextResponse.json({ error: 'ODPT API key not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const params: Record<string, string> = {};

  // Extract all query parameters except 'path'
  searchParams.forEach((value, key) => {
    if (key !== 'path') {
      params[key] = value;
    }
  });

  if (!path) {
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
  }

  // Add API key
  params['acl:consumerKey'] = ODPT_KEY;

  const search = new URLSearchParams(params);
  const url = `${ODPT_BASE_URL}/${path}?${search.toString()}`;

  console.log('[ODPT API Route] Fetching:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'Accept': 'application/json',
      }
    });

    console.log('[ODPT API Route] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ODPT API Route] API error response:', errorText);
      return NextResponse.json(
        { error: `ODPT API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[ODPT API Route] Response data length:', Array.isArray(data) ? data.length : 'not array');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ODPT API Route] Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from ODPT API', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
