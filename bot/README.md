# Discord Bot

A Discord bot which can send tokens for users.

## Messages Reference

This section documents all possible success, warning, and error messages that the bot can return.

## Message Types

The bot uses three message types with different visual styling:

- **Success**: Normal public messages, may include ephemeral follow-ups
- **Warning**: Public messages (user configuration issues)
- **Error**: Private messages (system failures, validation errors)

### Success Messages (Green/Public)

| Message | Trigger | Display |
|---------|---------|---------|
| `Sent {token_name} to <@{recipient_id}>\|{amount} {token_name} https://solscan.io/tx/{tx_hash}` | Token transfer successfully completed and confirmed | Public message with ephemeral follow-up |

### Warning Messages (Orange/Public)

| Message | Trigger | Display |
|---------|---------|---------|
| `No wallets delegated. Please register and delegate a wallet at {public_url}` | Sender has no delegated wallets | Orange embed |
| `More than 1 wallet delegated. Please manage your wallets at {public_url}` | Sender has multiple delegated wallets | Orange embed |
| `No wallets registered. Please register a wallet at {public_url}` | Recipient has no registered wallets | Orange embed |
| `More than 1 wallet can receive tokens. Please manage your wallets at {public_url}` | Recipient has multiple wallets that can receive tokens | Orange embed |
| `Sender and recipient wallets are the same. Please manage your wallets at {public_url}` | User attempts to send tokens to same wallet | Orange embed |
| `Insufficient funds. Please ensure your wallet has sufficient funds, and update your delegation at {public_url}` | Token transfer amount exceeds delegation, or insufficient funds | Orange embed |

### Error Messages (Red/Private)

| Message | Trigger | Display |
|---------|---------|---------|
| `Missing recipient parameter` | Missing recipient parameter in command | Red embed ephemeral |
| `Missing amount parameter` | Missing amount parameter in command | Red embed ephemeral |
| `Failed to fetch token accounts: {error}` | RPC call failure during delegation validation | Red embed ephemeral |
| `Transaction failed: {error}` | Blockchain transaction failure | Red embed ephemeral |
| `Command not found!` | Unrecognized command received | Red embed ephemeral |
| Various API/system errors | System failures, invalid addresses, etc. | Red embed ephemeral |

## Architecture

The bot handles message routing in `src/main.rs` with proper Discord styling based on message type:

```rust
match result.message_type {
    MessageType::Error => /* Red embed ephemeral */,
    MessageType::Warning => /* Orange embed */,
    MessageType::Success => /* Public message or follow-up */,
}
```
