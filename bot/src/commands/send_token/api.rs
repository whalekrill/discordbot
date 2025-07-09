use super::error::ApiError;
use super::types::{GetAssetResponse, TokenAccountsResponse, TokenAccountsResult, WalletResponse};
use crate::config::config;
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_request::TokenAccountsFilter;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::{Keypair, Signer};
use std::str::FromStr;

#[derive(Debug, Clone)]
pub struct TokenMetadata {
    pub name: String,
    pub decimals: u8,
}

pub async fn fetch_wallet_addresses(
    sender_id: &str,
    recipient_id: &str,
    keypair: &Keypair,
) -> Result<WalletResponse, ApiError> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("Failed to get timestamp")
        .as_millis() as i64;

    let message = format!(
        "sendToken from {} to {} at {}",
        sender_id
            .parse::<u64>()
            .map_err(|_| ApiError::InvalidDiscordId {
                id: sender_id.to_string()
            })?,
        recipient_id
            .parse::<u64>()
            .map_err(|_| ApiError::InvalidDiscordId {
                id: recipient_id.to_string()
            })?,
        timestamp
    );

    let message_bytes = message.as_bytes();
    let signature = keypair.sign_message(message_bytes);
    let signature_vec: Vec<u8> = signature.as_ref().to_vec();

    let request_body = serde_json::json!({
        "senderDiscordId": sender_id,
        "recipientDiscordId": recipient_id,
        "message": message,
        "signature": signature_vec
    });

    let client = reqwest::Client::new();
    let response = client
        .post(&format!("{}/sendToken", config().public_url))
        .header("api-key", &config().api_key)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| ApiError::RequestFailed {
            message: e.to_string(),
        })?;

    if !response.status().is_success() {
        return Err(ApiError::ErrorStatus {
            status: response.status().as_u16(),
        });
    }

    response
        .json::<WalletResponse>()
        .await
        .map_err(|e| ApiError::ParseFailed {
            message: e.to_string(),
        })
}

pub async fn fetch_token_accounts(wallet_address: &str) -> Result<TokenAccountsResponse, ApiError> {
    let rpc_client = RpcClient::new(&config().helius_api_url);

    let wallet_pubkey = Pubkey::from_str(wallet_address).map_err(|e| ApiError::ParseFailed {
        message: format!("Invalid wallet address: {}", e),
    })?;
    let mint_pubkey =
        Pubkey::from_str(&config().delegate_mint_address).map_err(|e| ApiError::ParseFailed {
            message: format!("Invalid mint address: {}", e),
        })?;

    let token_accounts = rpc_client
        .get_token_accounts_by_owner(&wallet_pubkey, TokenAccountsFilter::Mint(mint_pubkey))
        .map_err(|e| ApiError::RequestFailed {
            message: format!("Failed to fetch token accounts: {}", e),
        })?;

    let json_value = serde_json::to_value(&token_accounts).map_err(|e| ApiError::ParseFailed {
        message: format!("Failed to serialize token accounts: {}", e),
    })?;

    let response = TokenAccountsResponse {
        result: TokenAccountsResult {
            value: serde_json::from_value(json_value).map_err(|e| ApiError::ParseFailed {
                message: format!("Failed to parse token accounts: {}", e),
            })?,
        },
    };

    Ok(response)
}

pub async fn fetch_token_metadata() -> Option<TokenMetadata> {
    let client = reqwest::Client::new();
    let response = client
        .post(&config().helius_api_url)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "jsonrpc": "2.0",
            "id": "token-metadata",
            "method": "getAsset",
            "params": {
                "id": &config().delegate_mint_address,
            },
        }))
        .send()
        .await
        .ok()?;

    let data: GetAssetResponse = response.json().await.ok()?;

    let name = data
        .result
        .content
        .metadata
        .name
        .or(data.result.content.metadata.symbol)
        .unwrap_or_else(|| config().delegate_mint_address.clone());

    let decimals = data.result.token_info.decimals.map(|d| d as u8)?;

    Some(TokenMetadata { name, decimals })
}
