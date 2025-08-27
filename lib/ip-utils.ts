import { NextRequest } from 'next/server';

/**
 * Get the real client IP address from the request
 * Handles various proxy scenarios and headers
 */
export function getClientIP(request: NextRequest): string {
  // Check for forwarded headers (common with proxies, load balancers, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[0] || 'unknown';
  }

  // Check for real IP header
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Check for client IP header
  const clientIP = request.headers.get('x-client-ip');
  if (clientIP) {
    return clientIP;
  }

  // Check for CF-Connecting-IP (Cloudflare)
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }

  // Check for True-Client-IP (Akamai and Cloudflare)
  const trueClientIP = request.headers.get('true-client-ip');
  if (trueClientIP) {
    return trueClientIP;
  }

  // Fallback to connection remote address
  // Note: In Next.js, this might not be available in all environments
  const connection = (request as any).connection;
  if (connection?.remoteAddress) {
    return connection.remoteAddress;
  }

  // Final fallback
  return 'unknown';
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Get additional request metadata for audit logging
 */
export function getRequestMetadata(request: NextRequest) {
  return {
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
    referer: request.headers.get('referer') || '',
    origin: request.headers.get('origin') || '',
    host: request.headers.get('host') || '',
  };
}

