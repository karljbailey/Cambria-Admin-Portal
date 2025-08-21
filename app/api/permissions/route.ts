import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, isFirebaseConfigured } from '@/lib/init';
import { usersService } from '@/lib/collections';

// Initialize Firebase if configured
if (isFirebaseConfigured()) {
  initializeApp().catch(console.error);
}

// Mock data for user permissions (fallback when Firebase is not configured)
const mockUsers = [
  {
    id: '1',
    email: 'admin@cambria.com',
    name: 'Admin User',
    permissions: ['admin'],
    status: 'active',
    lastLogin: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    email: 'writer@cambria.com',
    name: 'Writer User',
    permissions: ['write'],
    status: 'active',
    lastLogin: '2024-01-14T15:45:00Z',
    createdAt: '2024-01-05T00:00:00Z'
  },
  {
    id: '3',
    email: 'reader@cambria.com',
    name: 'Reader User',
    permissions: ['read'],
    status: 'active',
    lastLogin: '2024-01-13T09:20:00Z',
    createdAt: '2024-01-10T00:00:00Z'
  },
  {
    id: '4',
    email: 'inactive@cambria.com',
    name: 'Inactive User',
    permissions: ['read'],
    status: 'inactive',
    lastLogin: '2024-01-05T11:15:00Z',
    createdAt: '2024-01-15T00:00:00Z'
  }
];

export async function GET() {
  try {
    let users = [];

    if (isFirebaseConfigured()) {
      // Use Firebase
      try {
        users = await usersService.getAll();
        console.log(`📊 Retrieved ${users.length} users from Firebase`);
      } catch (error) {
        console.error('Error fetching from Firebase, falling back to mock data:', error);
        users = [...mockUsers];
      }
    } else {
      // Use mock data
      console.log('⚠️ Firebase not configured, using mock data');
      users = [...mockUsers];
    }

    return NextResponse.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, role, passwordHash, passwordSalt } = body;

    // Validate required fields
    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, role' },
        { status: 400 }
      );
    }

    // Validate password fields for new users
    if (!passwordHash || !passwordSalt) {
      return NextResponse.json(
        { error: 'Password hash and salt are required for new users' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = mockUsers.find(user => user.email === email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const userData = {
      email,
      name,
      role,
      passwordHash,
      passwordSalt,
      status: 'active' as const,
      lastLogin: null
    };

    let newUser;

    if (isFirebaseConfigured()) {
      // Use Firebase
      newUser = await usersService.add(userData);
      console.log(`✅ User created in Firebase with ID: ${newUser.id}`);
    } else {
      // Use mock data
      console.log('⚠️ Firebase not configured, using mock data');
      newUser = {
        id: (mockUsers.length + 1).toString(),
        email: userData.email,
        name: userData.name,
        permissions: [role], // Convert role to permissions array
        status: 'active',
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      mockUsers.push(newUser);
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, name, role, status } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    let updatedUser;

    if (isFirebaseConfigured()) {
      // Use Firebase
      const existingUser = await usersService.getById(id);
      if (!existingUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Update user in Firebase
      await usersService.update(id, {
        ...(email && { email }),
        ...(name && { name }),
        ...(role && { role }),
        ...(status && { status })
      });

      // Get updated user
      updatedUser = await usersService.getById(id);
      console.log(`✅ User updated in Firebase with ID: ${id}`);
    } else {
      // Use mock data
      console.log('⚠️ Firebase not configured, using mock data');
      const userIndex = mockUsers.findIndex(user => user.id === id);
      if (userIndex === -1) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      updatedUser = {
        ...mockUsers[userIndex],
        ...(email && { email }),
        ...(name && { name }),
        ...(role && { role }),
        ...(status && { status })
      };

      mockUsers[userIndex] = updatedUser;
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    let deletedUser;

    if (isFirebaseConfigured()) {
      // Use Firebase
      const existingUser = await usersService.getById(id);
      if (!existingUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Delete user from Firebase
      await usersService.delete(id);
      deletedUser = existingUser;
      console.log(`✅ User deleted from Firebase with ID: ${id}`);
    } else {
      // Use mock data
      console.log('⚠️ Firebase not configured, using mock data');
      const userIndex = mockUsers.findIndex(user => user.id === id);
      if (userIndex === -1) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      deletedUser = mockUsers.splice(userIndex, 1)[0];
    }

    return NextResponse.json({
      success: true,
      user: deletedUser,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
