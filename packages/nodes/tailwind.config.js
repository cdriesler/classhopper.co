module.exports = {
  prefix: "np-",
  content: ["./src/**/*.tsx"],
  theme: {
    colors: {
      "dark": "#414141",
      "light": "#FFFFFF",
      "pale": "#EFF2F2",
      "green": "#98E2C6",
      "swampgreen": "#7BBFA5",
      "darkgreen": "#093824",
      "error": "#FF7171",
      "warn": "#FFBE71"
    },
    extend: {
      height: {
        vh: '100vh',
        vw: '100vw',
      },
      width: {
        vh: '100vh',
        vw: '100vw',
      },
      boxShadow: {
        main: '-4px 4px 0 0 rgba(123, 191, 165, 0.3)'
      }
    },
  },
  plugins: [],
}
