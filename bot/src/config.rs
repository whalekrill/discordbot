use crate::error::ConfigError;
use dotenv::dotenv;
use std::env;
use std::sync::OnceLock;

#[derive(Debug)]
pub struct Config {
    pub public_url: String,
    pub api_key: String,
    pub helius_api_url: String,
    pub delegate_mint_address: String,
    pub default_send_token_message: String,
}

static CONFIG: OnceLock<Config> = OnceLock::new();

fn load_config() -> Result<Config, ConfigError> {
    dotenv().ok();

    Ok(Config {
        public_url: env::var("PUBLIC_URL").map_err(|_| ConfigError::MissingEnvVar {
            var: "PUBLIC_URL".to_string(),
        })?,
        api_key: env::var("API_KEY").map_err(|_| ConfigError::MissingEnvVar {
            var: "API_KEY".to_string(),
        })?,
        helius_api_url: env::var("HELIUS_API_URL").map_err(|_| ConfigError::MissingEnvVar {
            var: "HELIUS_API_URL".to_string(),
        })?,
        delegate_mint_address: env::var("DELEGATE_MINT_ADDRESS").map_err(|_| {
            ConfigError::MissingEnvVar {
                var: "DELEGATE_MINT_ADDRESS".to_string(),
            }
        })?,
        default_send_token_message: env::var("DEFAULT_SEND_TOKEN_MESSAGE").map_err(|_| {
            ConfigError::MissingEnvVar {
                var: "DEFAULT_SEND_TOKEN_MESSAGE".to_string(),
            }
        })?,
    })
}

pub fn init_config() -> Result<(), ConfigError> {
    let config = load_config()?;
    CONFIG.set(config).map_err(|_| ConfigError::MissingEnvVar {
        var: "Config already initialized".to_string(),
    })?;
    Ok(())
}

pub fn config() -> &'static Config {
    CONFIG
        .get()
        .expect("Config not initialized. Call init_config() first.")
}
