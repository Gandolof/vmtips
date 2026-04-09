# VM Tips

Next.js app for World Cup predictions, using SQLite via `better-sqlite3`.

## Local development

```bash
npm install
npm run dev
```

The app stores its SQLite database in:

- `DB_PATH`, if set
- otherwise `DB_DIR/worldcup.db`, if `DB_DIR` is set
- otherwise `RAILWAY_VOLUME_MOUNT_PATH/worldcup.db`, if Railway provides that
- otherwise `./data/worldcup.db`

## Railway deployment

This app is prepared for Railway with:

- Next.js standalone output
- a persistent SQLite path that can live on a Railway volume

Recommended volume mount path:

- `/app/data`

If Railway mounts a volume there, the app will automatically use:

- `/app/data/worldcup.db`
