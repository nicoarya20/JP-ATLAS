# Manrope (static instances)

Manrope is the JP Atlas typeface (SIL Open Font License 1.1, see `OFL.txt`; no Reserved Font Name, so the derived
instances keep the name). The web app ships the variable font at `public/fonts/Manrope-Variable.ttf`; React Native
loads one file per weight (Android cannot pick a weight from a variable TTF through expo-font), so these four files are
static instances cut from that variable font. Atlas weight 650 maps to SemiBold.

Regenerate from the `mobile/` folder with fonttools (`pip install fonttools`):

```sh
SRC=../public/fonts/Manrope-Variable.ttf
fonttools varLib.instancer $SRC wght=400 --static --update-name-table -q -o assets/fonts/Manrope-Regular.ttf
fonttools varLib.instancer $SRC wght=500 --static --update-name-table -q -o assets/fonts/Manrope-Medium.ttf
fonttools varLib.instancer $SRC wght=600 --static --update-name-table -q -o assets/fonts/Manrope-SemiBold.ttf
fonttools varLib.instancer $SRC wght=700 --static --update-name-table -q -o assets/fonts/Manrope-Bold.ttf
```

The file names (without `.ttf`) are the font family names: `src/theme/fonts.ts` loads them under those names and
`global.css` maps `font-normal/medium/semibold/bold` to them.
