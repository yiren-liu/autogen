/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    `./src/pages/**/*.{js,jsx,ts,tsx}`,
    `./src/components/**/*.{js,jsx,ts,tsx}`,
  ],
  theme: {
  	extend: {
  		typography: {
  			DEFAULT: {
  				css: {
  					maxWidth: '100ch'
  				}
  			}
  		},
  		transitionProperty: {
  			height: 'height',
  			spacing: 'margin, padding'
  		},
  				colors: {
			primary: {
				DEFAULT: 'var(--primary)',
				foreground: 'var(--primary-foreground)'
			},
			secondary: {
				DEFAULT: 'var(--secondary)',
				foreground: 'var(--secondary-foreground)'
			},
			accent: {
				DEFAULT: 'var(--accent)',
				foreground: 'var(--accent-foreground)'
			},
			light: 'var(--color-bg-light)',
			tertiary: 'var(--color-bg-tertiary)',
			background: 'var(--background)',
			foreground: 'var(--foreground)',
			card: {
				DEFAULT: 'var(--card)',
				foreground: 'var(--card-foreground)'
			},
			popover: {
				DEFAULT: 'var(--popover)',
				foreground: 'var(--popover-foreground)'
			},
			muted: {
				DEFAULT: 'var(--muted)',
				foreground: 'var(--muted-foreground)'
			},
			destructive: {
				DEFAULT: 'var(--destructive)',
				foreground: 'var(--destructive-foreground)'
			},
			border: 'var(--border)',
			input: 'var(--input)',
			ring: 'var(--ring)',
			chart: {
				'1': 'hsl(var(--chart-1))',
				'2': 'hsl(var(--chart-2))',
				'3': 'hsl(var(--chart-3))',
				'4': 'hsl(var(--chart-4))',
				'5': 'hsl(var(--chart-5))'
			}
		},
  		textColor: {
  			accent: 'var(--color-text-accent)',
  			primary: 'var(--color-text-primary)',
  			secondary: 'var(--color-text-secondary)'
  		},
  		borderColor: {
  			accent: 'var(--color-border-accent)',
  			primary: 'var(--color-border-primary)',
  			secondary: 'var(--color-border-secondary)'
  		},
  		ringColor: {
  			accent: 'var(--color-text-accent)',
  			primary: 'var(--color-text-primary)',
  			secondary: 'var(--color-text-secondary)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [
    require("@tailwindcss/typography"),
    function ({ addBase, theme }) {
      addBase({
        ":root": {
          "--tw-bg-opacity": "1",
          "--tw-text-opacity": "1",
          "--tw-border-opacity": "1",
        },
      });
    },
      require("tailwindcss-animate")
],
};
