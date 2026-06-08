/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'surface-container': '#f0eded','surface-bright': '#fcf9f8','on-secondary-fixed-variant': '#8f0e12','outline-variant': '#cfc4c5','tertiary-fixed-dim': '#c6c6c7','surface-container-low': '#f6f3f2','on-primary-container': '#848484','surface': '#fcf9f8','on-surface-variant': '#4c4546','surface-tint': '#5e5e5e','on-secondary': '#ffffff','surface-container-high': '#eae7e7','on-tertiary': '#ffffff','on-tertiary-container': '#838484','inverse-primary': '#c6c6c6','error-container': '#ffdad6','on-primary-fixed-variant': '#474747','secondary-fixed-dim': '#ffb4ac','on-primary': '#ffffff','on-error-container': '#93000a','on-primary-fixed': '#1b1b1b','outline': '#7e7576','on-background': '#1c1b1b','primary-fixed': '#e2e2e2','secondary': '#b22a27','inverse-on-surface': '#f3f0ef','on-tertiary-fixed-variant': '#454747','background': '#fcf9f8','secondary-fixed': '#ffdad6','primary-container': '#1b1b1b','on-secondary-fixed': '#410002','on-secondary-container': '#650006','error': '#ba1a1a','tertiary': '#000000','on-tertiary-fixed': '#1a1c1c','surface-container-highest': '#e5e2e1','on-error': '#ffffff','surface-container-lowest': '#ffffff','primary-fixed-dim': '#c6c6c6','surface-dim': '#dcd9d9','inverse-surface': '#313030','on-surface': '#1c1b1b','tertiary-fixed': '#e2e2e2','tertiary-container': '#1a1c1c','secondary-container': '#fe6257','primary': '#000000','surface-variant': '#e5e2e1',
      },
      borderRadius: { DEFAULT:'0.25rem',lg:'0.5rem',xl:'0.75rem',full:'9999px' },
      spacing: { 'margin-desktop':'64px','margin-mobile':'16px','border-width-thin':'1px','border-width-thick':'4px','unit':'8px','gutter':'24px' },
      fontFamily: { 'headline-sm':['Libre Caslon Text','serif'],'headline-lg':['Libre Caslon Text','serif'],'label-sm':['JetBrains Mono','monospace'],'headline-xl':['Libre Caslon Text','serif'],'body-md':['Hanken Grotesk','sans-serif'],'body-lg':['Hanken Grotesk','sans-serif'],'headline-md':['Libre Caslon Text','serif'] },
      fontSize: { 'headline-sm':['24px',{lineHeight:'32px',fontWeight:'600'}],'headline-lg':['48px',{lineHeight:'56px',letterSpacing:'-0.01em',fontWeight:'700'}],'label-sm':['12px',{lineHeight:'16px',fontWeight:'500'}],'headline-xl':['64px',{lineHeight:'72px',letterSpacing:'-0.02em',fontWeight:'700'}],'body-md':['16px',{lineHeight:'24px',fontWeight:'400'}],'body-lg':['18px',{lineHeight:'28px',fontWeight:'400'}],'headline-md':['32px',{lineHeight:'40px',fontWeight:'600'}] },
    },
  },
  plugins: [],
};