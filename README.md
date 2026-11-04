# Go-go Garden

Go-go music streaming app. Next.js 15 (App Router) + React 19 + TypeScript 5,
Tailwind CSS 4, zustand 5, MongoDB (official driver), Firebase Auth.

## Setup

```sh
nvm use            # Node 22 (.nvmrc); Next 15 needs >= 18.18, ESLint config needs >= 20.11
yarn install
cp .env.example .env.local   # fill in MONGODB_URI and NEXT_PUBLIC_FIREBASE_API_KEY
yarn dev           # http://localhost:3002
```

| Task | Command |
| --- | --- |
| Dev server | `yarn dev` (port 3002) |
| Production build | `yarn build` then `yarn start` |
| Lint | `yarn lint` |
| Typecheck | `yarn typecheck` |

## Layout

- `src/app/page.tsx` — Server Component; reads artists (`bands`) and songs (`music`) from Mongo.
- `src/app/actions.ts` — Server Actions: `streamUp`, `recordLogin`, `recordSignup` (were GraphQL mutations).
- `src/lib/db.ts` — cached `MongoClient` (`MONGODB_URI`, db `music`).
- `src/lib/firebase.ts` — Firebase Auth (modular SDK, `NEXT_PUBLIC_FIREBASE_*`).
- `src/components/AppData.tsx` — context carrying the server-fetched library data.
- `src/stores/` — zustand stores for UI, navigation, login form and player state.
- `src/components/` — library (artists → albums → songs), navigation/search, player, login, signup.
