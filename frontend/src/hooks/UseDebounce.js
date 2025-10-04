import { useState, useEffect } from "react";

/**
 * useDebounce hook
 * @param value - the value to debounce
 * @param delay - delay in milliseconds
 * @returns debouncedValue - value updated after delay
 */
const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up a timer to update debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup the timeout if value changes before delay ends
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
