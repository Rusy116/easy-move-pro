import ReactMarkdown from "react-markdown";
import { Link } from "@tanstack/react-router";

/**
 * Safe Markdown renderer shared by the public /blog/$slug route and the admin
 * blog review preview. Raw HTML is NOT enabled (react-markdown skips it by
 * default) and dangerouslySetInnerHTML is never used. Unsafe URL schemes
 * (javascript:, data:, vbscript:) are stripped by react-markdown's default
 * uriTransform.
 */
export function BlogMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h2: ({ children }) => (
          <h2 className="mt-10 font-serif text-3xl font-medium leading-snug">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-8 font-serif text-2xl font-medium leading-snug">{children}</h3>
        ),
        p: ({ children }) => <p className="mt-4 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6">{children}</ul>,
        ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        a: ({ href, children }) => {
          if (href && href.startsWith("/")) {
            return (
              <Link
                to={href}
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                {children}
              </Link>
            );
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
