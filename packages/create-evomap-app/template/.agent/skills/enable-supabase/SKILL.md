---
id: enable-supabase
title: Wire a feature to Supabase
description: Connect a feature to the optional Supabase client for auth / DB / storage, including environment, services, and queries.
keywords: [supabase, backend, auth, database, storage]
applies_to: ["src/shared/supabase/**", "src/features/**/services/**"]
---

# Skill: enable Supabase in a feature

Use when the user wants auth, database, or storage from Supabase. This skill assumes the Supabase feature is enabled in the template (a `src/shared/supabase/` directory exists). If it does not exist, the project was scaffolded with `--no-supabase` and the dependency must be added back first.

## Background

Supabase is the **only** built-in backend in this template, and it is optional. Its scaffolding is wrapped with `@evomap:feature(supabase)` comment markers so `create-evomap-app` can strip it cleanly when not requested.

## Step list

1. **Verify the Supabase scaffold exists.**

   - `src/shared/supabase/client.ts` must export a `supabase` client.
   - `.env.example` must contain `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` keys.

   If they don't exist, the template was scaffolded without Supabase. Re-install the dependency:

   ```bash
   pnpm --filter @evomap/template-react add @supabase/supabase-js
   ```

   and recreate `src/shared/supabase/client.ts` from this template:

   ```ts
   // @evomap:feature(supabase) file
   import { createClient } from '@supabase/supabase-js';
   const url = import.meta.env.VITE_SUPABASE_URL;
   const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
   export const supabase = createClient(url ?? '', anonKey ?? '', {
     auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
   });
   ```

2. **Configure environment.** Copy `.env.example` to `.env` and fill in:

   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

   Anon keys are public by design; service keys are NEVER committed.

3. **Create a service module** inside the consuming feature:

   ```
   src/features/<feature>/services/<feature>Api.ts
   ```

   ```ts
   import { supabase } from '@/shared/supabase';

   export async function fetch<Thing>s() {
     const { data, error } = await supabase
       .from('<table>')
       .select('*')
       .order('created_at', { ascending: false });
     if (error) throw error;
     return data ?? [];
   }
   ```

4. **Wrap calls in TanStack Query** (if the `@evomap:feature(query)` block is enabled):

   ```ts
   // src/features/<feature>/hooks/use<Thing>Query.ts
   import { useQuery } from '@tanstack/react-query';
   import { fetch<Thing>s } from '../services/<feature>Api';

   export function use<Thing>Query() {
     return useQuery({
       queryKey: ['<feature>', '<thing>s'],
       queryFn: fetch<Thing>s,
     });
   }
   ```

   If TanStack Query was disabled, call the service directly from a `useEffect` + `useState` pair in the page, or add the query feature back.

5. **For auth flows**, add a `useSession` hook in `src/shared/supabase/` (it's cross-feature):

   ```ts
   // @evomap:feature(supabase) file
   import { useEffect, useState } from 'react';
   import type { Session } from '@supabase/supabase-js';
   import { supabase } from './client';

   export function useSession() {
     const [session, setSession] = useState<Session | null>(null);
     useEffect(() => {
       void supabase.auth.getSession().then(({ data }) => setSession(data.session));
       const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
       return () => sub.subscription.unsubscribe();
     }, []);
     return session;
   }
   ```

6. **Test with a mocked client.** Never hit the real Supabase in tests:

   ```ts
   vi.mock('@/shared/supabase', () => ({
     supabase: {
       from: vi.fn().mockReturnValue({
         select: vi.fn().mockReturnValue({
           order: vi.fn().mockResolvedValue({ data: [/* ... */], error: null }),
         }),
       }),
     },
   }));
   ```

7. **Row-level security** must be enabled on every table the client touches. The anon key is public; without RLS your database is open. Configure policies in the Supabase dashboard or SQL migrations.

## Completion checklist

- [ ] `.env` contains valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] All Supabase calls live in `services/` or `shared/supabase/`, never in components.
- [ ] Every consumer wraps in TanStack Query (preferred) or handles loading/error manually.
- [ ] Mocked in tests; no real network calls.
- [ ] RLS policies exist for every accessed table.
- [ ] No service-role key in the frontend bundle (only anon).

## Don't

- Don't import `supabase` directly in a component. Go through a service / hook.
- Don't expose the service-role key in `VITE_*` env vars — they are bundled into the client.
- Don't store the entire session object in a Zustand store; rely on Supabase's own session management plus `useSession`.
