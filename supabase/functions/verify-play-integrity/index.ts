import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface IntegrityPayload {
  token?: string;
  deviceInfo?: {
    isRooted?: boolean;
    isDevice?: boolean;
    brand?: string;
    modelName?: string;
    osVersion?: string;
    platformApiLevel?: number;
  };
  clientTimestamp?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const body: IntegrityPayload = await req.json().catch(() => ({}));
    const { token, deviceInfo, clientTimestamp } = body;

    const serverNow = Date.now();
    let clockTampered = false;
    let clockSkewSeconds = 0;

    if (clientTimestamp) {
      const clientTimeMs = new Date(clientTimestamp).getTime();
      clockSkewSeconds = Math.round(Math.abs(serverNow - clientTimeMs) / 1000);
      if (clockSkewSeconds > 300) {
        clockTampered = true;
      }
    }

    const isRooted = !!deviceInfo?.isRooted;
    const isEmulator = deviceInfo?.isDevice === false;
    const isSuspicious = isRooted || clockTampered || isEmulator;

    // Structure attestation response
    const responsePayload = {
      success: !isSuspicious,
      isSuspicious,
      clockSkewSeconds,
      verdict: {
        basicIntegrity: !isEmulator,
        deviceIntegrity: !isRooted,
        clockAuthoritative: !clockTampered,
      },
      message: isSuspicious
        ? `Device attestation flagged: ${[isRooted && 'rooted', clockTampered && 'clock_skew', isEmulator && 'emulator'].filter(Boolean).join(', ')}`
        : 'Device integrity verified',
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Integrity attestation failed' }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 500,
      }
    );
  }
})
