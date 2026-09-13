import { getRetroList } from '@/lib/data';
import { RetroListClient } from './RetroListClient';

export const dynamic = 'force-dynamic';

export default async function RetroListPage() {
  const items = await getRetroList();
  return (
    <main>
      <div className="ngp-page-header">
        <h1>Retro Master List</h1>
        <p>Every game we&rsquo;ve covered on the show, with the episode it aired in.</p>
      </div>
      <div className="ngp-section">
        <RetroListClient items={items} />
      </div>
    </main>
  );
}
