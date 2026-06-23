/// <reference path="../pb_data/types.d.ts" />

// A sincronização de listRule/viewRule é feita via POST /api/screens/sync-rules
// (sync_rules.pb.js). Hooks onRecord* compartilham a transação do registro e
// causam rollback quando $app.save(col) falha dentro dela.
