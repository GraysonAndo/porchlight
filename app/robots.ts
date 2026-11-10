import type { MetadataRoute } from "next";

/** The sample's working pages are not for search. Only the public pages are listed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/about", "/pricing"], disallow: ["/checkout", "/feedback", "/owner", "/tenant"] }],
  };
}
