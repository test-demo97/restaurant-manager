import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MIGRATIONS, type Migration } from '../migrations';

interface MigrationResult {
  success: boolean;
  appliedMigrations: string[];
  error?: string;
}

export function useMigrations() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<MigrationResult | null>(null);

  /**
   * Verifica se la tabella db_migrations esiste
   */
  const checkMigrationsTableExists = async (): Promise<boolean> => {
    try {
      if (!supabase) return false;

      const { error } = await supabase
        .from('db_migrations')
        .select('version')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  };

  /**
   * Ottiene le migrazioni già eseguite
   */
  const getAppliedMigrations = async (): Promise<string[]> => {
    try {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('db_migrations')
        .select('version')
        .order('version', { ascending: true });

      if (error) {
        console.error('[Migration] Errore lettura migrazioni:', error);
        return [];
      }

      return data?.map(m => m.version) || [];
    } catch {
      return [];
    }
  };

  /**
   * Esegue una singola migrazione usando la funzione RPC
   */
  const executeMigration = async (migration: Migration): Promise<boolean> => {
    try {
      if (!supabase) return false;

      console.log(`[Migration] Esecuzione ${migration.version}: ${migration.name}`);

      // Esegui lo SQL della migrazione usando la funzione RPC
      const { error: sqlError } = await supabase.rpc('run_migration', {
        migration_sql: migration.sql,
        migration_version: migration.version,
        migration_name: migration.name
      });

      if (sqlError) {
        console.error(`[Migration] Errore ${migration.version}:`, sqlError);
        return false;
      }

      console.log(`[Migration] Completata ${migration.version}: ${migration.name}`);
      return true;
    } catch (err) {
      console.error(`[Migration] Errore ${migration.version}:`, err);
      return false;
    }
  };

  /**
   * Esegue tutte le migrazioni pendenti
   */
  const runMigrations = useCallback(async (): Promise<MigrationResult> => {
    setIsRunning(true);
    const appliedMigrations: string[] = [];

    try {
      // Verifica se la tabella esiste
      const tableExists = await checkMigrationsTableExists();

      if (!tableExists) {
        // Se la tabella non esiste, è un DB vecchio senza supporto migrazioni
        // L'utente dovrà aggiornare manualmente eseguendo lo script SQL
        console.log('[Migration] Tabella db_migrations non trovata - skip');
        const result: MigrationResult = {
          success: true,
          appliedMigrations: []
        };
        setLastResult(result);
        return result;
      }

      // Ottieni migrazioni già eseguite
      const alreadyApplied = await getAppliedMigrations();
      console.log('[Migration] Migrazioni già applicate:', alreadyApplied);

      // Filtra migrazioni da eseguire
      const pendingMigrations = MIGRATIONS.filter(
        m => !alreadyApplied.includes(m.version)
      ).sort((a, b) => a.version.localeCompare(b.version));

      if (pendingMigrations.length === 0) {
        console.log('[Migration] Nessuna migrazione pendente');
        const result: MigrationResult = {
          success: true,
          appliedMigrations: []
        };
        setLastResult(result);
        return result;
      }

      console.log(`[Migration] ${pendingMigrations.length} migrazioni da eseguire`);

      // Esegui ogni migrazione in ordine
      for (const migration of pendingMigrations) {
        const success = await executeMigration(migration);

        if (!success) {
          const result: MigrationResult = {
            success: false,
            appliedMigrations,
            error: `Errore migrazione ${migration.version}: ${migration.name}`
          };
          setLastResult(result);
          return result;
        }

        appliedMigrations.push(migration.version);
      }

      const result: MigrationResult = {
        success: true,
        appliedMigrations
      };
      setLastResult(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      const result: MigrationResult = {
        success: false,
        appliedMigrations,
        error: errorMessage
      };
      setLastResult(result);
      return result;
    } finally {
      setIsRunning(false);
    }
  }, []);

  /**
   * Verifica se ci sono migrazioni pendenti senza eseguirle
   */
  const checkPendingMigrations = useCallback(async (): Promise<Migration[]> => {
    try {
      const tableExists = await checkMigrationsTableExists();
      if (!tableExists) return [];

      const alreadyApplied = await getAppliedMigrations();
      return MIGRATIONS.filter(m => !alreadyApplied.includes(m.version));
    } catch {
      return [];
    }
  }, []);

  return {
    runMigrations,
    checkPendingMigrations,
    isRunning,
    lastResult
  };
}
