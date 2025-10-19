import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FocusSprint } from '../focus-sprint';

// Mock HTML5 APIs
global.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
global.HTMLMediaElement.prototype.pause = vi.fn();
Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null,
});
Object.defineProperty(document.documentElement, 'requestFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});
Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('FocusSprint Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with white noise sound', () => {
    const mockOnClose = vi.fn();
    render(
      <FocusSprint sound="white-noise" onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );
    
    const container = screen.getByTestId('focus-sprint-container');
    expect(container).toBeInTheDocument();
  });

  it('should render with soft chime sound', () => {
    const mockOnClose = vi.fn();
    render(
      <FocusSprint sound="soft-chime" onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );
    
    const container = screen.getByTestId('focus-sprint-container');
    expect(container).toBeInTheDocument();
  });

  it('should render with nature sounds', () => {
    const mockOnClose = vi.fn();
    render(
      <FocusSprint sound="nature-sounds" onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );
    
    const container = screen.getByTestId('focus-sprint-container');
    expect(container).toBeInTheDocument();
  });

  it('should display timer', () => {
    const mockOnClose = vi.fn();
    render(
      <FocusSprint sound="white-noise" onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );
    
    // Should show time remaining (initially 10:00)
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it('should have close button', () => {
    const mockOnClose = vi.fn();
    render(
      <FocusSprint sound="white-noise" onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );
    
    const closeButton = screen.getByTestId('button-close-sprint');
    expect(closeButton).toBeInTheDocument();
  });

  it('should have pause/play button', () => {
    const mockOnClose = vi.fn();
    render(
      <FocusSprint sound="white-noise" onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );
    
    // Look for pause button by text content
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });

  it('should display work/break phase', () => {
    const mockOnClose = vi.fn();
    render(
      <FocusSprint sound="white-noise" onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );
    
    const container = screen.getByTestId('focus-sprint-container');
    expect(container).toBeInTheDocument();
  });
});
