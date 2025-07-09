use thiserror::Error;

impl From<ApiError> for ValidationError {
    fn from(error: ApiError) -> Self {
        ValidationError::ApiError {
            message: error.to_string(),
        }
    }
}

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("API request failed: {message}")]
    RequestFailed { message: String },

    #[error("API returned error status: {status}")]
    ErrorStatus { status: u16 },

    #[error("Failed to parse API response: {message}")]
    ParseFailed { message: String },

    #[error("Invalid Discord ID: {id}")]
    InvalidDiscordId { id: String },
}

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("No wallets delegated. Please register and delegate a wallet at {url}")]
    NoWalletsDelegated { url: String },

    #[error("More than 1 wallet delegated. Please manage your wallets at {url}")]
    MultipleWalletsDelegated { url: String },

    #[error("No wallets registered. Please register a wallet at {url}")]
    NoWalletsRegistered { url: String },

    #[error("More than 1 wallet can receive tokens. Please manage your wallets at {url}")]
    MultipleRecipientWallets { url: String },

    #[error("Sender and recipient wallets are the same. Please manage your wallets at {url}")]
    SameWallet { url: String },

    #[error("Missing recipient parameter")]
    MissingRecipient,

    #[error("Missing amount parameter")]
    MissingAmount,

    #[error("API error: {message}")]
    ApiError { message: String },
}

#[derive(Error, Debug)]
pub enum TransactionError {
    #[error(
        "Insufficient funds. Please ensure your wallet has sufficient funds, and update your delegation at {url}"
    )]
    InsufficientFunds { url: String },

    #[error("Invalid sender address: {message}")]
    InvalidSender { message: String },

    #[error("Invalid recipient address: {message}")]
    InvalidRecipient { message: String },

    #[error("Invalid mint address: {message}")]
    InvalidMint { message: String },

    #[error("Failed to create transaction: {message}")]
    CreationFailed { message: String },

    #[error("Failed to get recent blockhash: {message}")]
    BlockhashFailed { message: String },

    #[error("Transaction failed: {message}")]
    TransactionFailed { message: String },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_error_display() {
        let error = ValidationError::NoWalletsDelegated {
            url: "https://example.com".to_string(),
        };
        assert_eq!(
            error.to_string(),
            "No wallets delegated. Please register and delegate a wallet at https://example.com"
        );

        let error = ValidationError::MissingRecipient;
        assert_eq!(error.to_string(), "Missing recipient parameter");

        let error = ValidationError::SameWallet {
            url: "https://test.com".to_string(),
        };
        assert_eq!(
            error.to_string(),
            "Sender and recipient wallets are the same. Please manage your wallets at https://test.com"
        );
    }

    #[test]
    fn test_api_error_display() {
        let error = ApiError::RequestFailed {
            message: "Network timeout".to_string(),
        };
        assert_eq!(error.to_string(), "API request failed: Network timeout");

        let error = ApiError::ErrorStatus { status: 404 };
        assert_eq!(error.to_string(), "API returned error status: 404");

        let error = ApiError::InvalidDiscordId {
            id: "invalid_id".to_string(),
        };
        assert_eq!(error.to_string(), "Invalid Discord ID: invalid_id");
    }

    #[test]
    fn test_transaction_error_display() {
        let error = TransactionError::InsufficientFunds {
            url: "https://wallet.com".to_string(),
        };
        assert_eq!(
            error.to_string(),
            "Insufficient funds. Please ensure your wallet has sufficient funds, and update your delegation at https://wallet.com"
        );

        let error = TransactionError::CreationFailed {
            message: "Invalid parameters".to_string(),
        };
        assert_eq!(
            error.to_string(),
            "Failed to create transaction: Invalid parameters"
        );
    }

    #[test]
    fn test_api_error_to_validation_error_conversion() {
        let api_error = ApiError::RequestFailed {
            message: "Connection refused".to_string(),
        };
        let validation_error: ValidationError = api_error.into();

        match validation_error {
            ValidationError::ApiError { message } => {
                assert!(message.contains("Connection refused"));
            }
            _ => panic!("Expected ApiError variant"),
        }
    }

    #[test]
    fn test_error_variants() {
        let errors = vec![
            ValidationError::NoWalletsDelegated {
                url: "test".to_string(),
            },
            ValidationError::MultipleWalletsDelegated {
                url: "test".to_string(),
            },
            ValidationError::NoWalletsRegistered {
                url: "test".to_string(),
            },
            ValidationError::MultipleRecipientWallets {
                url: "test".to_string(),
            },
            ValidationError::SameWallet {
                url: "test".to_string(),
            },
            ValidationError::MissingRecipient,
            ValidationError::MissingAmount,
            ValidationError::ApiError {
                message: "test".to_string(),
            },
        ];

        for error in errors {
            assert!(!error.to_string().is_empty());
        }
    }

    #[test]
    fn test_api_error_variants() {
        let errors = vec![
            ApiError::RequestFailed {
                message: "test".to_string(),
            },
            ApiError::ErrorStatus { status: 500 },
            ApiError::ParseFailed {
                message: "test".to_string(),
            },
            ApiError::InvalidDiscordId {
                id: "test".to_string(),
            },
        ];

        for error in errors {
            assert!(!error.to_string().is_empty());
        }
    }
}
