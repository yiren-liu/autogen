import type { GatsbyConfig } from "gatsby";
import fs from "fs";

const envFile = `.env.${process.env.NODE_ENV}`;
const siteUrl = process.env.URL || `https://fallback.net`;

fs.access(envFile, fs.constants.F_OK, (err) => {
  if (err) {
    console.warn(`File '${envFile}' is missing. Using default values.`);
  }
});

require("dotenv").config({
  path: envFile,
});

const config: GatsbyConfig = {
  pathPrefix: process.env.PREFIX_PATH_VALUE || "",
  siteMetadata: {
    title: `AutoGen Studio`,
    description: `Build Multi-Agent Apps`,
    siteUrl: siteUrl, // Use the same siteUrl variable
  },
  // More easily incorporate content into your pages through automatic TypeScript type generation and better GraphQL IntelliSense.
  // If you use VSCode you can also use the GraphQL plugin
  // Learn more at: https://gatsby.dev/graphql-typegen
  graphqlTypegen: true,
  plugins: [
    "gatsby-plugin-postcss",
    "gatsby-plugin-image",
    {
      resolve: "gatsby-plugin-sitemap",
      options: {
        excludes: ["/**/404", "/**/404.html"],
        resolveSiteUrl: () => siteUrl,
        query: `
          {
            allSitePage {
              edges {
                node {
                  path
                }
              }
            }
          }
        `,
        resolvePages: ({ allSitePage: { edges } }: { allSitePage: { edges: Array<{ node: { path: string } }> } }) => {
          const pages = edges
            .filter(({ node }) => !["/404/", "/404.html", "/dev-404-page/"].includes(node.path))
            .map(({ node }) => ({
              path: node.path,
              url: node.path === "/" ? siteUrl : `${siteUrl}${node.path}`,
              changefreq: "daily",
              priority: node.path === "/" ? 1.0 : 0.7,
            }));
          
          // Ensure we always return at least one page to avoid empty sitemap
          if (pages.length === 0) {
            return [{
              path: "/",
              url: siteUrl,
              changefreq: "daily",
              priority: 1.0,
            }];
          }
          
          return pages;
        },
        serialize: (page: any) => page,
      },
    },
    {
      resolve: "gatsby-plugin-manifest",
      options: {
        icon: "src/images/icon.png",
      },
    },
    "gatsby-plugin-mdx",
    "gatsby-plugin-sharp",
    "gatsby-transformer-sharp",
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "images",
        path: "./src/images/",
      },
      __key: "images",
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "pages",
        path: "./src/pages/",
      },
      __key: "pages",
    },
  ],
};

export default config;
