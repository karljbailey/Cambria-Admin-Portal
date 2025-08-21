import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock audit helpers
jest.mock('../../lib/audit', () => ({
  auditHelpers: {
    userCreated: jest.fn(),
    permissionsUpdated: jest.fn(),
    userDeleted: jest.fn(),
  },
}));

// Mock auth utils
jest.mock('../../lib/auth-utils', () => ({
  handleLogout: jest.fn(),
}));

// Mock auth
jest.mock('../../lib/auth', () => ({
  hashPassword: jest.fn().mockResolvedValue({ hash: 'hashedPassword', salt: 'salt' }),
}));

describe('User Dialog Core Functionality', () => {
  const mockUsers = [
    {
      id: '1',
      email: 'admin@cambria.com',
      name: 'Admin User',
      role: 'admin' as const,
      status: 'active' as const,
      lastLogin: '2024-01-15T10:30:00Z',
      created_at: new Date('2024-01-01T00:00:00Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const setupAuthenticatedUser = () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          authenticated: true, 
          user: { name: 'Test User', email: 'test@example.com' } 
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          users: mockUsers
        }),
      });
  };

  it('should render users table and allow clicking to open dialog', async () => {
    setupAuthenticatedUser();

    const { default: UsersPage } = await import('../../app/users/page');
    render(<UsersPage />);

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click on the user row
    const userRow = screen.getByText('Admin User').closest('tr');
    expect(userRow).toBeInTheDocument();
    
    fireEvent.click(userRow!);

    // Check if dialog opened with user details
    await waitFor(() => {
      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show edit and action buttons in view mode', async () => {
    setupAuthenticatedUser();

    const { default: UsersPage } = await import('../../app/users/page');
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Click on user row to open dialog
    const userRow = screen.getByText('Admin User').closest('tr');
    fireEvent.click(userRow!);

    // Check for action buttons
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Deactivate')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('should handle horizontal scroll for mobile tables', async () => {
    setupAuthenticatedUser();

    const { default: UsersPage } = await import('../../app/users/page');
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Check for horizontal scroll container
    const tableContainer = screen.getByRole('table').closest('.overflow-x-auto');
    expect(tableContainer).toHaveClass('overflow-x-auto');
  });

  it('should close dialog when close button is clicked', async () => {
    setupAuthenticatedUser();

    const { default: UsersPage } = await import('../../app/users/page');
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Open dialog
    const userRow = screen.getByText('Admin User').closest('tr');
    fireEvent.click(userRow!);

    await waitFor(() => {
      expect(screen.getByText('Administrator')).toBeInTheDocument();
    });

    // Find and click close button (X button)
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(button => 
      button.querySelector('svg')?.innerHTML.includes('M6 18L18 6M6 6l12 12')
    );
    
    if (closeButton) {
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Administrator')).not.toBeInTheDocument();
      });
    }
  });
});
