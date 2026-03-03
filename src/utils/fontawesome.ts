/**
 * fontawesome.ts
 * ==============
 * Tree-shaken Font Awesome SVG icon library.
 * Only the icons explicitly imported here are included in the build.
 */
import { library, icon } from "@fortawesome/fontawesome-svg-core";
import {
  faCheck,
  faEnvelope,
  faGlobe,
  faMoon,
  faRss,
  faShareNodes,
  faSun,
  faUpRightFromSquare,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  faFacebook,
  faGithub,
  faHackerNews,
  faLinkedin,
  faReddit,
  faTelegram,
  faWhatsapp,
  faXTwitter,
} from "@fortawesome/free-brands-svg-icons";

library.add(
  // Solid
  faCheck,
  faEnvelope,
  faGlobe,
  faMoon,
  faRss,
  faShareNodes,
  faSun,
  faUpRightFromSquare,
  faXmark,
  // Brands
  faFacebook,
  faGithub,
  faHackerNews,
  faLinkedin,
  faReddit,
  faTelegram,
  faWhatsapp,
  faXTwitter,
);

export function getIconSvg(
  prefix: "fas" | "fab",
  name: string,
): string {
  const i = icon({ prefix, iconName: name as any });
  return i ? i.html[0] : "";
}
