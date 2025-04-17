import { jsxRenderer } from "hono/jsx-renderer";
// Importing the CSS here might be for build/dev server purposes.
// The actual styling in the browser comes from the <link> tag below.
import "./style.css";

export const renderer = jsxRenderer(({ children, title }) => {
  return (
    <html lang="en"> {/* Consider changing lang if the primary UI language isn't English */}
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Use the title prop passed in, or a default title */}
        <title>{title || "AI French Teacher Chat"}</title>

        {/* Markdown-it for rendering assistant responses */}
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.2/markdown-it.min.js"
          integrity="sha512-ohlWmsCxOu0bph1om5eDL0jm/83eH09fvqLDhiEdiqfDeJbEvz4FSbeY0gLJSVJwQAp0laRhTXbUQG+ZUuifUQ=="
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
        ></script>

        {/* Highlight.js for code block syntax highlighting */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css"
          // Consider other themes like 'github-dark', 'atom-one-dark', etc.
          integrity="sha512-0aPQyyeZrWj9sCA46UlmWgKOP0mUipLQ6OZXu8l4IcAmD2u31EPEy9VcIMvl7SoAaKe8bLXZhYoMaE/in+gcgA=="
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
        />
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"
          // No need for highlightAll() here; script.js calls highlightElement dynamically
          ></script>

        {/* Link your application's main stylesheet */}
        {import.meta.env.PROD ? (
          <link href="/static/style.css" rel="stylesheet" />
        ) : (
          <link href="/src/style.css" rel="stylesheet" />
        )}
      </head>
      {/* font-sans is likely overridden by body style in style.css, but harmless */}
      <body className="font-sans">{children}</body>
    </html>
  );
});
