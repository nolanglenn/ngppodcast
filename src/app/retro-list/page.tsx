import { getRetroList } from '@/lib/data';
import { RetroListClient } from './RetroListClient';

export const dynamic = 'force-dynamic';

export default async function RetroListPage() {
  const items = await getRetroList();
  return (
    <main>
      <div className="ngp-page-header">
        <h1>Retro Master List</h1>
        <p>Every game our listeners have submitted. We pick one at random each week — see this week&rsquo;s pick on the home page.</p>
      </div>
      <div className="ngp-section">
        <RetroListClient items={items} />
      </div>
    </main>
  );
}
