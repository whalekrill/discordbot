use super::api::TokenMetadata;
use super::error::{TransactionError, ValidationError};
use super::transaction::send_token_transaction;
use super::types::{MessageType, SendTokenResult};
use super::validation::{validate_addresses, validate_delegation};
use crate::config::config;
use serenity::builder::CreateCommand;
use serenity::model::application::{ResolvedOption, ResolvedValue};
use serenity::model::id::UserId;
use solana_sdk::signature::Keypair;
use std::sync::Arc;

fn extract_command_params(
    options: &[ResolvedOption<'_>],
    user_id: &UserId,
) -> Result<(String, String, u64), SendTokenResult> {
    let mut recipient_id: Option<&UserId> = None;
    let mut amount: Option<u64> = None;

    for option in options {
        match option.name {
            "recipient" => {
                if let ResolvedValue::User(user, _) = &option.value {
                    recipient_id = Some(&user.id);
                }
            }
            "amount" => {
                if let ResolvedValue::Integer(amt) = &option.value {
                    amount = Some(*amt as u64);
                }
            }
            _ => {}
        }
    }

    let recipient_id = match recipient_id {
        Some(id) => id.to_string(),
        None => {
            return Err(SendTokenResult {
                message: ValidationError::MissingRecipient.to_string(),
                message_type: MessageType::Error,
            });
        }
    };

    let amount = match amount {
        Some(amt) => amt,
        None => {
            return Err(SendTokenResult {
                message: ValidationError::MissingAmount.to_string(),
                message_type: MessageType::Error,
            });
        }
    };

    Ok((user_id.to_string(), recipient_id, amount))
}

async fn execute_token_transfer(
    sender_wallet: String,
    recipient_wallet: String,
    amount: u64,
    recipient_id: &str,
    keypair: Arc<Keypair>,
    token_metadata: Arc<Option<TokenMetadata>>,
) -> SendTokenResult {
    let decimals = token_metadata
        .as_ref()
        .as_ref()
        .map(|m| m.decimals)
        .unwrap_or(9);

    let token_name = token_metadata
        .as_ref()
        .as_ref()
        .map(|m| m.name.as_str())
        .unwrap_or("tokens");

    match send_token_transaction(&sender_wallet, &recipient_wallet, amount, keypair, decimals).await
    {
        Ok(tx_hash) => SendTokenResult {
            message: format!(
                "Sent {} to <@{}>|{} {} https://solscan.io/tx/{}",
                token_name, recipient_id, amount, token_name, tx_hash
            ),
            message_type: MessageType::Success,
        },
        Err(e) => {
            let error_message = e.to_string();
            if error_message.contains("custom program error: 0x1") {
                SendTokenResult {
                    message: TransactionError::InsufficientFunds {
                        url: config().public_url.clone(),
                    }
                    .to_string(),
                    message_type: MessageType::Warning,
                }
            } else {
                SendTokenResult {
                    message: format!("Transaction failed: {}", e),
                    message_type: MessageType::Error,
                }
            }
        }
    }
}

pub async fn run(
    options: &[ResolvedOption<'_>],
    user_id: &UserId,
    keypair: Arc<Keypair>,
    token_metadata: Arc<Option<TokenMetadata>>,
) -> SendTokenResult {
    let (sender_id, recipient_id, amount) = match extract_command_params(options, user_id) {
        Ok(params) => params,
        Err(result) => return result,
    };

    let (sender_wallet, recipient_wallet) =
        match validate_addresses(&sender_id, &recipient_id, &keypair).await {
            Ok(wallets) => wallets,
            Err(e) => {
                return SendTokenResult {
                    message: e.to_string(),
                    message_type: MessageType::Warning,
                };
            }
        };

    match validate_delegation(&sender_wallet, &keypair).await {
        Ok(true) => {}
        Ok(false) => {
            return SendTokenResult {
                message: ValidationError::NoWalletsDelegated {
                    url: config().public_url.clone(),
                }
                .to_string(),
                message_type: MessageType::Warning,
            };
        }
        Err(e) => {
            return SendTokenResult {
                message: format!("Failed to fetch token accounts: {}", e),
                message_type: MessageType::Error,
            };
        }
    }

    execute_token_transfer(
        sender_wallet,
        recipient_wallet,
        amount,
        &recipient_id,
        keypair,
        token_metadata,
    )
    .await
}

pub fn register(token_metadata: Arc<Option<TokenMetadata>>) -> CreateCommand {
    let token_name = token_metadata
        .as_ref()
        .as_ref()
        .map(|m| m.name.as_str())
        .unwrap_or("tokens");

    let command_name = format!("send{}", token_name.to_lowercase());

    CreateCommand::new(&command_name)
        .description(format!("Send {}", token_name))
        .add_option(
            serenity::builder::CreateCommandOption::new(
                serenity::model::application::CommandOptionType::User,
                "recipient",
                format!("Who will you send {} to", token_name),
            )
            .required(true),
        )
        .add_option(
            serenity::builder::CreateCommandOption::new(
                serenity::model::application::CommandOptionType::Integer,
                "amount",
                format!("How much {} to send", token_name),
            )
            .required(true)
            .min_int_value(1),
        )
}
