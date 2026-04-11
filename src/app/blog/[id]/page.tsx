import BlogPostPage from "./client";
export function generateStaticParams() { return [{ id: '_' }]; }
export default function Page() { return <BlogPostPage />; }
