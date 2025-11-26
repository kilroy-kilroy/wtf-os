'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ConsoleMarkdownRendererProps {
  content: string;
  className?: string;
}

export function ConsoleMarkdownRenderer({ content, className = '' }: ConsoleMarkdownRendererProps) {
  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings with console styling
          h1: ({ children, ...props }) => (
            <h1 className="text-3xl font-anton uppercase mt-8 mb-4 text-[#FFDE59] tracking-wide border-b border-[#E51B23] pb-2" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-2xl font-anton uppercase mt-6 mb-3 text-[#FFDE59] tracking-wide" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-xl font-anton uppercase mt-4 mb-2 text-white tracking-wide" {...props}>
              {children}
            </h3>
          ),
          // Paragraphs
          p: ({ children, ...props }) => (
            <p className="mb-4 text-white font-poppins leading-relaxed" {...props}>
              {children}
            </p>
          ),
          // Lists
          ul: ({ children, ...props }) => (
            <ul className="list-none mb-4 space-y-2 ml-0" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 text-white" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-white font-poppins flex items-start" {...props}>
              <span className="text-[#FFDE59] mr-2">▸</span>
              <span className="flex-1">{children}</span>
            </li>
          ),
          // Blockquotes (for evidence quotes)
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-[#FFDE59] pl-4 my-4 italic text-[#B3B3B3] bg-[#1a1a1a] py-3 rounded-r"
              {...props}
            >
              {children}
            </blockquote>
          ),
          // Code
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              <code
                className="bg-[#1a1a1a] px-2 py-1 rounded text-sm font-mono text-[#FFDE59] border border-[#333333]"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="block bg-[#0a0a0a] text-[#FFDE59] p-4 rounded border border-[#E51B23] overflow-x-auto font-mono text-sm"
                {...props}
              >
                {children}
              </code>
            ),
          // Tables
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-[#E51B23] border border-[#E51B23]" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-[#1a1a1a]" {...props}>
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }) => (
            <tbody className="bg-black divide-y divide-[#333333]" {...props}>
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr {...props}>{children}</tr>
          ),
          th: ({ children, ...props }) => (
            <th
              className="px-6 py-3 text-left text-xs font-anton uppercase text-[#FFDE59] tracking-wider"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-6 py-4 text-sm text-white font-poppins" {...props}>
              {children}
            </td>
          ),
          // Horizontal rules
          hr: ({ ...props }) => <hr className="my-8 border-[#E51B23]" {...props} />,
          // Links
          a: ({ children, ...props }) => (
            <a
              className="text-[#FFDE59] hover:text-white underline transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          // Strong/bold - highlight important text in yellow
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-[#FFDE59]" {...props}>
              {children}
            </strong>
          ),
          // Emphasis/italic
          em: ({ children, ...props }) => (
            <em className="italic text-[#B3B3B3]" {...props}>
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
