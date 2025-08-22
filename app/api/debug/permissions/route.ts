import { NextRequest, NextResponse } from 'next/server';
import { usersService } from '@/lib/collections';
import { permissionsService } from '@/lib/permissions';
import { isFirebaseConfigured } from '@/lib/init';

export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const clientCode = searchParams.get('clientCode');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await usersService.getById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's client permissions
    const clientPermissions = await usersService.getClientPermissions(userId);
    
    // Check specific client permission if provided
    let specificPermission = null;
    if (clientCode) {
      const hasPermission = await usersService.hasClientPermission(userId, clientCode, 'read');
      specificPermission = {
        clientCode,
        hasPermission,
        permission: clientPermissions.find(p => p.clientCode === clientCode)
      };
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      },
      clientPermissions,
      specificPermission,
      totalPermissions: clientPermissions.length,
      isAdmin: user.role === 'admin'
    });
  } catch (error) {
    console.error('Error in permissions debug:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { userId, clientCode, clientName, permissionType } = body;

    if (!userId || !clientCode || !clientName || !permissionType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Add test permission
    const success = await permissionsService.addClientPermission(
      userId,
      clientCode,
      clientName,
      permissionType,
      'debug-endpoint'
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test permission added successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to add test permission' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error adding test permission:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
