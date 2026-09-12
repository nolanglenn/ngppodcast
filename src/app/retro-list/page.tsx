import { getRetroList } from '@/lib/data';
import { RetroListClient } from './RetroListClient';

export const dynamic = 'force-dynamic';

export default async function RetroListPage() {
  const items = await getRetroList();
  return (
    <main>
      <h1>Retro Master List</h1>
      <RetroListClient items={items} />
    </main>
  );
}
