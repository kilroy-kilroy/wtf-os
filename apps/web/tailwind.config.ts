import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        anton: ['var(--font-anton)'],
        poppins: ['var(--font-poppins)'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand))",
          foreground: "hsl(var(--brand-foreground))",
          ink: "hsl(var(--brand-ink))",
        },
        scorecard: {
          fail: "hsl(var(--score-fail))",
          warn: "hsl(var(--score-warn))",
          pass: "hsl(var(--score-pass))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      typography: {
        DEFAULT: {
          css: {
            "--tw-prose-headings": "hsl(var(--foreground))",
            "--tw-prose-bold": "hsl(var(--brand-ink))",
            "--tw-prose-quotes": "hsl(var(--brand-ink))",
            "--tw-prose-quote-borders": "hsl(var(--brand))",
            color: "hsl(var(--foreground))",
            fontFamily: "var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
            fontSize: "1.0625rem",
            lineHeight: "1.7",
            h1: {
              fontFamily: "var(--font-anton), ui-sans-serif, system-ui, sans-serif",
              fontWeight: "400",
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
              lineHeight: "1.0",
              marginTop: "0",
              marginBottom: "1.5rem",
            },
            h2: {
              fontFamily: "var(--font-anton), ui-sans-serif, system-ui, sans-serif",
              fontWeight: "400",
              textTransform: "uppercase",
              letterSpacing: "0",
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              lineHeight: "1.05",
              marginTop: "3rem",
              marginBottom: "1rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid hsl(var(--border))",
            },
            "h2:first-child": {
              marginTop: "0",
              paddingTop: "0",
              borderTop: "none",
            },
            h3: {
              fontFamily: "var(--font-anton), ui-sans-serif, system-ui, sans-serif",
              fontWeight: "400",
              textTransform: "uppercase",
              letterSpacing: "0.01em",
              fontSize: "1.5rem",
              lineHeight: "1.15",
              marginTop: "2rem",
              marginBottom: "0.75rem",
            },
            h4: {
              fontFamily: "var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
              fontWeight: "700",
              fontSize: "1.0625rem",
              marginTop: "1.5rem",
              marginBottom: "0.5rem",
            },
            strong: {
              fontWeight: "700",
              color: "hsl(var(--brand-ink))",
            },
            blockquote: {
              fontStyle: "italic",
              fontWeight: "500",
              borderLeftWidth: "3px",
              paddingLeft: "1.25rem",
            },
            "ul > li::marker": { color: "hsl(var(--brand))" },
            "ol > li::marker": { color: "hsl(var(--brand))" },
            a: {
              color: "hsl(var(--brand))",
              textDecorationColor: "hsl(var(--brand) / 0.4)",
              textUnderlineOffset: "3px",
              fontWeight: "500",
            },
            "a:hover": {
              color: "hsl(var(--brand-ink))",
            },
            code: {
              fontWeight: "500",
              backgroundColor: "hsl(var(--muted))",
              padding: "0.15rem 0.4rem",
              borderRadius: "0.25rem",
            },
            "code::before": { content: "none" },
            "code::after": { content: "none" },
          },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
} satisfies Config

export default config
