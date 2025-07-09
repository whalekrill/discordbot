use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApplicationError {
    #[error("Configuration error: {0}")]
    Config(#[from] ConfigError),

    #[error("Solana RPC error: {0}")]
    Rpc(#[from] solana_client::client_error::ClientError),

    #[error("Solana SDK error: {0}")]
    Sdk(#[from] solana_sdk::signature::SignerError),

    #[error("HTTP request error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("JSON parsing error: {0}")]
    Json(#[from] serde_json::Error),
}

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Missing environment variable: {var}")]
    MissingEnvVar { var: String },
}
