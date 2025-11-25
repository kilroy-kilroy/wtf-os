'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-slate max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Style headings
          h1: ({ children, ...props }) => (
            <h1 className="text-3xl font-bold mt-8 mb-4 text-slate-900" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-2xl font-bold mt-6 mb-3 text-slate-800" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-xl font-semibold mt-4 mb-2 text-slate-700" {...props}>
              {children}
            </h3>
          ),
          // Style paragraphs
          p: ({ children, ...props }) => (
            <p className="mb-4 text-slate-700 leading-relaxed" {...props}>
              {children}
            </p>
          ),
          // Style lists
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside mb-4 space-y-2" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-slate-700" {...props}>
              {children}
            </li>
          ),
          // Style blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-500 pl-4 my-4 italic text-slate-600 bg-blue-50 py-2"
              {...props}
            >
              {children}
            </blockquote>
          ),
          // Style code
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              <code
                className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="block bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto font-mono text-sm"
                {...props}
              >
                {children}
              </code>
            ),
          // Style tables
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-slate-200 border" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-slate-50" {...props}>
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }) => (
            <tbody className="bg-white divide-y divide-slate-200" {...props}>
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr {...props}>{children}</tr>
          ),
          th: ({ children, ...props }) => (
            <th
              className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700" {...props}>
              {children}
            </td>
          ),
          // Style horizontal rules
          hr: ({ ...props }) => <hr className="my-8 border-slate-200" {...props} />,
          // Style links
          a: ({ children, ...props }) => (
            <a
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          // Style strong/bold
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-slate-900" {...props}>
              {children}
            </strong>
          ),
          // Style emphasis/italic
          em: ({ children, ...props }) => (
            <em className="italic text-slate-700" {...props}>
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
