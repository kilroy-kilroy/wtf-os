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
              marginTop: "5rem",
              marginBottom: "1.25rem",
              position: "relative",
              paddingTop: "1.5rem",
              "&::before": {
                content: '""',
                display: "block",
                position: "absolute",
                top: "0",
                left: "0",
                width: "3rem",
                height: "4px",
                backgroundColor: "hsl(var(--brand))",
              },
            },
            "h2:first-child, h1 + h2": {
              marginTop: "2.5rem",
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
            // Footnote markers in body text — small Anton brand-color superscripts.
            "sup a": {
              fontFamily: "var(--font-anton), ui-sans-serif, system-ui, sans-serif",
              color: "hsl(var(--brand))",
              textDecoration: "none",
              fontSize: "0.7em",
              marginLeft: "0.15em",
              padding: "0 0.25em",
              borderRadius: "0.125rem",
              backgroundColor: "hsl(var(--brand) / 0.08)",
            },
            "sup a:hover": {
              backgroundColor: "hsl(var(--brand) / 0.18)",
            },
            // Auto-generated footnotes appendix at bottom of report.
            ".footnotes": {
              marginTop: "5rem",
              paddingTop: "2rem",
              borderTop: "2px solid hsl(var(--foreground))",
              fontSize: "0.875rem",
              color: "hsl(var(--muted-foreground))",
            },
            ".footnotes h2": {
              fontFamily: "var(--font-anton), ui-sans-serif, system-ui, sans-serif",
              fontSize: "1.125rem",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "hsl(var(--foreground))",
              marginTop: "0",
              marginBottom: "1rem",
              padding: "0",
              border: "none",
              position: "static",
              clip: "auto",
              clipPath: "none",
              width: "auto",
              height: "auto",
              overflow: "visible",
              whiteSpace: "normal",
            },
            ".footnotes h2::before": { display: "none" },
            ".footnotes ol": { paddingLeft: "1.25rem" },
            ".footnotes li": { marginTop: "0.5rem", marginBottom: "0.5rem" },
            ".footnotes li p": { margin: "0", display: "inline" },
            ".footnotes a.data-footnote-backref": {
              marginLeft: "0.4em",
              color: "hsl(var(--brand))",
              textDecoration: "none",
              fontSize: "0.85em",
            },
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
