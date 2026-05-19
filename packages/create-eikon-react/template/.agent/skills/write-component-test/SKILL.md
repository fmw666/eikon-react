---
id: write-component-test
title: Write a component / hook / store test
description: Standard recipe for Vitest + Testing Library tests, including async patterns and how to mock service layers.
keywords: [test, vitest, testing-library, component, hook, store]
applies_to: ["src/**/__tests__/**", "__tests__/**"]
---

# Skill: write a test

Use whenever new code is added or a bug is fixed. Re-read [rules/30-testing.md](../../rules/30-testing.md) first.

## Decide what kind of test you need

| Code under test                | Test type                                                              |
| ------------------------------ | ---------------------------------------------------------------------- |
| Pure function / store / helper | Unit test (no DOM rendering)                                           |
| React component                | Render test with Testing Library                                       |
| React hook with logic          | `renderHook` test                                                      |
| Service / API call             | Unit test with a fetch / supabase / TanStack-Query mock at the boundary |
| Multiple components wired      | Integration test under the feature `__tests__/`                        |

## File location

- Feature code → `src/features/<name>/__tests__/<mirrored path>.test.ts(x)`
- Shared code → `src/shared/<area>/__tests__/<name>.test.ts(x)`
- Cross-cutting → top-level `__tests__/`

## Recipes

### Pure function / store

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useCounterStore } from '../../stores/counterStore';

describe('counterStore', () => {
  beforeEach(() => {
    useCounterStore.getState().reset();
  });

  it('increments', () => {
    useCounterStore.getState().increment();
    expect(useCounterStore.getState().value).toBe(1);
  });
});
```

### Component render

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Button } from '@/shared/ui/button';

describe('<Button />', () => {
  it('fires onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Hi</Button>);
    await user.click(screen.getByRole('button', { name: /hi/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

### Hook with logic

```tsx
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useMyHook } from '../../hooks/useMyHook';

describe('useMyHook', () => {
  it('toggles', () => {
    const { result } = renderHook(() => useMyHook());
    act(() => result.current.toggle());
    expect(result.current.isOn).toBe(true);
  });
});
```

### Mocking a service

```ts
import { vi } from 'vitest';

vi.mock('@/features/users/services/usersApi', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: '1', name: 'Ada' }),
}));
```

Prefer mocking at the **service module boundary** rather than mocking `fetch` globally; this keeps tests stable when the implementation switches transports.

### Async assertions

```ts
expect(await screen.findByText(/loaded/i)).toBeInTheDocument();
// or
await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
```

Never use `setTimeout` in tests.

## Completion checklist

- [ ] Test file mirrors the source path under `__tests__/`.
- [ ] Uses `getByRole` / `getByLabelText` / `getByText` over `getByTestId`.
- [ ] Uses `userEvent` (not `fireEvent`) for any non-trivial interaction.
- [ ] Mocks at the service boundary, not at `fetch`.
- [ ] No snapshot assertions (unless explicitly motivated).
- [ ] Test resets shared state in `beforeEach` if it touches a store.
- [ ] `pnpm test` passes locally.

## Don't

- Don't assert on internal state, lifecycle ordering, or class strings.
- Don't share state across tests through module-level variables.
- Don't `await` arbitrary `setTimeout` to wait for async — use `findBy*` / `waitFor`.
