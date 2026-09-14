import type { Config } from 'tailwindcss';

/**
 * Material 3 colour roles, expressed as Tailwind tokens.
 * Roles rather than raw colours, so a theme change is one file.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:        { DEFAULT: '#6C3BF5', dark: '#4B21C4', container: '#E9DDFF', on: '#22005D' },
        secondary:      { DEFAULT: '#00B37A', container: '#C8F5E3', on: '#00291A' },
        tertiary:       { DEFAULT: '#FF3D8A', container: '#FFD9E4', on: '#3E0020' },
        danger:         { DEFAULT: '#E0483E', container: '#FFDAD6', on: '#410002' },
        warn:           { DEFAULT: '#E08A00', container: '#FFEBC7', on: '#3B2600' },
        surface:        { DEFAULT: '#FDFAFF', 1: '#F7F2FC', 2: '#F2ECF9', 3: '#EAE2F5' },
        ink:            { DEFAULT: '#1C1B22', variant: '#4A4459', outline: '#7A748A', line: '#E3DEEC' },
      },
      fontFamily: { sans: ['Outfit', 'system-ui', 'sans-serif'] },
      borderRadius: { xl2: '22px', xl3: '28px' },
      boxShadow: {
        e1: '0 1px 3px rgba(28,27,34,.09), 0 1px 2px rgba(28,27,34,.05)',
        e2: '0 2px 8px rgba(28,27,34,.10)',
        e3: '0 6px 18px rgba(28,27,34,.13)',
        e5: '0 14px 40px rgba(28,27,34,.20)',
      },
      transitionTimingFunction: {
        emphasized: 'cubic-bezier(.2,0,0,1)',
        decelerate: 'cubic-bezier(.05,.7,.1,1)',
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'none' } },
      },
      animation: { rise: 'rise .5s cubic-bezier(.05,.7,.1,1) both' },
    },
  },
  plugins: [],
} satisfies Config;
