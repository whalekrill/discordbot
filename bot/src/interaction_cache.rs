use redb::{Database, ReadableTable, TableDefinition};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

const TOKENS_TABLE: TableDefinition<&str, u64> = TableDefinition::new("tokens");

pub type InteractionCache = Arc<Database>;

pub fn create_interaction_cache() -> Result<InteractionCache, redb::DatabaseError> {
    Ok(Arc::new(Database::create("discordbot.redb")?))
}

pub fn has_been_processed(cache: &InteractionCache, token: &str) -> bool {
    let read_tx = match cache.begin_read() {
        Ok(txn) => txn,
        Err(_) => return false,
    };

    let table = match read_tx.open_table(TOKENS_TABLE) {
        Ok(table) => table,
        Err(_) => return false,
    };

    table.get(token).is_ok_and(|entry| entry.is_some())
}

pub fn mark_as_processed(cache: &InteractionCache, token: &str) {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    if let Ok(write_tx) = cache.begin_write() {
        if let Ok(mut table) = write_tx.open_table(TOKENS_TABLE) {
            let _ = table.insert(token, now);
        };
        let _ = write_tx.commit();
    }
}

pub fn cleanup_old_tokens(cache: &InteractionCache) {
    let cutoff = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        - (24 * 60 * 60);

    if let Ok(write_tx) = cache.begin_write() {
        let mut keys_to_remove = Vec::new();

        if let Ok(table) = write_tx.open_table(TOKENS_TABLE) {
            if let Ok(iter) = table.iter() {
                for item in iter.flatten() {
                    let (key, timestamp) = item;
                    if timestamp.value() < cutoff {
                        keys_to_remove.push(key.value().to_string());
                    }
                }
            }
        };

        if let Ok(mut table) = write_tx.open_table(TOKENS_TABLE) {
            for key in keys_to_remove {
                let _ = table.remove(key.as_str());
            }
        };

        let _ = write_tx.commit();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    fn create_test_cache(test_name: &str) -> InteractionCache {
        let db_path = format!("test_{}.redb", test_name);
        if Path::new(&db_path).exists() {
            let _ = fs::remove_file(&db_path);
        }
        Arc::new(Database::create(&db_path).expect("Failed to create test database"))
    }

    fn cleanup_test_cache(test_name: &str) {
        let db_path = format!("test_{}.redb", test_name);
        if Path::new(&db_path).exists() {
            let _ = fs::remove_file(&db_path);
        }
    }

    #[test]
    fn test_mark_and_check_processed() {
        let cache = create_test_cache("mark_and_check");
        let token = "test_token_123";

        assert!(!has_been_processed(&cache, token));

        mark_as_processed(&cache, token);

        assert!(has_been_processed(&cache, token));

        cleanup_test_cache("mark_and_check");
    }

    #[test]
    fn test_different_tokens() {
        let cache = create_test_cache("different_tokens");
        let token1 = "token_one";
        let token2 = "token_two";

        mark_as_processed(&cache, token1);

        assert!(has_been_processed(&cache, token1));
        assert!(!has_been_processed(&cache, token2));

        mark_as_processed(&cache, token2);

        assert!(has_been_processed(&cache, token1));
        assert!(has_been_processed(&cache, token2));

        cleanup_test_cache("different_tokens");
    }

    #[test]
    fn test_empty_cache() {
        let cache = create_test_cache("empty_cache");

        assert!(!has_been_processed(&cache, "nonexistent_token"));

        cleanup_test_cache("empty_cache");
    }

    #[test]
    fn test_duplicate_marking() {
        let cache = create_test_cache("duplicate_marking");
        let token = "duplicate_token";

        mark_as_processed(&cache, token);
        assert!(has_been_processed(&cache, token));

        mark_as_processed(&cache, token);
        assert!(has_been_processed(&cache, token));

        cleanup_test_cache("duplicate_marking");
    }

    #[test]
    fn test_cleanup_old_tokens() {
        let cache = create_test_cache("cleanup_old");
        let recent_token = "recent_token";
        let old_token = "old_token";

        mark_as_processed(&cache, recent_token);

        if let Ok(write_tx) = cache.begin_write() {
            if let Ok(mut table) = write_tx.open_table(TOKENS_TABLE) {
                let old_timestamp = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs()
                    - (25 * 60 * 60);
                let _ = table.insert(old_token, old_timestamp);
            };
            let _ = write_tx.commit();
        }

        assert!(has_been_processed(&cache, recent_token));
        assert!(has_been_processed(&cache, old_token));

        cleanup_old_tokens(&cache);

        assert!(has_been_processed(&cache, recent_token));
        assert!(!has_been_processed(&cache, old_token));

        cleanup_test_cache("cleanup_old");
    }

    #[test]
    fn test_unicode_tokens() {
        let cache = create_test_cache("unicode_tokens");
        let unicode_token = "🚀_token_試験_🎯";

        assert!(!has_been_processed(&cache, unicode_token));

        mark_as_processed(&cache, unicode_token);

        assert!(has_been_processed(&cache, unicode_token));

        cleanup_test_cache("unicode_tokens");
    }

    #[test]
    fn test_very_long_token() {
        let cache = create_test_cache("long_token");
        let long_token = "a".repeat(1000);

        mark_as_processed(&cache, &long_token);

        assert!(has_been_processed(&cache, &long_token));

        cleanup_test_cache("long_token");
    }
}
