export default function HeroImage({ url, alt }: { url: string; alt?: string }) {
  if (!url) return null;
  return (
    <div className="max-w-md mx-auto px-2 mb-4">
      <img
        src={url}
        alt={alt || ''}
        className="w-full aspect-video object-cover rounded-lg"
        style={{ background: 'transparent', border: 'none' }}
      />
    </div>
  );
}
