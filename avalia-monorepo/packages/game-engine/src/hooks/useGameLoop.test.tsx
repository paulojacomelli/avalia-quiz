import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameLoop } from './useGameLoop';

describe('useGameLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useGameLoop());
    
    expect(result.current.timeLeft).toBe(60);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.timer).toBeNull();
  });

  it('should start timer when start is called', () => {
    const { result } = renderHook(() => useGameLoop());
    
    act(() => {
      result.current.start(30);
    });
    
    expect(result.current.timeLeft).toBe(30);
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.timer).not.toBeNull();
  });

  it('should pause timer when pause is called', () => {
    const { result } = renderHook(() => useGameLoop());
    
    act(() => {
      result.current.start(30);
    });
    
    act(() => {
      result.current.pause();
    });
    
    expect(result.current.isPaused).toBe(true);
    expect(result.current.isPlaying).toBe(true);
  });

  it('should resume timer when resume is called', () => {
    const { result } = renderHook(() => useGameLoop());
    
    act(() => {
      result.current.start(30);
    });
    
    act(() => {
      result.current.pause();
    });
    
    act(() => {
      result.current.resume();
    });
    
    expect(result.current.isPaused).toBe(false);
    expect(result.current.isPlaying).toBe(true);
  });

  it('should stop timer when stop is called', () => {
    const { result } = renderHook(() => useGameLoop());
    
    act(() => {
      result.current.start(30);
    });
    
    act(() => {
      result.current.stop();
    });
    
    expect(result.current.timeLeft).toBe(30);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.timer).toBeNull();
  });

  it('should countdown time when timer is running', async () => {
    const { result } = renderHook(() => useGameLoop());
    
    act(() => {
      result.current.start(3);
    });
    
    expect(result.current.timeLeft).toBe(3);
    
    await act(async () => {
      await vi.advanceTimersByTime(1000);
    });
    
    expect(result.current.timeLeft).toBe(2);
    
    await act(async () => {
      await vi.advanceTimersByTime(1000);
    });
    
    expect(result.current.timeLeft).toBe(1);
  });

  it('should call onTimeUp when time reaches zero', async () => {
    const onTimeUp = vi.fn();
    const { result } = renderHook(() => useGameLoop({ onTimeUp }));
    
    act(() => {
      result.current.start(1);
    });
    
    await act(async () => {
      await vi.advanceTimersByTime(1000);
    });
    
    await act(async () => {
      await vi.advanceTimersByTime(1000);
    });
    
    expect(onTimeUp).toHaveBeenCalled();
  });
});