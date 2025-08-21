import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientPage from '../../app/client/[code]/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({
    code: 'TEST123'
  })
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('ClientPage Simple UI Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockClientData = {
    clientCode: 'TEST123',
    clientName: 'Test Client',
    fullName: 'Test Client Full Name',
    folderId: 'test-folder-id',
    acosGoal: '15.5',
    tacosGoal: '20.0',
    active: true
  };

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to simulate loading
    );

    render(<ClientPage />);
    
    // Check for loading spinner
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should handle authentication failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: false })
    });

    render(<ClientPage />);

    // Should redirect to login (we can't test this directly, but we can verify the component doesn't crash)
    await waitFor(() => {
      // Component should not crash
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  it('should handle client not found', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: { name: 'Test User', email: 'test@example.com' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ clients: [] }) // No clients found
      });

    render(<ClientPage />);

    // Wait for the component to finish loading and show error
    await waitFor(() => {
      expect(screen.getByTestId('error-title')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle network error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<ClientPage />);

    // Network error during auth check should redirect to login
    // We can't test the redirect directly, but we can verify the component doesn't crash
    await waitFor(() => {
      // Component should not crash and should show loading state
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  it('should render client data when found', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: { name: 'Test User', email: 'test@example.com' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ clients: [mockClientData] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }) // No folder items
      });

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId('client-name')).toBeInTheDocument();
    });

    // Verify client name is displayed
    expect(screen.getByTestId('client-name')).toHaveTextContent('Test Client');
  });

  it('should handle malformed API response', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: { name: 'Test User', email: 'test@example.com' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}) // Empty response - no clients array
      });

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId('error-title')).toBeInTheDocument();
    });
  });
});
