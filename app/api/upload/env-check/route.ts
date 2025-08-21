import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    
    const envStatus = {
      hasServiceAccountEmail: !!serviceAccountEmail,
      hasPrivateKey: !!privateKey,
      serviceAccountEmailLength: serviceAccountEmail?.length || 0,
      privateKeyLength: privateKey?.length || 0,
      privateKeyHasNewlines: privateKey?.includes('\\n') || false,
      serviceAccountEmailFormat: serviceAccountEmail ? 
        (serviceAccountEmail.includes('@') && serviceAccountEmail.includes('.')) : false
    };

    const isFullyConfigured = envStatus.hasServiceAccountEmail && 
                             envStatus.hasPrivateKey &&
                             envStatus.serviceAccountEmailFormat &&
                             envStatus.privateKeyLength > 100; // Private keys should be substantial

    return NextResponse.json({
      configured: isFullyConfigured,
      details: envStatus,
      recommendations: getRecommendations(envStatus)
    });

  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to check configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getRecommendations(envStatus: {
  hasServiceAccountEmail: boolean;
  hasPrivateKey: boolean;
  serviceAccountEmailLength: number;
  privateKeyLength: number;
  privateKeyHasNewlines: boolean;
  serviceAccountEmailFormat: boolean;
}): string[] {
  const recommendations: string[] = [];

  if (!envStatus.hasServiceAccountEmail) {
    recommendations.push('Set GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable');
  } else if (!envStatus.serviceAccountEmailFormat) {
    recommendations.push('Verify GOOGLE_SERVICE_ACCOUNT_EMAIL is a valid email address');
  }

  if (!envStatus.hasPrivateKey) {
    recommendations.push('Set GOOGLE_PRIVATE_KEY environment variable');
  } else {
    if (envStatus.privateKeyLength < 100) {
      recommendations.push('GOOGLE_PRIVATE_KEY appears to be too short - verify it contains the full private key');
    }
    if (!envStatus.privateKeyHasNewlines) {
      recommendations.push('GOOGLE_PRIVATE_KEY should contain \\n characters for line breaks');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Google Drive configuration appears to be complete');
  }

  return recommendations;
}
