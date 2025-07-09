use serde::Deserialize;

#[derive(Debug)]
pub enum MessageType {
    Success,
    Warning,
    Error,
}

#[derive(Debug)]
pub struct SendTokenResult {
    pub message: String,
    pub message_type: MessageType,
}

// API Response Types
#[derive(Deserialize, Debug)]
pub struct WalletResponse {
    pub sender: Vec<String>,
    pub recipient: Vec<String>,
}

#[derive(Deserialize, Debug)]
pub struct TokenAccountsResponse {
    pub result: TokenAccountsResult,
}

#[derive(Deserialize, Debug)]
pub struct TokenAccountsResult {
    pub value: Vec<TokenAccountData>,
}

#[derive(Deserialize, Debug)]
pub struct TokenAccountData {
    pub account: TokenAccount,
}

#[derive(Deserialize, Debug)]
pub struct TokenAccount {
    pub data: TokenAccountDataParsed,
}

#[derive(Deserialize, Debug)]
pub struct TokenAccountDataParsed {
    pub parsed: TokenAccountParsed,
}

#[derive(Deserialize, Debug)]
pub struct TokenAccountParsed {
    pub info: TokenAccountInfo,
}

#[derive(Deserialize, Debug)]
pub struct TokenAccountInfo {
    pub delegate: Option<String>,
    #[serde(rename = "delegatedAmount")]
    pub delegated_amount: Option<DelegatedAmount>,
}

#[derive(Deserialize, Debug)]
pub struct DelegatedAmount {
    #[serde(rename = "uiAmount")]
    pub ui_amount: Option<f64>,
}

#[derive(Deserialize, Debug)]
pub struct GetAssetResponse {
    pub result: GetAssetResult,
}

#[derive(Deserialize, Debug)]
pub struct GetAssetResult {
    pub content: AssetContent,
    pub token_info: TokenInfo,
}

#[derive(Deserialize, Debug)]
pub struct AssetContent {
    pub metadata: AssetMetadata,
}

#[derive(Deserialize, Debug)]
pub struct AssetMetadata {
    pub name: Option<String>,
    pub symbol: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct TokenInfo {
    pub decimals: Option<u64>,
}
