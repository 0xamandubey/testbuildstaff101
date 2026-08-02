import { useState, useCallback } from 'react';

// Simple hook that forces a re-render.
// Call refresh() after any store mutation to update the UI.
export function useForceUpdate() {
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);
  return refresh;
}
