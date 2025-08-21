import { NextRequest, NextResponse } from 'next/server';
import { rbacService } from '@/lib/rbac';
import { usersService } from '@/lib/collections';
import { isFirebaseConfigured } from '@/lib/init';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user to determine their role
    const user = await usersService.getById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user permissions using RBAC service
    const userPermissions = await rbacService.getUserPermissions(userId, user.role);

    return NextResponse.json({
      success: true,
      permissions: userPermissions,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const { userId } = await params;
    const body = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate request body
    const { permissions } = body;
    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Permissions object is required' },
        { status: 400 }
      );
    }

    // Clear user permissions cache to force refresh
    rbacService.clearUserCache(userId);

    return NextResponse.json({
      success: true,
      message: 'User permissions cache cleared successfully'
    });

  } catch (error) {
    console.error('Error updating user permissions cache:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
