import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ObjectValues<T> = T[keyof T];

/**
 * Generate a deterministic color from a string (like poolId) using a simple hash
 * Returns an RGB color string
 */
export function getColorFromString(str: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Define a palette of fancy, vibrant RGB colors with good contrast
  const colors = [
    'rgb(59, 130, 246)',   // blue-500
    'rgb(168, 85, 247)',   // purple-500
    'rgb(236, 72, 153)',   // pink-500
    'rgb(244, 63, 94)',    // rose-500
    'rgb(249, 115, 22)',   // orange-500
    'rgb(245, 158, 11)',   // amber-500
    'rgb(132, 204, 22)',   // lime-500
    'rgb(16, 185, 129)',   // emerald-500
    'rgb(20, 184, 166)',   // teal-500
    'rgb(6, 182, 212)',    // cyan-500
    'rgb(99, 102, 241)',   // indigo-500
    'rgb(139, 92, 246)',   // violet-500
    'rgb(217, 70, 239)',   // fuchsia-500
  ];

  // Use the hash to select a color
  const index = Math.abs(hash) % colors.length;
  return colors[index]!;
}
