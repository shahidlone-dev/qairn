# qaaf — Android icon kit

Drop-in replacement for your launcher icon.

## What's in here

```
android/res/                          ← copy this into your app's res/ folder
  mipmap-anydpi-v26/
    ic_launcher.xml                   ← adaptive icon manifest
    ic_launcher_round.xml             ← (same — Android picks based on launcher)
  mipmap-mdpi/      .. xxxhdpi/
    ic_launcher_foreground.png        ← adaptive foreground (108 dp inset 18 dp)
    ic_launcher_background.png        ← adaptive background (full-bleed gradient)
    ic_launcher.png                   ← legacy launcher (squircle, Android < 8)
    ic_launcher_round.png             ← legacy round mask
  drawable/
    ic_launcher_monochrome.png        ← Android 13+ themed icon

android/play-store/
  ic_launcher-playstore.png           ← 512×512, hi-res for Play Console
  feature-graphic.png                 ← 1024×500, optional listing graphic

android/svg/                          ← editable SVG sources
  ic_launcher_foreground.svg
  ic_launcher_background.svg
  ic_launcher_monochrome.svg
```

## Wire it up

In `AndroidManifest.xml`, your `<application>` already references this:

```xml
<application
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    ... >
```

No code change needed — Android picks the adaptive icon on 8.0+, the squircle on
older versions, and the monochrome glyph when the user enables themed icons.

## Density buckets

| bucket   | dp  | adaptive px | legacy px |
|----------|-----|-------------|-----------|
| mdpi     | 1×  | 108         | 48        |
| hdpi     | 1.5×| 162         | 72        |
| xhdpi    | 2×  | 216         | 96        |
| xxhdpi   | 3×  | 324         | 144       |
| xxxhdpi  | 4×  | 432         | 192       |

## Colours

- Gradient: `#7C5CFF` → `#EC4899` (135°)
- Glyph stroke: `#FFFFFF` (mono uses the same — Android tints it for themed mode)
