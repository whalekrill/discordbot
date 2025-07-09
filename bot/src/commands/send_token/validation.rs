use super::api::{fetch_token_accounts, fetch_wallet_addresses};
use super::error::ValidationError;
use super::types::{TokenAccountsResponse, WalletResponse};
use crate::config::config;
use solana_sdk::signature::{Keypair, Signer};

pub fn address_validator(
    response: &WalletResponse,
    public_url: &str,
) -> Result<(String, String), ValidationError> {
    let sender_wallets = &response.sender;
    let recipient_wallets = &response.recipient;

    if sender_wallets.is_empty() {
        return Err(ValidationError::NoWalletsDelegated {
            url: public_url.to_string(),
        });
    }

    if sender_wallets.len() > 1 {
        return Err(ValidationError::MultipleWalletsDelegated {
            url: public_url.to_string(),
        });
    }

    if recipient_wallets.is_empty() {
        return Err(ValidationError::NoWalletsRegistered {
            url: public_url.to_string(),
        });
    }

    if recipient_wallets.len() > 1 {
        return Err(ValidationError::MultipleRecipientWallets {
            url: public_url.to_string(),
        });
    }

    let sender_wallet = &sender_wallets[0];
    let recipient_wallet = &recipient_wallets[0];

    if sender_wallet == recipient_wallet {
        return Err(ValidationError::SameWallet {
            url: public_url.to_string(),
        });
    }

    Ok((sender_wallet.clone(), recipient_wallet.clone()))
}

pub async fn validate_addresses(
    sender_id: &str,
    recipient_id: &str,
    keypair: &Keypair,
) -> Result<(String, String), ValidationError> {
    let data = fetch_wallet_addresses(sender_id, recipient_id, keypair).await?;
    address_validator(&data, &config().public_url)
}

pub fn check_delegation_status(
    token_accounts_response: &TokenAccountsResponse,
    pubkey: &str,
) -> bool {
    for account in &token_accounts_response.result.value {
        if let Some(delegate) = &account.account.data.parsed.info.delegate {
            if delegate == pubkey {
                if let Some(delegated_amount) = &account.account.data.parsed.info.delegated_amount {
                    if let Some(ui_amount) = delegated_amount.ui_amount {
                        if ui_amount > 0.0 {
                            return true;
                        }
                    }
                }
            }
        }
    }
    false
}

