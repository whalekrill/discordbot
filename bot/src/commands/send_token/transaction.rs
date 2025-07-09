use super::error::TransactionError;
use crate::config::config;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    hash::Hash,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use spl_token::instruction as token_instruction;
use std::str::FromStr;
use std::sync::Arc;

#[derive(Debug)]
pub struct TransactionParams {
    pub sender_pubkey: Pubkey,
    pub recipient_pubkey: Pubkey,
    pub mint_pubkey: Pubkey,
    pub token_amount: u64,
    pub decimals: u8,
}

impl TransactionParams {
    pub fn new(
        sender_wallet: &str,
        recipient_wallet: &str,
        mint_address: &str,
        amount: u64,
        decimals: u8,
    ) -> Result<Self, TransactionError> {
        let sender_pubkey =
            Pubkey::from_str(sender_wallet).map_err(|e| TransactionError::InvalidSender {
                message: e.to_string(),
            })?;
        let recipient_pubkey =
            Pubkey::from_str(recipient_wallet).map_err(|e| TransactionError::InvalidRecipient {
                message: e.to_string(),
            })?;
        let mint_pubkey =
            Pubkey::from_str(mint_address).map_err(|e| TransactionError::InvalidMint {
                message: e.to_string(),
            })?;

        let token_amount = amount * 10_u64.pow(decimals as u32);

        Ok(Self {
            sender_pubkey,
            recipient_pubkey,
            mint_pubkey,
            token_amount,
            decimals,
        })
    }
}

pub fn build_transfer_instructions(
    params: &TransactionParams,
    keypair: &Keypair,
    create_recipient_ata: bool,
) -> Result<Vec<Instruction>, TransactionError> {
    let sender_token_account = spl_associated_token_account::get_associated_token_address(
        &params.sender_pubkey,
        &params.mint_pubkey,
    );
    let recipient_token_account = spl_associated_token_account::get_associated_token_address(
        &params.recipient_pubkey,
        &params.mint_pubkey,
    );

    let mut instructions = vec![];

    if create_recipient_ata {
        let create_ata_instruction =
            spl_associated_token_account::instruction::create_associated_token_account(
                &keypair.pubkey(),
                &params.recipient_pubkey,
                &params.mint_pubkey,
                &spl_token::id(),
            );
        instructions.push(create_ata_instruction);
    }

    let transfer_instruction = token_instruction::transfer_checked(
        &spl_token::id(),
        &sender_token_account,
        &params.mint_pubkey,
        &recipient_token_account,
        &keypair.pubkey(),
        &[],
        params.token_amount,
        params.decimals,
    )
    .map_err(|e| TransactionError::CreationFailed {
        message: e.to_string(),
    })?;
    instructions.push(transfer_instruction);

    Ok(instructions)
}

pub fn build_signed_transaction(
    instructions: Vec<Instruction>,
    keypair: &Keypair,
    recent_blockhash: Hash,
) -> Transaction {
    Transaction::new_signed_with_payer(
        &instructions,
        Some(&keypair.pubkey()),
        &[keypair],
        recent_blockhash,
    )
}

