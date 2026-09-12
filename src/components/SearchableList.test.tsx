import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchableList } from './SearchableList';

interface Item {
  id: string;
  name: string;
}

const items: Item[] = [
  { id: '1', name: 'Chrono Trigger' },
  { id: '2', name: 'Super Metroid' },
];

describe('SearchableList', () => {
  it('renders all items with no query', () => {
    render(
      <SearchableList
        items={items}
        searchKeys={['name']}
        placeholder="Search..."
        getKey={(i) => i.id}
        renderItem={(i) => i.name}
      />
    );
    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument();
    expect(screen.getByText('Super Metroid')).toBeInTheDocument();
  });

  it('filters items as the user types', () => {
    render(
      <SearchableList
        items={items}
        searchKeys={['name']}
        placeholder="Search..."
        getKey={(i) => i.id}
        renderItem={(i) => i.name}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'Chrono' } });
    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument();
    expect(screen.queryByText('Super Metroid')).not.toBeInTheDocument();
  });
});