pub async fn validate_delegation(
    sender_wallet: &str,
    keypair: &Keypair,
) -> Result<bool, ValidationError> {
    let token_data = fetch_token_accounts(sender_wallet).await?;
    Ok(check_delegation_status(
        &token_data,
        &keypair.pubkey().to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_wallet_response(sender: Vec<String>, recipient: Vec<String>) -> WalletResponse {
        WalletResponse { sender, recipient }
    }

    #[test]
    fn test_validate_address_success() {
        let response = create_wallet_response(
            vec!["sender_wallet_123".to_string()],
            vec!["recipient_wallet_456".to_string()],
        );

        let result = address_validator(&response, "https://test.com");
        assert!(result.is_ok());

        let (sender, recipient) = result.unwrap();
        assert_eq!(sender, "sender_wallet_123");
        assert_eq!(recipient, "recipient_wallet_456");
    }

    #[test]
    fn test_validate_address_no_sender_wallets() {
        let response = create_wallet_response(vec![], vec!["recipient_wallet_456".to_string()]);

        let result = address_validator(&response, "https://test.com");
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            ValidationError::NoWalletsDelegated { .. } => {}
            _ => panic!("Expected NoWalletsDelegated error"),
        }
    }

    #[test]
    fn test_validate_address_multiple_sender_wallets() {
        let response = create_wallet_response(
            vec!["sender1".to_string(), "sender2".to_string()],
            vec!["recipient_wallet_456".to_string()],
        );

        let result = address_validator(&response, "https://test.com");
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            ValidationError::MultipleWalletsDelegated { .. } => {}
            _ => panic!("Expected MultipleWalletsDelegated error"),
        }
    }

    #[test]
    fn test_validate_address_no_recipient_wallets() {
        let response = create_wallet_response(vec!["sender_wallet_123".to_string()], vec![]);

        let result = address_validator(&response, "https://test.com");
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            ValidationError::NoWalletsRegistered { .. } => {}
            _ => panic!("Expected NoWalletsRegistered error"),
        }
    }

    #[test]
    fn test_validate_address_multiple_recipient_wallets() {
        let response = create_wallet_response(
            vec!["sender_wallet_123".to_string()],
            vec!["recipient1".to_string(), "recipient2".to_string()],
        );

        let result = address_validator(&response, "https://test.com");
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            ValidationError::MultipleRecipientWallets { .. } => {}
            _ => panic!("Expected MultipleRecipientWallets error"),
        }
    }

    #[test]
    fn test_validate_address_same_wallet() {
        let same_wallet = "same_wallet_address".to_string();
        let response = create_wallet_response(vec![same_wallet.clone()], vec![same_wallet]);

        let result = address_validator(&response, "https://test.com");
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            ValidationError::SameWallet { .. } => {}
            _ => panic!("Expected SameWallet error"),
        }
    }

    #[test]
    fn test_validate_address_all_empty() {
        let response = create_wallet_response(vec![], vec![]);

        let result = address_validator(&response, "https://test.com");
        assert!(result.is_err());

        let error = result.unwrap_err();
        match error {
            ValidationError::NoWalletsDelegated { .. } => {}
            _ => panic!("Expected NoWalletsDelegated error"),
        }
    }

    #[test]
    fn test_check_delegation_status_valid_delegation() {
        use crate::commands::send_token::types::*;

        let response = TokenAccountsResponse {
            result: TokenAccountsResult {
                value: vec![TokenAccountData {
                    account: TokenAccount {
                        data: TokenAccountDataParsed {
                            parsed: TokenAccountParsed {
                                info: TokenAccountInfo {
                                    delegate: Some("pubkey_123".to_string()),
                                    delegated_amount: Some(DelegatedAmount {
                                        ui_amount: Some(100.0),
                                    }),
                                },
                            },
                        },
                    },
                }],
            },
        };

        let result = check_delegation_status(&response, "pubkey_123");
        assert!(result);
    }

    #[test]
    fn test_check_delegation_status_no_delegation() {
        use crate::commands::send_token::types::*;

        let response = TokenAccountsResponse {
            result: TokenAccountsResult {
                value: vec![TokenAccountData {
                    account: TokenAccount {
                        data: TokenAccountDataParsed {
                            parsed: TokenAccountParsed {
                                info: TokenAccountInfo {
                                    delegate: None,
                                    delegated_amount: None,
                                },
                            },
                        },
                    },
                }],
            },
        };

        let result = check_delegation_status(&response, "pubkey_123");
        assert!(!result);
    }

    #[test]
    fn test_check_delegation_status_wrong_delegate() {
        use crate::commands::send_token::types::*;

        let response = TokenAccountsResponse {
            result: TokenAccountsResult {
                value: vec![TokenAccountData {
                    account: TokenAccount {
                        data: TokenAccountDataParsed {
                            parsed: TokenAccountParsed {
                                info: TokenAccountInfo {
                                    delegate: Some("different_pubkey".to_string()),
                                    delegated_amount: Some(DelegatedAmount {
                                        ui_amount: Some(100.0),
                                    }),
                                },
                            },
                        },
                    },
                }],
            },
        };

        let result = check_delegation_status(&response, "pubkey_123");
        assert!(!result);
    }

    #[test]
    fn test_check_delegation_status_zero_amount() {
        use crate::commands::send_token::types::*;

        let response = TokenAccountsResponse {
            result: TokenAccountsResult {
                value: vec![TokenAccountData {
                    account: TokenAccount {
                        data: TokenAccountDataParsed {
                            parsed: TokenAccountParsed {
                                info: TokenAccountInfo {
                                    delegate: Some("pubkey_123".to_string()),
                                    delegated_amount: Some(DelegatedAmount {
                                        ui_amount: Some(0.0),
                                    }),
                                },
                            },
                        },
                    },
                }],
            },
        };

        let result = check_delegation_status(&response, "pubkey_123");
        assert!(!result);
    }

    #[test]
    fn test_check_delegation_status_null_amount() {
        use crate::commands::send_token::types::*;

        let response = TokenAccountsResponse {
            result: TokenAccountsResult {
                value: vec![TokenAccountData {
                    account: TokenAccount {
                        data: TokenAccountDataParsed {
                            parsed: TokenAccountParsed {
                                info: TokenAccountInfo {
                                    delegate: Some("pubkey_123".to_string()),
                                    delegated_amount: Some(DelegatedAmount { ui_amount: None }),
                                },
                            },
                        },
                    },
                }],
            },
        };

        let result = check_delegation_status(&response, "pubkey_123");
        assert!(!result);
    }

    #[test]
    fn test_check_delegation_status_no_delegated_amount() {
        use crate::commands::send_token::types::*;

        let response = TokenAccountsResponse {
            result: TokenAccountsResult {
                value: vec![TokenAccountData {
                    account: TokenAccount {
                        data: TokenAccountDataParsed {
                            parsed: TokenAccountParsed {
                                info: TokenAccountInfo {
                                    delegate: Some("pubkey_123".to_string()),
                                    delegated_amount: None,
                                },
                            },
                        },
                    },
                }],
            },
        };

        let result = check_delegation_status(&response, "pubkey_123");
        assert!(!result);
    }

    #[test]
    fn test_check_delegation_status_multiple_accounts_one_valid() {
        use crate::commands::send_token::types::*;

        let response = TokenAccountsResponse {
            result: TokenAccountsResult {
                value: vec![
                    TokenAccountData {
                        account: TokenAccount {
                            data: TokenAccountDataParsed {
                                parsed: TokenAccountParsed {
                                    info: TokenAccountInfo {
                                        delegate: None,
                                        delegated_amount: None,
                                    },
                                },
                            },
                        },
                    },
                    TokenAccountData {
                        account: TokenAccount {
                            data: TokenAccountDataParsed {
                                parsed: TokenAccountParsed {
                                    info: TokenAccountInfo {
                                        delegate: Some("pubkey_123".to_string()),
                                        delegated_amount: Some(DelegatedAmount {
                                            ui_amount: Some(50.0),
                                        }),
                                    },
                                },
                            },
                        },
                    },
                ],
            },
        };

        let result = check_delegation_status(&response, "pubkey_123");
        assert!(result);
    }

    #[test]
    fn test_check_delegation_status_empty_accounts() {
        use crate::commands::send_token::types::*;

        let response = TokenAccountsResponse {
            result: TokenAccountsResult { value: vec![] },
        };

        let result = check_delegation_status(&response, "pubkey_123");
        assert!(!result);
    }
}
