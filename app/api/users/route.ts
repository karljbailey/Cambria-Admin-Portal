import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, isFirebaseConfigured } from '@/lib/init';
import { usersService } from '@/lib/collections';
import { hashPassword } from '@/lib/auth';
import { auditHelpers } from '@/lib/audit';
import { sendNewUserWelcomeEmail } from '@/lib/email';

// Initialize Firebase if configured
if (isFirebaseConfigured()) {
  initializeApp().catch(console.error);
}

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase is not configured. Please configure Firebase to create users.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { email, name, role, password } = body;

    // Validate required fields
    if (!email || !name || !role || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, name, role, password' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'basic'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be "admin" or "basic"' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await usersService.getByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password with pepper
    let passwordHash, passwordSalt;
    try {
      const hashedPassword = await hashPassword(password);
      passwordHash = hashedPassword.hash;
      passwordSalt = hashedPassword.salt;
      console.log(`🔐 Password hashed with pepper for user: ${email}`);
    } catch (error) {
      console.error('Error hashing password:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to process password' },
        { status: 500 }
      );
    }

    // Create new user
    const userData = {
      email,
      name,
      role: role as 'admin' | 'basic',
      passwordHash,
      passwordSalt,
      status: 'active' as const,
      lastLogin: null
    };

    const newUser = await usersService.add(userData);
    console.log(`✅ User created in Firebase with ID: ${newUser.id}`);

    // Send welcome email with credentials
    try {
      const emailSent = await sendNewUserWelcomeEmail(email, name, password, role);
      if (emailSent) {
        console.log(`📧 Welcome email sent successfully to ${email}`);
      } else {
        console.warn(`⚠️ Failed to send welcome email to ${email}`);
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't fail the user creation if email sending fails
    }

    // Add audit log for user creation
    try {
      await auditHelpers.userCreated(name, email, {
        id: 'system',
        name: 'System',
        email: 'system@cambria.com'
      });
      console.log(`📝 Audit log created for user creation: ${email}`);
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't fail the user creation if audit logging fails
    }

    // Return user data without sensitive fields
    const responseUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      status: newUser.status,
      lastLogin: newUser.lastLogin,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at
    };

    return NextResponse.json({
      success: true,
      user: responseUser,
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase is not configured. Please configure Firebase to retrieve users.' },
        { status: 503 }
      );
    }

    const users = await usersService.getAll();
    console.log(`📊 Retrieved ${users.length} users from Firebase`);

    // Return users without sensitive fields
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      lastLogin: user.lastLogin,
      clientPermissions: user.clientPermissions || [],
      created_at: user.created_at,
      updated_at: user.updated_at
    }));

    return NextResponse.json({
      success: true,
      users: safeUsers
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
