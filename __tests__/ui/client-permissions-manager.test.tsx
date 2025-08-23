import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientPermissionsManager from '../../../components/ClientPermissionsManager';

// Mock fetch
global.fetch = jest.fn();

// Mock the component props
const mockProps = {
  userId: 'test-user-123',
  userName: 'Test User',
  onClose: jest.fn()
};

describe('ClientPermissionsManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should render loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to simulate loading
    );

    render(<ClientPermissionsManager {...mockProps} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render client permissions manager with user name', async () => {
    const mockPermissionsResponse = {
      success: true,
      permissions: []
    };

    const mockClientsResponse = {
      ok: true,
      json: () => Promise.resolve({ clients: [] })
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockPermissionsResponse)
      })
      .mockResolvedValueOnce(mockClientsResponse);

    render(<ClientPermissionsManager {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Client Permissions for Test User')).toBeInTheDocument();
    });
  });

  it('should display current permissions when available', async () => {
    const mockPermissions = [
      {
        clientCode: 'CLIENT001',
        clientName: 'Test Client 1',
        permissionType: 'read',
        grantedBy: 'admin@test.com',
        grantedAt: new Date('2024-01-01'),
        expiresAt: undefined
      }
    ];

    const mockClients = [
      {
        folderId: 'folder1',
        clientCode: 'CLIENT001',
        clientName: 'Test Client 1',
        fullName: 'Test Client 1 Full Name',
        active: true
      }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: mockPermissions })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clients: mockClients })
      });

    render(<ClientPermissionsManager {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Client 1')).toBeInTheDocument();
      expect(screen.getByText('CLIENT001')).toBeInTheDocument();
    });
  });

  it('should show "No client permissions assigned" when user has no permissions', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clients: [] })
      });

    render(<ClientPermissionsManager {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('No client permissions assigned')).toBeInTheDocument();
    });
  });

  it('should toggle add permission form when button is clicked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clients: [] })
      });

    render(<ClientPermissionsManager {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add Permission')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Permission'));

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('should call onClose when close button is clicked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, permissions: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clients: [] })
      });

    render(<ClientPermissionsManager {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    expect(mockProps.onClose).toHaveBeenCalled();
  });
});


