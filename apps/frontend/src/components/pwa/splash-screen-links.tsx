import splashLinks from './splash-links.generated.json';

/**
 * iOS launch images (`apple-touch-startup-image`). Next's Metadata API has no first-class
 * support for these media-queried <link>s (spec §2), so we render them directly — React 19
 * hoists <link> elements into <head>. Data is generated per iOS device by
 * scripts/gen-pwa-assets (see public/splash/*). A device with no exact match falls back to
 * a white launch screen, which is why the table aims to cover the common devices.
 *
 * Server Component (no client JS). Rendered inside the root layout.
 */
export function SplashScreenLinks() {
  return (
    <>
      {(splashLinks as { href: string; media: string }[]).map((link) => (
        <link
          key={link.href}
          rel="apple-touch-startup-image"
          href={link.href}
          media={link.media}
        />
      ))}
    </>
  );
}