pub async fn send_token_transaction(
    sender_wallet: &str,
    recipient_wallet: &str,
    amount: u64,
    keypair: Arc<Keypair>,
    decimals: u8,
) -> Result<String, TransactionError> {
    let params = TransactionParams::new(
        sender_wallet,
        recipient_wallet,
        &config().delegate_mint_address,
        amount,
        decimals,
    )?;

    let rpc_client =
        RpcClient::new_with_commitment(&config().helius_api_url, CommitmentConfig::confirmed());

    let recipient_token_account = spl_associated_token_account::get_associated_token_address(
        &params.recipient_pubkey,
        &params.mint_pubkey,
    );
    let account_exists = rpc_client.get_account(&recipient_token_account).is_ok();

    let instructions = build_transfer_instructions(&params, &keypair, !account_exists)?;

    let recent_blockhash =
        rpc_client
            .get_latest_blockhash()
            .map_err(|e| TransactionError::BlockhashFailed {
                message: e.to_string(),
            })?;

    let transaction = build_signed_transaction(instructions, &keypair, recent_blockhash);

    let signature = rpc_client
        .send_and_confirm_transaction(&transaction)
        .map_err(|e| TransactionError::TransactionFailed {
            message: e.to_string(),
        })?;

    Ok(signature.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::hash::Hash;

    #[test]
    fn test_transaction_params_new_success() {
        let sender = "11111111111111111111111111111112";
        let recipient = "11111111111111111111111111111113";
        let mint = "11111111111111111111111111111114";
        let amount = 100;
        let decimals = 9;

        let params = TransactionParams::new(sender, recipient, mint, amount, decimals);
        assert!(params.is_ok());

        let params = params.unwrap();
        assert_eq!(params.token_amount, 100_000_000_000); // 100 * 10^9
        assert_eq!(params.decimals, 9);
        assert_eq!(params.sender_pubkey.to_string(), sender);
        assert_eq!(params.recipient_pubkey.to_string(), recipient);
        assert_eq!(params.mint_pubkey.to_string(), mint);
    }

    #[test]
    fn test_transaction_params_invalid_sender() {
        let result = TransactionParams::new(
            "invalid_sender",
            "11111111111111111111111111111113",
            "11111111111111111111111111111114",
            100,
            9,
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid sender"));
    }

    #[test]
    fn test_transaction_params_invalid_recipient() {
        let result = TransactionParams::new(
            "11111111111111111111111111111112",
            "invalid_recipient",
            "11111111111111111111111111111114",
            100,
            9,
        );
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("Invalid recipient")
        );
    }

    #[test]
    fn test_transaction_params_invalid_mint() {
        let result = TransactionParams::new(
            "11111111111111111111111111111112",
            "11111111111111111111111111111113",
            "invalid_mint",
            100,
            9,
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid mint"));
    }

    #[test]
    fn test_token_amount_calculation() {
        let test_cases = vec![
            (100, 9, 100_000_000_000),
            (1, 6, 1_000_000),
            (50, 0, 50),
            (0, 9, 0),
        ];

        for (amount, decimals, expected) in test_cases {
            let params = TransactionParams::new(
                "11111111111111111111111111111112",
                "11111111111111111111111111111113",
                "11111111111111111111111111111114",
                amount,
                decimals,
            )
            .unwrap();
            assert_eq!(params.token_amount, expected);
        }
    }

    #[test]
    fn test_build_transfer_instructions_without_ata() {
        let params = TransactionParams::new(
            "11111111111111111111111111111112",
            "11111111111111111111111111111113",
            "11111111111111111111111111111114",
            100,
            9,
        )
        .unwrap();

        let keypair = Keypair::new();
        let instructions = build_transfer_instructions(&params, &keypair, false);

        assert!(instructions.is_ok());
        let instructions = instructions.unwrap();
        assert_eq!(instructions.len(), 1); // Only transfer instruction
    }

    #[test]
    fn test_build_transfer_instructions_with_ata() {
        let params = TransactionParams::new(
            "11111111111111111111111111111112",
            "11111111111111111111111111111113",
            "11111111111111111111111111111114",
            100,
            9,
        )
        .unwrap();

        let keypair = Keypair::new();
        let instructions = build_transfer_instructions(&params, &keypair, true);

        assert!(instructions.is_ok());
        let instructions = instructions.unwrap();
        assert_eq!(instructions.len(), 2); // Create ATA + transfer
    }

    #[test]
    fn test_build_signed_transaction() {
        let keypair = Keypair::new();
        let instructions = vec![];
        let recent_blockhash = Hash::default();

        let transaction = build_signed_transaction(instructions, &keypair, recent_blockhash);

        assert_eq!(transaction.message.recent_blockhash, recent_blockhash);
        assert_eq!(transaction.message.header.num_required_signatures, 1);
        assert!(transaction.signatures.len() > 0);
    }

    #[test]
    fn test_same_sender_recipient_allowed() {
        // The transaction builder doesn't prevent same sender/recipient
        // That validation happens in the address_validator function
        let same_address = "11111111111111111111111111111112";
        let params = TransactionParams::new(
            same_address,
            same_address,
            "11111111111111111111111111111114",
            100,
            9,
        );
        assert!(params.is_ok());
    }
}
