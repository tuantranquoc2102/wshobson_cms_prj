'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';

export function PostBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-zinc max-w-none dark:prose-invert prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-img:rounded-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
