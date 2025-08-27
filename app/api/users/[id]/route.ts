import { NextRequest, NextResponse } from 'next/server';
import { usersService } from '@/lib/collections';
import { isFirebaseConfigured } from '@/lib/init';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await usersService.getById(id);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Return user data without sensitive information
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      lastLogin: user.lastLogin,
      clientPermissions: user.clientPermissions || []
    };

    return NextResponse.json({
      success: true,
      user: safeUser
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await usersService.getById(id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Handle password update if provided
    let updateData = { ...body };
    if (body.password) {
      try {
        const { hashPassword } = await import('@/lib/auth');
        const hashedPassword = await hashPassword(body.password);
        updateData = {
          ...body,
          passwordHash: hashedPassword.hash,
          passwordSalt: hashedPassword.salt
        };
        // Remove plain password from update data
        delete updateData.password;
        console.log(`🔐 Password updated for user: ${existingUser.email}`);
      } catch (error) {
        console.error('Error hashing password:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to process password' },
          { status: 500 }
        );
      }
    }

    // Update user
    await usersService.update(id, updateData);
    console.log(`✅ User updated successfully: ${existingUser.email}`);

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Attempting to delete user with ID: ${id}`);

    // Check if user exists before deletion
    const existingUser = await usersService.getById(id);
    if (!existingUser) {
      console.log(`❌ User not found for deletion: ${id}`);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`📋 Found user to delete: ${existingUser.email} (ID: ${id})`);

    // Prevent deletion of the last admin user
    if (existingUser.role === 'admin') {
      const allUsers = await usersService.getAll();
      const adminUsers = allUsers.filter(user => user.role === 'admin' && user.id !== id);
      
      if (adminUsers.length === 0) {
        console.log(`❌ Cannot delete last admin user: ${existingUser.email}`);
        return NextResponse.json(
          { success: false, error: 'Cannot delete the last admin user' },
          { status: 400 }
        );
      }
    }

    // Delete user
    await usersService.delete(id);
    console.log(`✅ User deleted successfully: ${existingUser.email} (ID: ${id})`);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name
      }
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        return NextResponse.json(
          { success: false, error: 'Permission denied. Check Firebase permissions.' },
          { status: 403 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'User not found in database.' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
