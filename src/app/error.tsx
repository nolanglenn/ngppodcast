'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error('[error-boundary]', error);
  return (
    <main>
      <h1>Something went wrong</h1>
      <p>We couldn&apos;t load this page. Please try again in a moment.</p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
