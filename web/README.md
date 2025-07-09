# Discord Bot

A web app to manage wallets and delegations.

## Messages Reference

This section documents all possible success, warning, and error messages that the web app displays.

### Message Types

The web app uses two message types with different visual styling, as well as some console logging:

- **Success**: Toast notifications
- **Error**: Toast notifications
- **Console Log**: Errors logged to the browser's developer console for debugging

### Success Messages

| Message                           | Trigger                                       | Display |
| --------------------------------- | --------------------------------------------- | ------- |
| `Wallet updated successfully`     | User successfully updates a wallet's settings | Toast   |
| `Wallet deleted successfully`     | User successfully deletes a wallet            | Toast   |
| `Wallet registered successfully`  | User successfully registers a new wallet      | Toast   |
| `Delegation successful`           | User successfully delegates a wallet          | Toast   |
| `Delegation revoked successfully` | User successfully revokes a wallet delegation | Toast   |

### Error Messages

| Message                              | Trigger                                                     | Display |
| ------------------------------------ | ----------------------------------------------------------- | ------- |
| `Discord login failed`               | User fails to log in with Discord                           | Toast   |
| `{error message}`                    | An error occured during wallet actions (update, delete)     | Toast   |
| `Unknown error occurred`             | An unknown error occured during a wallet action             | Toast   |
| `Please connect your wallet first`   | User attempts delegation/revoke without connecting a wallet | Toast   |
| `Delegation failed: {error message}` | An error occured during wallet delegation                   | Toast   |
| `Revoke failed: {error message}`     | An error occured during delegation revocation               | Toast   |
| `Failed to sign in with Discord`     | An error occured during Discord sign in                     | Toast   |
| `Failed to get token account`        | Failed to fetch token account details from the blockchain   | Toast   |

### Console Log Messages

| Message                                 | Trigger                                         | Display |
| --------------------------------------- | ----------------------------------------------- | ------- |
| `Delegation error: {error}`             | An error occured during wallet delegation       | Console |
| `Revoke error: {error}`                 | An error occured during delegation revocation   | Console |
| `Error checking token account: {error}` | An error occured while checking a token account | Console |
| `{error}`                               | Generic error from the Solana provider          | Console |
